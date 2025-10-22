import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { Invite, InviteSchema } from './schemas/invite.schema';
import { UserReward, UserRewardSchema } from './schemas/user-reward.schema';
import { Badge, BadgeSchema } from './schemas/badge.schema';
import { ActivityLog, ActivityLogSchema } from './schemas/activity-log.schema';
import { UsersController } from './controllers/users.controller';
import { InviteController, PublicInviteController } from './controllers/invite.controller';
import { RewardController } from './controllers/reward.controller';
import { UsersService } from './services/users.service';
import { InviteService } from './services/invite.service';
import { RewardService } from './services/reward.service';
import { UsersRepository } from './repositories/users.repository';
import { EmailService } from '../notifications/services/email.service';
import { AlternativeEmailService } from '../notifications/services/alternative-email.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Invite.name, schema: InviteSchema },
      { name: UserReward.name, schema: UserRewardSchema },
      { name: Badge.name, schema: BadgeSchema },
      { name: ActivityLog.name, schema: ActivityLogSchema },
    ]),
  ],
  controllers: [UsersController, InviteController, PublicInviteController, RewardController],
  providers: [UsersService, InviteService, RewardService, UsersRepository, EmailService, AlternativeEmailService],
  exports: [UsersService, InviteService, RewardService, UsersRepository],
})
export class UsersModule {}
