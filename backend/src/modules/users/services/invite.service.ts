import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invite, InviteDocument } from '../schemas/invite.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { CreateInviteDto, ValidateInviteDto, UseInviteDto, InviteResponseDto, ValidateInviteResponseDto, InviteListDto } from '../dto/invite.dto';
import { EmailService } from '../../notifications/services/email.service';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class InviteService {
  private readonly logger = new Logger(InviteService.name);

  constructor(
    @InjectModel(Invite.name) private inviteModel: Model<InviteDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private emailService: EmailService,
  ) {}

  async createInvite(createInviteDto: CreateInviteDto, invitedBy: string): Promise<InviteResponseDto> {
    const { email, message, expiresAt } = createInviteDto;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Check if there's already a pending invite for this email
    const existingInvite = await this.inviteModel.findOne({
      email,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    if (existingInvite) {
      throw new BadRequestException('A pending invite already exists for this email');
    }

    // Generate unique token
    const token = this.generateInviteToken();

    // Set expiry date (default 7 days from now)
    const expiryDate = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Create invite
    const invite = new this.inviteModel({
      token,
      email,
      invitedBy,
      expiresAt: expiryDate,
      message,
    });

    await invite.save();

    // Generate invite link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const inviteLink = `${frontendUrl}/signup?invite=${token}`;

    // Send email
    try {
      await this.sendInviteEmail(email, inviteLink, invitedBy, message);
      this.logger.log(`Invite email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send invite email to ${email}:`, error);
      // Don't throw error here, invite is still created
    }

    return {
      success: true,
      message: 'Invite sent successfully',
      invite: {
        token,
        email,
        expiresAt: expiryDate,
        inviteLink,
      },
    };
  }

  async validateInvite(validateInviteDto: ValidateInviteDto): Promise<ValidateInviteResponseDto> {
    const { token } = validateInviteDto;

    const invite = await this.inviteModel.findOne({ token });

    if (!invite) {
      return {
        success: true,
        valid: false,
        message: 'Invalid invite token',
      };
    }

    if (invite.status !== 'pending') {
      return {
        success: true,
        valid: false,
        message: 'Invite has already been used or cancelled',
      };
    }

    if (invite.expiresAt < new Date()) {
      // Mark as expired
      invite.status = 'expired';
      await invite.save();

      return {
        success: true,
        valid: false,
        message: 'Invite has expired',
      };
    }

    // Get inviter details
    const inviter = await this.userModel.findById(invite.invitedBy).select('firstName lastName email');

    return {
      success: true,
      valid: true,
      invite: {
        email: invite.email,
        invitedBy: inviter ? `${inviter.firstName} ${inviter.lastName}` : 'Unknown',
        expiresAt: invite.expiresAt,
        message: invite.message,
      },
    };
  }

  async useInvite(useInviteDto: UseInviteDto): Promise<{ success: boolean; message: string; user?: any }> {
    const { token, name, password } = useInviteDto;

    const invite = await this.inviteModel.findOne({ token });

    if (!invite) {
      throw new NotFoundException('Invalid invite token');
    }

    if (invite.status !== 'pending') {
      throw new BadRequestException('Invite has already been used or cancelled');
    }

    if (invite.expiresAt < new Date()) {
      invite.status = 'expired';
      await invite.save();
      throw new BadRequestException('Invite has expired');
    }

    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email: invite.email });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Create user
    const user = new this.userModel({
      firstName: name.split(' ')[0] || '',
      lastName: name.split(' ').slice(1).join(' ') || '',
      email: invite.email,
      password, // Will be hashed by the user schema
      isEmailVerified: true, // Auto-verify since they came through invite
    });

    await user.save();

    // Mark invite as used
    invite.status = 'used';
    invite.usedAt = new Date();
    invite.usedBy = user._id.toString();
    await invite.save();

    this.logger.log(`User ${user.email} signed up using invite from ${invite.invitedBy}`);

    return {
      success: true,
      message: 'Account created successfully',
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
      },
    };
  }

  async getInvites(invitedBy: string, page: number = 1, limit: number = 10): Promise<InviteListDto> {
    const skip = (page - 1) * limit;

    const [invites, total] = await Promise.all([
      this.inviteModel
        .find({ invitedBy })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('usedBy', 'name email')
        .lean(),
      this.inviteModel.countDocuments({ invitedBy }),
    ]);

    const statusCounts = await this.inviteModel.aggregate([
      { $match: { invitedBy } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const counts = {
      pending: 0,
      used: 0,
      expired: 0,
    };

    statusCounts.forEach(({ _id, count }) => {
      counts[_id] = count;
    });

    return {
      invites: invites.map(invite => ({
        id: invite._id.toString(),
        email: invite.email,
        invitedBy: invite.invitedBy.toString(),
        status: invite.status,
        createdAt: (invite as any).createdAt,
        expiresAt: invite.expiresAt,
        usedAt: invite.usedAt,
      })),
      total,
      ...counts,
    };
  }

  async resendInvite(inviteId: string, invitedBy: string): Promise<InviteResponseDto> {
    const invite = await this.inviteModel.findOne({ _id: inviteId, invitedBy });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.status !== 'pending') {
      throw new BadRequestException('Can only resend pending invites');
    }

    // Generate new token and extend expiry
    const newToken = this.generateInviteToken();
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    invite.token = newToken;
    invite.expiresAt = newExpiry;
    await invite.save();

    // Generate new invite link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const inviteLink = `${frontendUrl}/signup?invite=${newToken}`;

    // Send email
    try {
      await this.sendInviteEmail(invite.email, inviteLink, invitedBy, invite.message);
      this.logger.log(`Resent invite email to ${invite.email}`);
    } catch (error) {
      this.logger.error(`Failed to resend invite email to ${invite.email}:`, error);
    }

    return {
      success: true,
      message: 'Invite resent successfully',
      invite: {
        token: newToken,
        email: invite.email,
        expiresAt: newExpiry,
        inviteLink,
      },
    };
  }

  async cancelInvite(inviteId: string, invitedBy: string): Promise<{ success: boolean; message: string }> {
    const invite = await this.inviteModel.findOne({ _id: inviteId, invitedBy });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.status !== 'pending') {
      throw new BadRequestException('Can only cancel pending invites');
    }

    invite.status = 'cancelled';
    await invite.save();

    this.logger.log(`Cancelled invite for ${invite.email}`);

    return {
      success: true,
      message: 'Invite cancelled successfully',
    };
  }

  async cleanupExpiredInvites(): Promise<number> {
    const result = await this.inviteModel.updateMany(
      {
        status: 'pending',
        expiresAt: { $lt: new Date() },
      },
      {
        status: 'expired',
      }
    );

    this.logger.log(`Marked ${result.modifiedCount} invites as expired`);
    return result.modifiedCount;
  }

  private generateInviteToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private async sendInviteEmail(email: string, inviteLink: string, invitedBy: string, message?: string): Promise<void> {
    const inviter = await this.userModel.findById(invitedBy).select('firstName lastName email');
    const inviterName = inviter ? `${inviter.firstName} ${inviter.lastName}` : 'PolicyPal Team';

    // Simple email sending without template for now
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: 'You\'re invited to join PolicyPal!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #2563eb; color: white; padding: 20px; text-align: center;">
            <h1>PolicyPal</h1>
            <p>Smart Policy Management Platform</p>
          </div>
          <div style="padding: 20px; background: #f9fafb;">
            <h2>You're invited to join PolicyPal!</h2>
            <p>Hello,</p>
            <p><strong>${inviterName}</strong> has invited you to join PolicyPal, the smart policy management platform.</p>
            ${message ? `<div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0;"><strong>Personal Message:</strong><br>${message}</div>` : ''}
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" style="display: inline-block; background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Accept Invitation & Sign Up</a>
            </div>
            <p style="background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 10px; border-radius: 4px;">
              ⏰ This invitation link will expire in 7 days. Please accept the invitation soon to secure your account.
            </p>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #2563eb;">${inviteLink}</p>
          </div>
          <div style="padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p>This invitation was sent by ${inviterName} through PolicyPal.</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            <p>&copy; 2024 PolicyPal. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
  }
}
