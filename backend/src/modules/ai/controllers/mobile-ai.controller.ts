import { Controller, Post, Body, Get, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { MobileAIService } from '../services/mobile-ai.service';

export interface VoiceCommandRequest {
  transcript: string;
  confidence: number;
  timestamp: string;
}

export interface VoiceCommandResponse {
  success: boolean;
  command: {
    type: 'create_policy' | 'edit_policy' | 'search_policy' | 'ai_chat' | 'scan_document';
    content: string;
    confidence: number;
    timestamp: Date;
  };
  suggestions?: string[];
  error?: string;
}

export interface VoicePolicyRequest {
  voiceContent: string;
  timestamp: string;
}

export interface VoicePolicyResponse {
  success: boolean;
  policyDraft: {
    title: string;
    description: string;
    content: string;
    category: string;
    confidence: number;
    suggestions: string[];
  };
  error?: string;
}

export interface CameraScanRequest {
  imageData: string;
  timestamp: string;
}

export interface CameraScanResponse {
  success: boolean;
  text: string;
  confidence: number;
  documentType: 'policy' | 'contract' | 'form' | 'other';
  extractedData: {
    title?: string;
    policyNumber?: string;
    dates?: string[];
    amounts?: string[];
    parties?: string[];
  };
  suggestions: string[];
  error?: string;
}

export interface GestureAnalysisRequest {
  gestureType: string;
  direction?: string;
  context: string;
  timestamp: string;
}

export interface GestureAnalysisResponse {
  success: boolean;
  action: string;
  confidence: number;
  data?: any;
  suggestions?: string[];
  error?: string;
}

@Controller('ai/mobile')
@UseGuards(JwtAuthGuard)
export class MobileAIController {
  constructor(private readonly mobileAIService: MobileAIService) {}

  @Post('voice/process-command')
  async processVoiceCommand(
    @Body() request: VoiceCommandRequest,
    @Request() req: any
  ): Promise<VoiceCommandResponse> {
    try {
      const result = await this.mobileAIService.processVoiceCommand(
        request.transcript,
        request.confidence,
        req.user.userId
      );
      return result;
    } catch (error) {
      return {
        success: false,
        command: {
          type: 'ai_chat',
          content: request.transcript,
          confidence: request.confidence,
          timestamp: new Date()
        },
        error: error.message
      };
    }
  }

  @Post('voice/create-policy')
  async createPolicyFromVoice(
    @Body() request: VoicePolicyRequest,
    @Request() req: any
  ): Promise<VoicePolicyResponse> {
    try {
      const result = await this.mobileAIService.createPolicyFromVoice(
        request.voiceContent,
        req.user.userId
      );
      return result;
    } catch (error) {
      return {
        success: false,
        policyDraft: {
          title: 'Voice Policy',
          description: 'Policy created from voice input',
          content: request.voiceContent,
          category: 'General',
          confidence: 0.5,
          suggestions: ['Add more details', 'Specify terms and conditions']
        },
        error: error.message
      };
    }
  }

  @Post('voice/suggestions')
  async getVoiceSuggestions(
    @Body() request: { context: string; timestamp: string },
    @Request() req: any
  ): Promise<{ success: boolean; suggestions: string[]; error?: string }> {
    try {
      const suggestions = await this.mobileAIService.getVoiceSuggestions(
        request.context,
        req.user.userId
      );
      return {
        success: true,
        suggestions
      };
    } catch (error) {
      return {
        success: false,
        suggestions: [],
        error: error.message
      };
    }
  }

  @Post('camera/scan-document')
  async scanDocument(
    @Body() request: CameraScanRequest,
    @Request() req: any
  ): Promise<CameraScanResponse> {
    try {
      const result = await this.mobileAIService.scanDocument(
        request.imageData,
        req.user.userId
      );
      return result;
    } catch (error) {
      return {
        success: false,
        text: '',
        confidence: 0,
        documentType: 'other',
        extractedData: {},
        suggestions: [],
        error: error.message
      };
    }
  }

  @Post('camera/enhance-image')
  async enhanceImage(
    @Body() request: { imageData: string; timestamp: string },
    @Request() req: any
  ): Promise<{ success: boolean; enhancedImage: string; error?: string }> {
    try {
      const enhancedImage = await this.mobileAIService.enhanceImage(
        request.imageData,
        req.user.userId
      );
      return {
        success: true,
        enhancedImage
      };
    } catch (error) {
      return {
        success: false,
        enhancedImage: request.imageData,
        error: error.message
      };
    }
  }

  @Post('camera/detect-edges')
  async detectDocumentEdges(
    @Body() request: { imageData: string; timestamp: string },
    @Request() req: any
  ): Promise<{ success: boolean; corners: number[][]; confidence: number; error?: string }> {
    try {
      const result = await this.mobileAIService.detectDocumentEdges(
        request.imageData,
        req.user.userId
      );
      return {
        success: true,
        ...result
      };
    } catch (error) {
      return {
        success: false,
        corners: [],
        confidence: 0,
        error: error.message
      };
    }
  }

  @Post('camera/extract-text')
  async extractTextFromImage(
    @Body() request: { imageData: string; timestamp: string },
    @Request() req: any
  ): Promise<{ success: boolean; text: string; confidence: number; error?: string }> {
    try {
      const result = await this.mobileAIService.extractTextFromImage(
        request.imageData,
        req.user.userId
      );
      return {
        success: true,
        ...result
      };
    } catch (error) {
      return {
        success: false,
        text: '',
        confidence: 0,
        error: error.message
      };
    }
  }

  @Post('camera/analyze-structure')
  async analyzeDocumentStructure(
    @Body() request: { imageData: string; timestamp: string },
    @Request() req: any
  ): Promise<{
    success: boolean;
    sections: Array<{ title: string; content: string; confidence: number }>;
    tables: Array<{ data: string[][]; confidence: number }>;
    signatures: Array<{ location: number[]; confidence: number }>;
    error?: string;
  }> {
    try {
      const result = await this.mobileAIService.analyzeDocumentStructure(
        request.imageData,
        req.user.userId
      );
      return {
        success: true,
        ...result
      };
    } catch (error) {
      return {
        success: false,
        sections: [],
        tables: [],
        signatures: [],
        error: error.message
      };
    }
  }

  @Post('camera/validate-quality')
  async validateDocumentQuality(
    @Body() request: { imageData: string; timestamp: string },
    @Request() req: any
  ): Promise<{
    success: boolean;
    isBlurry: boolean;
    isDark: boolean;
    hasGlare: boolean;
    qualityScore: number;
    suggestions: string[];
    error?: string;
  }> {
    try {
      const result = await this.mobileAIService.validateDocumentQuality(
        request.imageData,
        req.user.userId
      );
      return {
        success: true,
        ...result
      };
    } catch (error) {
      return {
        success: false,
        isBlurry: false,
        isDark: false,
        hasGlare: false,
        qualityScore: 0.5,
        suggestions: ['Ensure good lighting', 'Hold camera steady'],
        error: error.message
      };
    }
  }

  @Post('gesture/analyze')
  async analyzeGesture(
    @Body() request: GestureAnalysisRequest,
    @Request() req: any
  ): Promise<GestureAnalysisResponse> {
    try {
      const result = await this.mobileAIService.analyzeGesture(
        request.gestureType,
        request.direction,
        request.context,
        req.user.userId
      );
      return result;
    } catch (error) {
      return {
        success: false,
        action: 'navigate',
        confidence: 0,
        error: error.message
      };
    }
  }

  @Get('offline/capabilities')
  async getOfflineCapabilities(
    @Request() req: any
  ): Promise<{
    success: boolean;
    capabilities: Array<{
      name: string;
      available: boolean;
      modelSize: number;
      accuracy: number;
      lastUpdated: Date;
    }>;
    error?: string;
  }> {
    try {
      const capabilities = await this.mobileAIService.getOfflineCapabilities(req.user.userId);
      return {
        success: true,
        capabilities
      };
    } catch (error) {
      return {
        success: false,
        capabilities: [],
        error: error.message
      };
    }
  }

  @Post('offline/analyze-text')
  async analyzeTextOffline(
    @Body() request: { text: string; timestamp: string },
    @Request() req: any
  ): Promise<{
    success: boolean;
    result: any;
    confidence: number;
    processingTime: number;
    modelUsed: string;
    error?: string;
  }> {
    try {
      const result = await this.mobileAIService.analyzeTextOffline(
        request.text,
        req.user.userId
      );
      return result;
    } catch (error) {
      return {
        success: false,
        result: null,
        confidence: 0,
        processingTime: 0,
        modelUsed: 'offline_analyzer',
        error: error.message
      };
    }
  }

  @Post('offline/extract-keywords')
  async extractKeywordsOffline(
    @Body() request: { text: string; timestamp: string },
    @Request() req: any
  ): Promise<{
    success: boolean;
    result: any;
    confidence: number;
    processingTime: number;
    modelUsed: string;
    error?: string;
  }> {
    try {
      const result = await this.mobileAIService.extractKeywordsOffline(
        request.text,
        req.user.userId
      );
      return result;
    } catch (error) {
      return {
        success: false,
        result: null,
        confidence: 0,
        processingTime: 0,
        modelUsed: 'offline_keyword_extractor',
        error: error.message
      };
    }
  }

  @Post('offline/analyze-sentiment')
  async analyzeSentimentOffline(
    @Body() request: { text: string; timestamp: string },
    @Request() req: any
  ): Promise<{
    success: boolean;
    result: any;
    confidence: number;
    processingTime: number;
    modelUsed: string;
    error?: string;
  }> {
    try {
      const result = await this.mobileAIService.analyzeSentimentOffline(
        request.text,
        req.user.userId
      );
      return result;
    } catch (error) {
      return {
        success: false,
        result: null,
        confidence: 0,
        processingTime: 0,
        modelUsed: 'offline_sentiment_analyzer',
        error: error.message
      };
    }
  }

  @Post('offline/check-compliance')
  async checkComplianceOffline(
    @Body() request: { text: string; timestamp: string },
    @Request() req: any
  ): Promise<{
    success: boolean;
    result: any;
    confidence: number;
    processingTime: number;
    modelUsed: string;
    error?: string;
  }> {
    try {
      const result = await this.mobileAIService.checkComplianceOffline(
        request.text,
        req.user.userId
      );
      return result;
    } catch (error) {
      return {
        success: false,
        result: null,
        confidence: 0,
        processingTime: 0,
        modelUsed: 'offline_compliance_checker',
        error: error.message
      };
    }
  }
}
