import { Controller, Post, Body, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { MfaService } from '../../mfa/services/mfa.service';
import { MfaVerifyDto, MfaBackupCodeDto } from '../../mfa/dto/mfa-setup.dto';
// import { Throttle } from '@nestjs/throttler';
import { Public } from '../../../common/decorators/public.decorator';
import { UsersService } from '../../users/services/users.service';
import { AuthResponseDto } from '../dto/auth-response.dto';

@Controller('auth/mfa')
export class MfaVerificationController {
  constructor(
    private readonly authService: AuthService,
    private readonly mfaService: MfaService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  // @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  async verifyTotp(@Body() dto: MfaVerifyDto & { mfaToken: string }): Promise<AuthResponseDto> {
    if (!dto.mfaToken) {
      throw new BadRequestException('MFA token is required.');
    }

    // Verify the MFA token and get user info
    const userInfo = await this.authService.verifyMfaToken(dto.mfaToken);
    
    // Verify TOTP code
    const isValid = await this.mfaService.verifyTotp(userInfo.userId, dto);
    
    if (!isValid) {
      throw new BadRequestException('Invalid verification code.');
    }

    // Generate final JWT
    const accessToken = await this.authService.generateJwtToken(userInfo);
    const user = await this.usersService.findById(userInfo.userId);
    const expiresIn = (this as any).authService.getTokenExpirationTime?.() ?? 24 * 3600;

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: user ? {
        _id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      } : undefined as any,
    };
  }

  @Public()
  @Post('verify-backup')
  @HttpCode(HttpStatus.OK)
  // @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  async verifyBackupCode(@Body() dto: MfaBackupCodeDto & { mfaToken: string }): Promise<AuthResponseDto> {
    if (!dto.mfaToken) {
      throw new BadRequestException('MFA token is required.');
    }

    // Verify the MFA token and get user info
    const userInfo = await this.authService.verifyMfaToken(dto.mfaToken);
    
    // Verify backup code
    const isValid = await this.mfaService.verifyBackupCode(userInfo.userId, dto);
    
    if (!isValid) {
      throw new BadRequestException('Invalid backup code.');
    }

    // Generate final JWT
    const accessToken = await this.authService.generateJwtToken(userInfo);
    const user = await this.usersService.findById(userInfo.userId);
    const expiresIn = (this as any).authService.getTokenExpirationTime?.() ?? 24 * 3600;

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: user ? {
        _id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      } : undefined as any,
    };
  }
}
