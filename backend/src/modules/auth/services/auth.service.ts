import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UsersService } from '../../users/services/users.service';
import { EmailService } from '../../notifications/services/email.service';
import { AlternativeEmailService } from '../../notifications/services/alternative-email.service';
import { MfaService } from '../../mfa/services/mfa.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { AuthResponseDto, MfaRequiredResponseDto } from '../dto/auth-response.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { JwtPayload } from '../strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private alternativeEmailService: AlternativeEmailService,
    private mfaService: MfaService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Extract user data (excluding agreeToTerms)
    const { agreeToTerms, ...userData } = registerDto;

    // Create new user
    const user = await this.usersService.create({
      ...userData,
    });

    // Generate JWT token
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload);
    const expiresIn = this.getTokenExpirationTime();

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto | MfaRequiredResponseDto> {
    // Find user by email
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if MFA is enabled
    const isMfaEnabled = await this.mfaService.isMfaEnabled(user._id.toString());
    
    if (isMfaEnabled) {
      // Generate temporary MFA token (valid for 5 minutes)
      const mfaToken = this.generateMfaToken(user._id.toString(), user.email);
      return {
        mfaRequired: true,
        mfaToken,
      };
    }

    // Update last login
    await this.usersService.updateLastLogin(user._id.toString());

    // Generate JWT token
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload);
    const expiresIn = this.getTokenExpirationTime();

    // Transform user to response DTO
    const userResponse = {
      _id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: userResponse,
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  private getTokenExpirationTime(): number {
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '24h';
    
    // Convert to seconds
    if (expiresIn.endsWith('h')) {
      return parseInt(expiresIn.slice(0, -1)) * 3600;
    } else if (expiresIn.endsWith('d')) {
      return parseInt(expiresIn.slice(0, -1)) * 24 * 3600;
    } else if (expiresIn.endsWith('m')) {
      return parseInt(expiresIn.slice(0, -1)) * 60;
    }
    
    return 24 * 3600; // Default 24 hours
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    // Find user by email
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not for security
      return { message: 'If an account with that email exists, a password reset link has been sent.' };
    }

    // Check if user has exceeded password reset attempts (max 3 per day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (user.lastPasswordResetAt && user.lastPasswordResetAt >= today && user.passwordResetAttempts >= 3) {
      throw new BadRequestException('Too many password reset attempts. Please try again tomorrow.');
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now

    // Update user with reset token
    await this.usersService.update(user._id.toString(), {
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires,
      passwordResetAttempts: user.passwordResetAttempts + 1,
      lastPasswordResetAt: new Date(),
    });

    // Send reset email with fallback
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:4200');
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

    try {
      // Try alternative email service first (more reliable for Railway)
      const emailSent = await this.alternativeEmailService.sendPasswordResetEmail(
        user.email, 
        user.firstName, 
        resetUrl
      );
      
      if (!emailSent) {
        // Fallback to original email service
        await this.emailService.sendPasswordResetEmail(user.email, user.firstName, resetUrl);
      }
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      // Don't throw error here, user experience should not be affected
    }

    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, newPassword } = resetPasswordDto;

    // Find user by reset token
    const user = await this.usersService.findByPasswordResetToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token.');
    }

    // Check if token is expired
    if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
      throw new BadRequestException('Reset token has expired.');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password and clear reset token
    await this.usersService.update(user._id.toString(), {
      password: hashedPassword,
      passwordResetToken: undefined,
      passwordResetExpires: undefined,
      passwordResetAttempts: 0,
    });

    return { message: 'Password has been reset successfully.' };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    const { currentPassword, newPassword } = changePasswordDto;

    // Get user
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect.');
    }

    // Check if new password is different from current password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException('New password must be different from current password.');
    }

    // Check monthly reset limit (only 1 change per month from profile)
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    if (user.lastProfilePasswordChangeAt && user.lastProfilePasswordChangeAt > oneMonthAgo) {
      throw new BadRequestException('You can only change your password once per month from your profile. Please use the forgot password option instead.');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    await this.usersService.update(userId, {
      password: hashedPassword,
      lastProfilePasswordChangeAt: new Date(),
    });

    return { message: 'Password has been changed successfully.' };
  }

  // MFA Token methods
  private generateMfaToken(userId: string, email: string): string {
    // Do NOT set exp in payload; pass expiresIn to sign() to avoid conflicts
    const payload = {
      sub: userId,
      email,
      type: 'mfa',
    } as const;

    return this.jwtService.sign(payload, { expiresIn: '5m' });
  }

  async verifyMfaToken(token: string): Promise<{ userId: string; email: string }> {
    try {
      const payload = this.jwtService.verify(token);
      
      if (payload.type !== 'mfa') {
        throw new UnauthorizedException('Invalid token type');
      }
      
      return {
        userId: payload.sub,
        email: payload.email,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired MFA token');
    }
  }

  async generateJwtToken(userInfo: { userId: string; email: string }): Promise<string> {
    const payload: JwtPayload = {
      sub: userInfo.userId,
      email: userInfo.email,
    };
    
    return this.jwtService.sign(payload);
  }
}
