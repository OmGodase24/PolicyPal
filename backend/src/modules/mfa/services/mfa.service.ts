import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { EncryptionService } from '../../../common/services/encryption.service';
import { MfaSetupDto, MfaVerifyDto, MfaBackupCodeDto, MfaDisableDto } from '../dto/mfa-setup.dto';

@Injectable()
export class MfaService {
  private readonly setupCache = new Map<string, { secret: string; expires: number }>();

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private encryptionService: EncryptionService,
  ) {}

  async generateSecret(userId: string, userEmail: string): Promise<{ qrDataUrl: string; manualEntryKey: string }> {
    const secret = speakeasy.generateSecret({
      name: `PolicyPal (${userEmail})`,
      issuer: 'PolicyPal',
      length: 32,
    });

    // Store in cache for 10 minutes
    this.setupCache.set(userId, {
      secret: secret.base32,
      expires: Date.now() + 10 * 60 * 1000,
    });

    const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url!);
    
    return {
      qrDataUrl,
      manualEntryKey: secret.base32!,
    };
  }

  async verifySetup(userId: string, dto: MfaSetupDto): Promise<{ backupCodes: string[] }> {
    const cached = this.setupCache.get(userId);
    const secretToVerify = (cached && Date.now() <= cached.expires)
      ? cached.secret
      : dto.tempSecret;

    if (!secretToVerify) {
      throw new BadRequestException('Setup session expired. Please start MFA setup again.');
    }

    const verified = speakeasy.totp.verify({
      secret: secretToVerify,
      encoding: 'base32',
      token: dto.code,
      window: 2,
    });

    if (!verified) {
      throw new BadRequestException('Invalid verification code.');
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    const backupCodesHash = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 12))
    );

    // Encrypt and save secret
    const encryptedSecret = this.encryptionService.encrypt(secretToVerify);

    await this.userModel.findByIdAndUpdate(userId, {
      'mfa.enabled': true,
      'mfa.secretEncrypted': encryptedSecret,
      'mfa.backupCodesHash': backupCodesHash,
      'mfa.fallback': false,
    });

    // Clean up cache
    this.setupCache.delete(userId);

    return { backupCodes };
  }

  async verifyTotp(userId: string, dto: MfaVerifyDto): Promise<boolean> {
    const user = await this.userModel.findById(userId);
    if (!user || !user.mfa.enabled || !user.mfa.secretEncrypted) {
      throw new UnauthorizedException('MFA not enabled for this user.');
    }

    const secret = this.encryptionService.decrypt(user.mfa.secretEncrypted);
    
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: dto.code,
      window: 2,
    });

    return verified;
  }

  async verifyBackupCode(userId: string, dto: MfaBackupCodeDto): Promise<boolean> {
    const user = await this.userModel.findById(userId);
    if (!user || !user.mfa.enabled || !user.mfa.backupCodesHash) {
      throw new UnauthorizedException('MFA not enabled for this user.');
    }

    for (const hashedCode of user.mfa.backupCodesHash) {
      if (await bcrypt.compare(dto.code, hashedCode)) {
        return true;
      }
    }

    return false;
  }

  async disableMfa(userId: string, dto: MfaDisableDto): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password.');
    }

    // Verify TOTP code
    if (!user.mfa.enabled || !user.mfa.secretEncrypted) {
      throw new BadRequestException('MFA is not enabled.');
    }

    const secret = this.encryptionService.decrypt(user.mfa.secretEncrypted);
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: dto.code,
      window: 2,
    });

    if (!verified) {
      throw new BadRequestException('Invalid verification code.');
    }

    // Disable MFA
    await this.userModel.findByIdAndUpdate(userId, {
      'mfa.enabled': false,
      'mfa.secretEncrypted': null,
      'mfa.backupCodesHash': null,
      'mfa.fallback': false,
    });
  }

  async regenerateBackupCodes(userId: string): Promise<{ backupCodes: string[] }> {
    const user = await this.userModel.findById(userId);
    if (!user || !user.mfa.enabled) {
      throw new BadRequestException('MFA is not enabled.');
    }

    const backupCodes = this.generateBackupCodes();
    const backupCodesHash = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 12))
    );

    await this.userModel.findByIdAndUpdate(userId, {
      'mfa.backupCodesHash': backupCodesHash,
    });

    return { backupCodes };
  }

  async isMfaEnabled(userId: string): Promise<boolean> {
    const user = await this.userModel.findById(userId);
    return user?.mfa?.enabled || false;
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    return codes;
  }
}
