import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
// import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './controllers/auth.controller';
import { MfaVerificationController } from './controllers/mfa-verification.controller';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UsersModule } from '../users/users.module';
import { MfaModule } from '../mfa/mfa.module';
import { EmailService } from '../notifications/services/email.service';
import { AlternativeEmailService } from '../notifications/services/alternative-email.service';

@Module({
  imports: [
    UsersModule,
    MfaModule,
    PassportModule,
    // ThrottlerModule.forRoot([{
    //   ttl: 60000,
    //   limit: 10,
    // }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '24h',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, MfaVerificationController],
  providers: [
    AuthService,
    JwtStrategy,
    EmailService,
    AlternativeEmailService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
