import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Policy, PolicySchema } from './schemas/policy.schema';
import { ChatHistory, ChatHistorySchema } from './schemas/chat-history.schema';
import { PolicyComparison, PolicyComparisonSchema } from './schemas/policy-comparison.schema';
import { PoliciesController } from './controllers/policies.controller';
import { ChatHistoryController } from './controllers/chat-history.controller';
import { PolicyComparisonController } from './controllers/policy-comparison.controller';
import { PoliciesService } from './services/policies.service';
import { ChatHistoryService } from './services/chat-history.service';
import { PolicyComparisonService } from './services/policy-comparison.service';
import { PoliciesRepository } from './repositories/policies.repository';
import { AIModule } from '../ai/ai.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Policy.name, schema: PolicySchema },
      { name: ChatHistory.name, schema: ChatHistorySchema },
      { name: PolicyComparison.name, schema: PolicyComparisonSchema },
    ]),
    AIModule,
    NotificationsModule,
  ],
  controllers: [PoliciesController, ChatHistoryController, PolicyComparisonController],
  providers: [PoliciesService, ChatHistoryService, PolicyComparisonService, PoliciesRepository],
  exports: [PoliciesService, ChatHistoryService, PolicyComparisonService, PoliciesRepository],
})
export class PoliciesModule {}