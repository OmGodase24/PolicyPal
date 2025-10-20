import { Controller, Post, Body, UseGuards, Request, Get, Param, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ImageAnalysisService } from '../services/image-analysis.service';
import { CacheInterceptor } from '../../../common/interceptors/cache.interceptor';
import { Cache } from '../../../common/decorators/cache.decorator';

export interface ImageAnalysisRequest {
  images: string[]; // Base64 image data
  userId: string;
  policyId?: string;
  isEmergencyMode?: boolean;
}

export interface ImageAnalysisResponse {
  success: boolean;
  extractedText: string;
  isPolicyRelated: boolean;
  analysisResults: {
    policyNumber?: string;
    insuranceCompany?: string;
    coverageAmount?: string;
    effectiveDate?: string;
    expiryDate?: string;
    keyTerms: string[];
    suggestions: string[];
  };
  error?: string;
  validationMessage?: string;
}

@Controller('ai/image-analysis')
@UseGuards(JwtAuthGuard)
export class ImageAnalysisController {
  constructor(private readonly imageAnalysisService: ImageAnalysisService) {}

  @Post('analyze')
  async analyzePolicyImages(
    @Body() request: ImageAnalysisRequest,
    @Request() req: any
  ): Promise<ImageAnalysisResponse> {
    try {
      // Verify user access
      if (request.userId !== req.user.userId) {
        throw new Error('Unauthorized access');
      }

      const result = await this.imageAnalysisService.analyzePolicyImages(request);
      return result;
    } catch (error) {
      console.error('Image analysis error:', error);
      return {
        success: false,
        extractedText: '',
        isPolicyRelated: false,
        analysisResults: {
          keyTerms: [],
          suggestions: []
        },
        error: error.message || 'Image analysis failed'
      };
    }
  }

  @Get('history/:userId')
  @UseInterceptors(CacheInterceptor)
  @Cache({ ttl: 300 }) // Cache for 5 minutes
  async getAnalysisHistory(
    @Param('userId') userId: string,
    @Request() req: any
  ): Promise<any> {
    try {
      // Verify user access
      if (userId !== req.user.userId) {
        throw new Error('Unauthorized access');
      }

      return await this.imageAnalysisService.getAnalysisHistory(userId);
    } catch (error) {
      console.error('Analysis history error:', error);
      return {
        success: false,
        history: [],
        error: error.message || 'Failed to get analysis history'
      };
    }
  }

  @Get('patterns/:userId')
  @UseInterceptors(CacheInterceptor)
  @Cache({ ttl: 600 }) // Cache for 10 minutes
  async getAnalysisPatterns(
    @Param('userId') userId: string,
    @Request() req: any
  ): Promise<any> {
    try {
      // Verify user access
      if (userId !== req.user.userId) {
        throw new Error('Unauthorized access');
      }

      return await this.imageAnalysisService.getAnalysisPatterns(userId);
    } catch (error) {
      console.error('Analysis patterns error:', error);
      return {
        success: false,
        patterns: [],
        error: error.message || 'Failed to get analysis patterns'
      };
    }
  }
}
