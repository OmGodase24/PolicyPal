import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MfaController } from './controllers/mfa.controller';
import { MfaService } from './services/mfa.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [MfaController],
  providers: [MfaService, EncryptionService],
  exports: [MfaService, EncryptionService],
})
export class MfaModule {}
