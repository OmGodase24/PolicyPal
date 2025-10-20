import { Controller, Post, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { MfaService } from '../services/mfa.service';
import { MfaSetupDto, MfaVerifyDto, MfaBackupCodeDto, MfaDisableDto } from '../dto/mfa-setup.dto';
// import { Throttle } from '@nestjs/throttler';

@Controller('mfa')
@UseGuards(JwtAuthGuard)
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  @Post('setup')
  async setup(@Request() req) {
    const { qrDataUrl, manualEntryKey } = await this.mfaService.generateSecret(
      req.user.userId,
      req.user.email
    );
    
    return {
      success: true,
      qrDataUrl,
      manualEntryKey,
    };
  }

  @Post('verify-setup')
  @HttpCode(HttpStatus.OK)
  async verifySetup(@Request() req, @Body() dto: MfaSetupDto) {
    const { backupCodes } = await this.mfaService.verifySetup(req.user.userId, dto);
    
    return {
      success: true,
      backupCodes,
      message: 'MFA has been successfully enabled. Please save your backup codes in a secure location.',
    };
  }

  @Post('disable')
  @HttpCode(HttpStatus.OK)
  async disable(@Request() req, @Body() dto: MfaDisableDto) {
    await this.mfaService.disableMfa(req.user.userId, dto);
    
    return {
      success: true,
      message: 'MFA has been successfully disabled.',
    };
  }

  @Post('backup-codes/regenerate')
  @HttpCode(HttpStatus.OK)
  async regenerateBackupCodes(@Request() req) {
    const { backupCodes } = await this.mfaService.regenerateBackupCodes(req.user.userId);
    
    return {
      success: true,
      backupCodes,
      message: 'Backup codes have been regenerated. Please save them in a secure location.',
    };
  }

  @Post('status')
  @HttpCode(HttpStatus.OK)
  async getStatus(@Request() req) {
    const isEnabled = await this.mfaService.isMfaEnabled(req.user.userId);
    
    return {
      success: true,
      enabled: isEnabled,
    };
  }
}
