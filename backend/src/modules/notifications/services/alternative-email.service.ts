import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AlternativeEmailService {
  private readonly logger = new Logger(AlternativeEmailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendEmailWithRetry(
    to: string,
    subject: string,
    html: string,
    maxRetries: number = 3
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`📧 Attempt ${attempt}/${maxRetries} - Sending email to ${to}`);
        
        const transporter = this.createTransporter();
        const result = await this.sendWithTimeout(transporter, to, subject, html);
        
        this.logger.log(`✅ Email sent successfully to ${to} on attempt ${attempt}`);
        return true;
        
      } catch (error) {
        this.logger.error(`❌ Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt === maxRetries) {
          this.logger.error(`❌ All ${maxRetries} attempts failed for ${to}`);
          return false;
        }
        
        // Wait before retry (exponential backoff)
        const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        this.logger.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await this.sleep(waitTime);
      }
    }
    
    return false;
  }

  private createTransporter(): nodemailer.Transporter {
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');
    
    if (!smtpUser || !smtpPass) {
      throw new Error('SMTP credentials not configured');
    }

    // Try different SMTP configurations
    const configs = [
      // Configuration 1: Gmail with minimal settings
      {
        service: 'gmail',
        auth: { user: smtpUser, pass: smtpPass },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 5000,
        greetingTimeout: 3000,
        socketTimeout: 5000,
      },
      // Configuration 2: Gmail with different port
      {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: smtpUser, pass: smtpPass },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 5000,
        greetingTimeout: 3000,
        socketTimeout: 5000,
      },
      // Configuration 3: Gmail with port 587
      {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: { user: smtpUser, pass: smtpPass },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 5000,
        greetingTimeout: 3000,
        socketTimeout: 5000,
      }
    ];

    // Try the first configuration
    return nodemailer.createTransport(configs[0]);
  }

  private async sendWithTimeout(
    transporter: nodemailer.Transporter,
    to: string,
    subject: string,
    html: string
  ): Promise<any> {
    const timeout = 15000; // 15 seconds timeout
    
    const mailOptions = {
      from: this.configService.get<string>('SMTP_FROM', 'PolicyPal <noreply@policypal.com>'),
      to,
      subject,
      html,
    };

    return Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email send timeout')), timeout)
      )
    ]);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async sendInviteEmail(
    email: string,
    inviteLink: string,
    inviterName: string,
    message?: string
  ): Promise<boolean> {
    const subject = 'You\'re invited to join PolicyPal!';
    const html = `
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
    `;

    return this.sendEmailWithRetry(email, subject, html);
  }

  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetUrl: string
  ): Promise<boolean> {
    const subject = 'Reset Your PolicyPal Password';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 700;">🔐 Reset Your Password</h1>
          </div>
          <div style="padding: 40px 30px;">
            <div style="font-size: 18px; margin-bottom: 20px; color: #1f2937;">Hi ${firstName},</div>
            <div style="font-size: 16px; margin-bottom: 30px; color: #4b5563;">
              We received a request to reset your PolicyPal account password. If you didn't make this request, you can safely ignore this email.
            </div>
            <div style="text-align: center;">
              <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; margin: 20px 0;">Reset My Password</a>
            </div>
            <div style="font-size: 16px; margin-bottom: 30px; color: #4b5563;">
              If the button above doesn't work, you can copy and paste this link into your browser:<br><br>
              <a href="${resetUrl}" style="color: #3b82f6; word-break: break-all;">${resetUrl}</a>
            </div>
          </div>
          <div style="background: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">This email was sent by PolicyPal. If you have any questions, contact us at support@policypal.com</p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmailWithRetry(email, subject, html);
  }
}
