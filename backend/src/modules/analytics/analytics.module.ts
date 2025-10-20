import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './controllers/analytics.controller';
import { AnalyticsService } from './services/analytics.service';
import { Policy, PolicySchema } from '../policies/schemas/policy.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Notification, NotificationSchema } from '../notifications/schemas/notification.schema';
import { ChatHistory, ChatHistorySchema } from '../policies/schemas/chat-history.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Policy.name, schema: PolicySchema },
      { name: User.name, schema: UserSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: ChatHistory.name, schema: ChatHistorySchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
