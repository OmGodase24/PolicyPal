import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Cache } from '../../../common/decorators/cache.decorator';
import { CacheInterceptor } from '../../../common/interceptors/cache.interceptor';

import { AIService } from '../services/ai.service';
import { QuestionDto, UploadPolicyDto } from '../dto/ai.dto';
import { SummaryLevel, SummaryLevelRequest } from '../dto/summary-level.dto';

@ApiTags('AI Policy Q&A')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Post('upload-policy')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a policy document for AI processing' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Policy uploaded and processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or processing error' })
  async uploadPolicy(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadPolicyDto,
    @CurrentUser() user: any,
  ): Promise<any> {
    try {
      const result = await this.aiService.uploadPolicyDocument(
        file,
        user.userId,
        uploadDto.policyId,
      );

      return {
        success: true,
        data: result,
        message: 'Policy uploaded and processed successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to upload policy: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('ask-question')
  @ApiOperation({ summary: 'Ask a question about uploaded policies' })
  @ApiResponse({ status: 200, description: 'Question answered successfully' })
  @ApiResponse({ status: 404, description: 'No relevant policy information found' })
  async askQuestion(@Body() questionDto: QuestionDto, @CurrentUser() user: any): Promise<any> {
    try {
      const answer = await this.aiService.askQuestion(
        questionDto.question,
        user.userId,
        questionDto.policyId,
        questionDto.sessionId,
        (questionDto as any).history,
        questionDto.images,
      );

      return {
        success: true,
        data: answer,
        message: 'Question processed successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to process question: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('assistant/published-policies')
  @UseInterceptors(CacheInterceptor)
  @Cache({ ttl: 300 }) // Cache for 5 minutes
  @ApiOperation({ summary: 'Get all published policies for AI Assistant' })
  @ApiResponse({ status: 200, description: 'Published policies retrieved successfully' })
  async getPublishedPolicies(@CurrentUser() user: any): Promise<any> {
    try {
      const policies = await this.aiService.getPublishedPolicies(user.userId);
      return {
        success: true,
        data: policies,
        message: 'Published policies retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get published policies: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('assistant/start-chat')
  @ApiOperation({ summary: 'Start a new AI chat session for a specific policy' })
  @ApiResponse({ status: 200, description: 'Chat session started successfully' })
  async startChatSession(
    @Body() body: { policyId: string },
    @CurrentUser() user: any,
  ): Promise<any> {
    try {
      const session = await this.aiService.startChatSession(user.userId, body.policyId);
      return {
        success: true,
        data: session,
        message: 'Chat session started successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to start chat session: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('assistant/policy/:policyId/summary')
  @UseInterceptors(CacheInterceptor)
  @Cache({ ttl: 600 }) // Cache for 10 minutes (AI summaries change less frequently)
  @ApiOperation({ summary: 'Get AI-generated summary for a specific policy' })
  @ApiResponse({ status: 200, description: 'Policy summary retrieved successfully' })
  async getPolicySummary(
    @Param('policyId') policyId: string,
    @CurrentUser() user: any,
  ): Promise<any> {
    try {
      const summary = await this.aiService.getPolicySummary(user.userId, policyId);
      return {
        success: true,
        data: summary,
        message: 'Policy summary retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get policy summary: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('summarize-policy')
  @ApiOperation({ summary: 'Generate AI summary for a policy document' })
  @ApiResponse({ status: 200, description: 'Policy summarized successfully' })
  async summarizePolicy(@Body() body: { policyId: string }, @CurrentUser() user: any): Promise<any> {
    try {
      const summary = await this.aiService.summarizePolicy(body.policyId, user.userId);
      return {
        success: true,
        data: summary,
        message: 'Policy summarized successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to summarize policy: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('compare-policies')
  @ApiOperation({ summary: 'Compare multiple policies side by side' })
  @ApiResponse({ status: 200, description: 'Policies compared successfully' })
  async comparePolicies(
    @Body() body: { policyIds: string[] },
    @CurrentUser() user: any,
  ): Promise<any> {
    try {
      const comparison = await this.aiService.comparePolicies(body.policyIds, user.userId);
      return {
        success: true,
        data: comparison,
        message: 'Policies compared successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to compare policies: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('policies')
  @UseInterceptors(CacheInterceptor)
  @Cache({ ttl: 300 }) // Cache for 5 minutes
  @ApiOperation({ summary: 'Get all processed policies for a user' })
  @ApiResponse({ status: 200, description: 'User policies retrieved successfully' })
  async getUserPolicies(@CurrentUser() user: any): Promise<any> {
    try {
      const policies = await this.aiService.getUserPolicies(user.userId);
      return {
        success: true,
        data: policies,
        message: 'User policies retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get user policies: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('policies/:documentId')
  @ApiOperation({ summary: 'Get a specific processed policy document' })
  @ApiResponse({ status: 200, description: 'Policy document retrieved successfully' })
  async getPolicyDocument(@Param('documentId') documentId: string, @CurrentUser() user: any): Promise<any> {
    try {
      const document = await this.aiService.getPolicyDocument(documentId, user.userId);
      return {
        success: true,
        data: document,
        message: 'Policy document retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get policy document: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('policies/:documentId')
  @ApiOperation({ summary: 'Delete a processed policy document' })
  @ApiResponse({ status: 200, description: 'Policy document deleted successfully' })
  async deletePolicyDocument(@Param('documentId') documentId: string, @CurrentUser() user: any): Promise<any> {
    try {
      await this.aiService.deletePolicyDocument(documentId, user.userId);
      return {
        success: true,
        message: 'Policy document deleted successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to delete policy document: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get AI service statistics for a user' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@CurrentUser() user: any): Promise<any> {
    try {
      const stats = await this.aiService.getStats(user.userId);
      return {
        success: true,
        data: stats,
        message: 'Statistics retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get statistics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('process-existing-policy/:policyId')
  @ApiOperation({ summary: 'Manually process an existing policy PDF with AI service' })
  @ApiResponse({ status: 200, description: 'Policy processed successfully' })
  async processExistingPolicy(
    @Param('policyId') policyId: string,
    @CurrentUser() user: any,
  ): Promise<any> {
    try {
      const result = await this.aiService.processExistingPolicy(user.userId, policyId);
      return {
        success: true,
        data: result,
        message: 'Policy processed successfully with AI service',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to process policy: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('process-all-existing-policies')
  @ApiOperation({ summary: 'Process all existing policies with PDFs that haven\'t been processed by AI service' })
  @ApiResponse({ status: 200, description: 'Policies processed successfully' })
  async processAllExistingPolicies(@CurrentUser() user: any): Promise<any> {
    try {
      const result = await this.aiService.processAllExistingPolicies(user.userId);
      return {
        success: true,
        data: result,
        message: 'All existing policies processed successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to process policies: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('clear-summary/:policyId')
  async clearPolicySummary(
    @Param('policyId') policyId: string,
    @CurrentUser() user: any
  ): Promise<any> {
    try {
      // Clear the old summary
      await this.aiService.clearPolicySummary(policyId, user.userId);
      return { message: 'AI summary cleared successfully' };
    } catch (error) {
      throw new HttpException(
        `Failed to clear AI summary: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // New endpoints for multi-level summaries
  @Get('policy/:policyId/summary/:level')
  @UseInterceptors(CacheInterceptor)
  @Cache({ ttl: 600 }) // Cache for 10 minutes (AI summaries change less frequently)
  @ApiOperation({ summary: 'Get AI summary for a policy at specific level (brief, standard, detailed)' })
  @ApiResponse({ status: 200, description: 'Policy summary retrieved successfully' })
  async getPolicySummaryByLevel(
    @Param('policyId') policyId: string,
    @Param('level') level: SummaryLevel,
    @CurrentUser() user: any,
  ): Promise<any> {
    try {
      const summary = await this.aiService.getPolicySummaryByLevel(user.userId, policyId, level);
      return {
        success: true,
        data: summary,
        message: `${level} summary retrieved successfully`,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get ${level} summary: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('policy/:policyId/summary-info')
  @UseInterceptors(CacheInterceptor)
  @Cache({ ttl: 300 }) // Cache for 5 minutes
  @ApiOperation({ summary: 'Get summary information for all levels of a policy' })
  @ApiResponse({ status: 200, description: 'Summary info retrieved successfully' })
  async getPolicySummaryInfo(
    @Param('policyId') policyId: string,
    @CurrentUser() user: any,
  ): Promise<any> {
    try {
      const summaryInfo = await this.aiService.getPolicySummaryInfo(user.userId, policyId);
      return {
        success: true,
        data: summaryInfo,
        message: 'Summary info retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get summary info: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('policy/:policyId/regenerate-summary')
  @ApiOperation({ summary: 'Regenerate AI summary for a policy at specific level' })
  @ApiResponse({ status: 200, description: 'Summary regenerated successfully' })
  async regeneratePolicySummary(
    @Param('policyId') policyId: string,
    @Body() body: SummaryLevelRequest,
    @CurrentUser() user: any,
  ): Promise<any> {
    try {
      // Invalidate cache first to force regeneration
      await this.aiService.invalidatePolicySummaryCache(user.userId, policyId, body.level);
      
      const summary = await this.aiService.getPolicySummaryByLevel(user.userId, policyId, body.level);
      return {
        success: true,
        data: summary,
        message: `${body.level} summary regenerated successfully`,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to regenerate ${body.level} summary: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Compliance Checking Endpoints
  @Post('compliance/check')
  @ApiOperation({ summary: 'Check policy compliance against specified regulation framework' })
  @ApiResponse({ status: 200, description: 'Compliance check completed successfully' })
  async checkCompliance(
    @Body() body: { policy_id: string; regulation_framework?: string },
    @CurrentUser() user: any,
  ): Promise<any> {
    try {
      const result = await this.aiService.checkCompliance(
        body.policy_id,
        user.userId,
        body.regulation_framework || 'insurance_standards'
      );
      return {
        success: true,
        data: result,
        message: 'Compliance check completed successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to check compliance: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('compliance/regulations')
  @ApiOperation({ summary: 'Get available regulation frameworks for compliance checking' })
  @ApiResponse({ status: 200, description: 'Available regulations retrieved successfully' })
  async getAvailableRegulations(): Promise<any> {
    try {
      const regulations = await this.aiService.getAvailableRegulations();
      return {
        success: true,
        data: regulations,
        message: 'Available regulations retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get regulations: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('compliance/check-file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Check compliance directly from uploaded file' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Compliance check from file completed successfully' })
  async checkComplianceFromFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { policy_id: string; regulation_framework?: string },
    @CurrentUser() user: any,
  ): Promise<any> {
    try {
      const result = await this.aiService.checkComplianceFromFile(
        file,
        body.policy_id,
        user.userId,
        body.regulation_framework || 'insurance_standards'
      );
      return {
        success: true,
        data: result,
        message: 'Compliance check from file completed successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to check compliance from file: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('compliance/refresh')
  @ApiOperation({ summary: 'Force refresh compliance report using AI analysis (bypasses cache)' })
  @ApiResponse({ status: 200, description: 'Compliance report refreshed successfully' })
  async refreshCompliance(
    @Body() body: { policy_id: string; regulation_framework?: string },
    @CurrentUser() user: any,
  ): Promise<any> {
    try {
      const result = await this.aiService.refreshCompliance(
        body.policy_id,
        user.userId,
        body.regulation_framework || 'insurance_standards'
      );
      return {
        success: true,
        data: result,
        message: 'Compliance report refreshed successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to refresh compliance: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('compliance/history/:policyId')
  @ApiOperation({ summary: 'Get compliance report history for a policy' })
  @ApiResponse({ status: 200, description: 'Compliance history retrieved successfully' })
  async getComplianceHistory(
    @Param('policyId') policyId: string,
    @CurrentUser() user: any,
  ): Promise<any> {
    try {
      const history = await this.aiService.getComplianceHistory(policyId, user.userId);
      return {
        success: true,
        data: history,
        message: 'Compliance history retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get compliance history: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Language Detection and Translation Endpoints
  @Post('detect-language')
  @ApiOperation({ summary: 'Detect the language of the given text' })
  @ApiResponse({ status: 200, description: 'Language detected successfully' })
  async detectLanguage(@Body() body: { text: string }): Promise<any> {
    try {
      const result = await this.aiService.detectLanguage(body.text);
      return {
        success: true,
        data: result,
        message: 'Language detected successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to detect language: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('translate')
  @ApiOperation({ summary: 'Translate text to target language' })
  @ApiResponse({ status: 200, description: 'Text translated successfully' })
  async translateText(
    @Body() body: { text: string; target_language: string; source_language?: string }
  ): Promise<any> {
    try {
      const result = await this.aiService.translateText(
        body.text,
        body.target_language,
        body.source_language || 'auto'
      );
      return {
        success: true,
        data: result,
        message: 'Text translated successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to translate text: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('supported-languages')
  @ApiOperation({ summary: 'Get list of supported languages for translation' })
  @ApiResponse({ status: 200, description: 'Supported languages retrieved successfully' })
  async getSupportedLanguages(): Promise<any> {
    try {
      const result = await this.aiService.getSupportedLanguages();
      return {
        success: true,
        data: result,
        message: 'Supported languages retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get supported languages: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}