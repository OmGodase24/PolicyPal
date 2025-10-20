import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MulterModule } from '@nestjs/platform-express';

import { AIController } from './controllers/ai.controller';
import { DLPController } from './controllers/dlp.controller';
import { PrivacyController } from './controllers/privacy.controller';
import { MobileAIController } from './controllers/mobile-ai.controller';
import { MobilePDFAIController } from './controllers/mobile-pdf-ai.controller';
import { ImageAnalysisController } from './controllers/image-analysis.controller';
import { AIService } from './services/ai.service';
import { DLPService } from './services/dlp.service';
import { PrivacyService } from './services/privacy.service';
import { MobileAIService } from './services/mobile-ai.service';
import { MobilePDFAIService } from './services/mobile-pdf-ai.service';
import { ImageAnalysisService } from './services/image-analysis.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Policy, PolicySchema } from '../policies/schemas/policy.schema';
import { ChatHistory, ChatHistorySchema } from '../policies/schemas/chat-history.schema';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000, // 30 seconds timeout for better performance
      maxRedirects: 3,
      // Note: retryAttempts and retryDelay are handled by the HTTP client internally
      // These properties are not part of HttpModuleOptions
    }),
    MulterModule.register({
      storage: require('multer').memoryStorage(), // Use memory storage for better compatibility
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
    MongooseModule.forFeature([
      { name: Policy.name, schema: PolicySchema },
      { name: ChatHistory.name, schema: ChatHistorySchema },
    ]),
  ],
  controllers: [AIController, DLPController, PrivacyController, MobileAIController, MobilePDFAIController, ImageAnalysisController],
  providers: [AIService, DLPService, PrivacyService, MobileAIService, MobilePDFAIService, ImageAnalysisService],
  exports: [AIService, DLPService, PrivacyService, MobileAIService, MobilePDFAIService, ImageAnalysisService],
})
export class AIModule {}