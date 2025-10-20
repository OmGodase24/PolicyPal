import { Controller, Post, Body, Get, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { MobilePDFAIService } from '../services/mobile-pdf-ai.service';
import { firstValueFrom } from 'rxjs';

export interface CameraToPDFRequest {
  imageData: string;
  userId: string;
  timestamp: string;
}

export interface CameraToPDFResponse {
  success: boolean;
  pdfData: string;
  extractedText: string;
  confidence: number;
  documentType: 'insurance' | 'policy' | 'contract' | 'other';
  analysisResults: {
    policyNumber?: string;
    insuranceCompany?: string;
    coverageAmount?: string;
    effectiveDate?: string;
    expiryDate?: string;
    keyTerms: string[];
    exclusions: string[];
    coverageDetails: string[];
  };
  suggestions: string[];
  error?: string;
}

export interface VoiceProfileRequest {
  userId: string;
  voiceData: string;
  timestamp: string;
}

export interface VoiceProfileResponse {
  success: boolean;
  voiceProfile?: {
    userId: string;
    voiceId: string;
    voiceData: string;
    isActive: boolean;
    createdAt: Date;
    lastUsed: Date;
  };
  error?: string;
}

export interface VoiceQARequest {
  question: string;
  policyId: string;
  userId: string;
  voiceData?: string;
  timestamp: string;
}

export interface VoiceQAResponse {
  success: boolean;
  answer: string;
  confidence: number;
  followUpQuestions: string[];
  relatedSections: Array<{
    section: string;
    relevance: number;
    excerpt: string;
  }>;
  error?: string;
}

@Controller('ai/mobile/pdf')
@UseGuards(JwtAuthGuard)
export class MobilePDFAIController {
  constructor(private readonly mobilePDFAIService: MobilePDFAIService) {}

  @Post('camera-to-pdf')
  async createPDFFromImage(
    @Body() request: CameraToPDFRequest,
    @Request() req: any
  ): Promise<CameraToPDFResponse> {
    try {
      const result = await this.mobilePDFAIService.createPDFFromImage(
        request.imageData,
        req.user.userId
      );
      return result;
    } catch (error) {
      return {
        success: false,
        pdfData: '',
        extractedText: '',
        confidence: 0,
        documentType: 'other',
        analysisResults: {
          keyTerms: [],
          exclusions: [],
          coverageDetails: []
        },
        suggestions: ['Failed to process image', 'Please try again'],
        error: error.message
      };
    }
  }

  @Post('analyze-pdf')
  async analyzePDFForUnderstanding(
    @Body() request: { pdfData: string; userId: string; timestamp: string },
    @Request() req: any
  ): Promise<{
    success: boolean;
    analysis: any;
    suggestions: string[];
    error?: string;
  }> {
    try {
      const result = await firstValueFrom(
        this.mobilePDFAIService.analyzePDFForUnderstanding(
          request.pdfData,
          req.user.userId
        )
      );

      return {
        success: result?.success || false,
        analysis: result?.analysis || null,
        suggestions: result?.suggestions || [],
        error: result?.error
      };
    } catch (error) {
      return {
        success: false,
        analysis: null,
        suggestions: ['Failed to analyze PDF', 'Please try again'],
        error: error.message
      };
    }
  }

  @Post('voice-profile')
  async createVoiceProfile(
    @Body() request: VoiceProfileRequest,
    @Request() req: any
  ): Promise<VoiceProfileResponse> {
    try {
      const result = await this.mobilePDFAIService.createVoiceProfile(
        req.user.userId,
        request.voiceData
      );
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get('voice-profile/:userId')
  async getVoiceProfile(
    @Param('userId') userId: string,
    @Request() req: any
  ): Promise<{
    success: boolean;
    voiceProfile?: any;
    error?: string;
  }> {
    try {
      const voiceProfile = await this.mobilePDFAIService.getVoiceProfile(userId);
      return {
        success: true,
        voiceProfile: voiceProfile || null
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Delete('voice-profile/:userId')
  async deleteVoiceProfile(
    @Param('userId') userId: string,
    @Request() req: any
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const success = await this.mobilePDFAIService.deleteVoiceProfile(userId);
      return {
        success,
        error: success ? undefined : 'Failed to delete voice profile'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Post('voice-qa')
  async askQuestionWithVoice(
    @Body() request: VoiceQARequest,
    @Request() req: any
  ): Promise<VoiceQAResponse> {
    try {
      const result = await firstValueFrom(
        this.mobilePDFAIService.askQuestionWithVoice(
          request.question,
          request.policyId,
          req.user.userId,
          request.voiceData
        )
      );

      return {
        success: result?.success || false,
        answer: result?.answer || 'I apologize, but I could not process your question.',
        confidence: result?.confidence || 0,
        followUpQuestions: result?.followUpQuestions || [],
        relatedSections: result?.relatedSections || [],
        error: result?.error
      };
    } catch (error) {
      return {
        success: false,
        answer: 'I apologize, but I encountered an error processing your question.',
        confidence: 0,
        followUpQuestions: [],
        relatedSections: [],
        error: error.message
      };
    }
  }

  @Post('compare-policies')
  async comparePoliciesWithVoice(
    @Body() request: {
      policy1Id: string;
      policy2Id: string;
      userId: string;
      comparisonType: 'coverage' | 'cost' | 'terms' | 'comprehensive';
      timestamp: string;
    },
    @Request() req: any
  ): Promise<{
    success: boolean;
    comparison: any;
    error?: string;
  }> {
    try {
      const result = await firstValueFrom(
        this.mobilePDFAIService.comparePoliciesWithVoice(
          request.policy1Id,
          request.policy2Id,
          req.user.userId,
          request.comparisonType
        )
      );

      return {
        success: result?.success || false,
        comparison: result?.comparison || null,
        error: result?.error
      };
    } catch (error) {
      return {
        success: false,
        comparison: null,
        error: error.message
      };
    }
  }

  @Post('policy-insights')
  async getPolicyInsights(
    @Body() request: { policyId: string; userId: string; timestamp: string },
    @Request() req: any
  ): Promise<{
    success: boolean;
    insights: any;
    error?: string;
  }> {
    try {
      const result = await firstValueFrom(
        this.mobilePDFAIService.getPolicyInsights(
          request.policyId,
          req.user.userId
        )
      );

      return {
        success: result?.success || false,
        insights: result?.insights || null,
        error: result?.error
      };
    } catch (error) {
      return {
        success: false,
        insights: null,
        error: error.message
      };
    }
  }
}
