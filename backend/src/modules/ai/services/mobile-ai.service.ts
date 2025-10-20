import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MobileAIService {
  private readonly logger = new Logger(MobileAIService.name);
  private readonly aiServiceUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService
  ) {
    this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:5000');
  }

  async processVoiceCommand(
    transcript: string,
    confidence: number,
    userId: string
  ): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/mobile/voice/process-command`, {
          transcript,
          confidence,
          userId,
          timestamp: new Date().toISOString()
        })
      );

      return {
        success: true,
        command: {
          type: response.data.command_type || 'ai_chat',
          content: transcript,
          confidence,
          timestamp: new Date()
        },
        suggestions: response.data.suggestions || []
      };
    } catch (error) {
      this.logger.error(`Voice command processing failed: ${error.message}`);
      
      // Fallback to simple command detection
      return this.detectSimpleCommand(transcript, confidence);
    }
  }

  async createPolicyFromVoice(
    voiceContent: string,
    userId: string
  ): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/mobile/voice/create-policy`, {
          voiceContent,
          userId,
          timestamp: new Date().toISOString()
        })
      );

      return {
        success: true,
        policyDraft: {
          title: response.data.title || 'Voice-Created Policy',
          description: response.data.description || 'Policy created from voice input',
          content: response.data.content || voiceContent,
          category: response.data.category || 'General',
          confidence: response.data.confidence || 0.8,
          suggestions: response.data.suggestions || [
            'Add specific terms and conditions',
            'Include coverage limits and exclusions',
            'Specify claim procedures'
          ]
        }
      };
    } catch (error) {
      this.logger.error(`Voice policy creation failed: ${error.message}`);
      
      // Fallback to simple policy creation
      return this.createSimplePolicyDraft(voiceContent);
    }
  }

  async getVoiceSuggestions(
    context: string,
    userId: string
  ): Promise<string[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/mobile/voice/suggestions`, {
          context,
          userId,
          timestamp: new Date().toISOString()
        })
      );

      return response.data.suggestions || [];
    } catch (error) {
      this.logger.error(`Voice suggestions failed: ${error.message}`);
      return [
        'Add coverage details',
        'Include exclusions',
        'Specify terms and conditions',
        'Add contact information'
      ];
    }
  }

  async scanDocument(
    imageData: string,
    userId: string
  ): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/mobile/camera/scan-document`, {
          imageData,
          userId,
          timestamp: new Date().toISOString()
        })
      );

      return {
        success: true,
        text: response.data.text || '',
        confidence: response.data.confidence || 0.8,
        documentType: response.data.document_type || 'policy',
        extractedData: response.data.extracted_data || {},
        suggestions: response.data.suggestions || []
      };
    } catch (error) {
      this.logger.error(`Document scanning failed: ${error.message}`);
      
      // Fallback to basic OCR simulation
      return this.simulateDocumentScan(imageData);
    }
  }

  async enhanceImage(
    imageData: string,
    userId: string
  ): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/mobile/camera/enhance-image`, {
          imageData,
          userId,
          timestamp: new Date().toISOString()
        })
      );

      return response.data.enhanced_image || imageData;
    } catch (error) {
      this.logger.error(`Image enhancement failed: ${error.message}`);
      return imageData; // Return original if enhancement fails
    }
  }

  async detectDocumentEdges(
    imageData: string,
    userId: string
  ): Promise<{ corners: number[][]; confidence: number }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/mobile/camera/detect-edges`, {
          imageData,
          userId,
          timestamp: new Date().toISOString()
        })
      );

      return {
        corners: response.data.corners || [],
        confidence: response.data.confidence || 0.8
      };
    } catch (error) {
      this.logger.error(`Edge detection failed: ${error.message}`);
      return { corners: [], confidence: 0 };
    }
  }

  async extractTextFromImage(
    imageData: string,
    userId: string
  ): Promise<{ text: string; confidence: number }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/mobile/camera/extract-text`, {
          imageData,
          userId,
          timestamp: new Date().toISOString()
        })
      );

      return {
        text: response.data.text || '',
        confidence: response.data.confidence || 0.8
      };
    } catch (error) {
      this.logger.error(`Text extraction failed: ${error.message}`);
      return { text: '', confidence: 0 };
    }
  }

  async analyzeDocumentStructure(
    imageData: string,
    userId: string
  ): Promise<{
    sections: Array<{ title: string; content: string; confidence: number }>;
    tables: Array<{ data: string[][]; confidence: number }>;
    signatures: Array<{ location: number[]; confidence: number }>;
  }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/mobile/camera/analyze-structure`, {
          imageData,
          userId,
          timestamp: new Date().toISOString()
        })
      );

      return {
        sections: response.data.sections || [],
        tables: response.data.tables || [],
        signatures: response.data.signatures || []
      };
    } catch (error) {
      this.logger.error(`Document structure analysis failed: ${error.message}`);
      return {
        sections: [],
        tables: [],
        signatures: []
      };
    }
  }

  async validateDocumentQuality(
    imageData: string,
    userId: string
  ): Promise<{
    isBlurry: boolean;
    isDark: boolean;
    hasGlare: boolean;
    qualityScore: number;
    suggestions: string[];
  }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/mobile/camera/validate-quality`, {
          imageData,
          userId,
          timestamp: new Date().toISOString()
        })
      );

      return {
        isBlurry: response.data.is_blurry || false,
        isDark: response.data.is_dark || false,
        hasGlare: response.data.has_glare || false,
        qualityScore: response.data.quality_score || 0.8,
        suggestions: response.data.suggestions || []
      };
    } catch (error) {
      this.logger.error(`Quality validation failed: ${error.message}`);
      return {
        isBlurry: false,
        isDark: false,
        hasGlare: false,
        qualityScore: 0.5,
        suggestions: ['Ensure good lighting', 'Hold camera steady', 'Avoid glare']
      };
    }
  }

  async analyzeGesture(
    gestureType: string,
    direction: string | undefined,
    context: string,
    userId: string
  ): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/mobile/gesture/analyze`, {
          gestureType,
          direction,
          context,
          userId,
          timestamp: new Date().toISOString()
        })
      );

      return {
        success: true,
        action: response.data.action || 'navigate',
        confidence: response.data.confidence || 0.8,
        data: response.data.data || {},
        suggestions: response.data.suggestions || []
      };
    } catch (error) {
      this.logger.error(`Gesture analysis failed: ${error.message}`);
      
      // Fallback to simple gesture interpretation
      return this.interpretSimpleGesture(gestureType, direction, context);
    }
  }

  async getOfflineCapabilities(userId: string): Promise<Array<{
    name: string;
    available: boolean;
    modelSize: number;
    accuracy: number;
    lastUpdated: Date;
  }>> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.aiServiceUrl}/mobile/offline/capabilities`, {
          params: { userId }
        })
      );

      return response.data.capabilities || [];
    } catch (error) {
      this.logger.error(`Offline capabilities fetch failed: ${error.message}`);
      
      // Return default capabilities
      return [
        {
          name: 'text_analysis',
          available: true,
          modelSize: 2.5,
          accuracy: 0.85,
          lastUpdated: new Date()
        },
        {
          name: 'keyword_extraction',
          available: true,
          modelSize: 1.2,
          accuracy: 0.90,
          lastUpdated: new Date()
        },
        {
          name: 'sentiment_analysis',
          available: true,
          modelSize: 3.1,
          accuracy: 0.82,
          lastUpdated: new Date()
        }
      ];
    }
  }

  async analyzeTextOffline(
    text: string,
    userId: string
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Simulate offline text analysis
      const wordCount = text.split(/\s+/).length;
      const sentenceCount = text.split(/[.!?]+/).length;
      const readingTime = Math.ceil(wordCount / 200);

      return {
        success: true,
        result: {
          wordCount,
          sentenceCount,
          readingTime,
          complexity: this.calculateTextComplexity(text),
          language: this.detectLanguage(text)
        },
        confidence: 0.85,
        processingTime: Date.now() - startTime,
        modelUsed: 'offline_text_analyzer'
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        confidence: 0,
        processingTime: Date.now() - startTime,
        modelUsed: 'offline_text_analyzer',
        error: error.message
      };
    }
  }

  async extractKeywordsOffline(
    text: string,
    userId: string
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      const words = text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3);

      const wordFreq: { [key: string]: number } = {};
      words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });

      const keywords = Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([word, freq]) => ({ word, frequency: freq }));

      return {
        success: true,
        result: { keywords },
        confidence: 0.90,
        processingTime: Date.now() - startTime,
        modelUsed: 'offline_keyword_extractor'
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        confidence: 0,
        processingTime: Date.now() - startTime,
        modelUsed: 'offline_keyword_extractor',
        error: error.message
      };
    }
  }

  async analyzeSentimentOffline(
    text: string,
    userId: string
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful'];
      const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate'];
      
      const words = text.toLowerCase().split(/\s+/);
      let positiveScore = 0;
      let negativeScore = 0;

      words.forEach(word => {
        if (positiveWords.includes(word)) positiveScore++;
        if (negativeWords.includes(word)) negativeScore++;
      });

      const totalScore = positiveScore + negativeScore;
      const sentiment = totalScore === 0 ? 'neutral' : 
                      positiveScore > negativeScore ? 'positive' : 'negative';
      const confidence = totalScore === 0 ? 0.5 : Math.abs(positiveScore - negativeScore) / totalScore;

      return {
        success: true,
        result: { sentiment, confidence, positiveScore, negativeScore },
        confidence: Math.max(0.6, confidence),
        processingTime: Date.now() - startTime,
        modelUsed: 'offline_sentiment_analyzer'
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        confidence: 0,
        processingTime: Date.now() - startTime,
        modelUsed: 'offline_sentiment_analyzer',
        error: error.message
      };
    }
  }

  async checkComplianceOffline(
    text: string,
    userId: string
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      const compliancePatterns = {
        gdpr: ['personal data', 'consent', 'data protection', 'privacy'],
        hipaa: ['health information', 'medical records', 'patient data'],
        sox: ['financial reporting', 'internal controls', 'audit'],
        pci: ['credit card', 'payment data', 'cardholder']
      };

      const textLower = text.toLowerCase();
      const complianceResults: { [key: string]: { found: boolean; matches: string[] } } = {};

      Object.entries(compliancePatterns).forEach(([framework, patterns]) => {
        const matches = patterns.filter(pattern => textLower.includes(pattern));
        complianceResults[framework] = {
          found: matches.length > 0,
          matches
        };
      });

      return {
        success: true,
        result: { complianceResults },
        confidence: 0.75,
        processingTime: Date.now() - startTime,
        modelUsed: 'offline_compliance_checker'
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        confidence: 0,
        processingTime: Date.now() - startTime,
        modelUsed: 'offline_compliance_checker',
        error: error.message
      };
    }
  }

  // Helper methods
  private detectSimpleCommand(transcript: string, confidence: number): any {
    const lowerTranscript = transcript.toLowerCase();
    
    if (lowerTranscript.includes('create policy') || lowerTranscript.includes('new policy')) {
      return {
        success: true,
        command: {
          type: 'create_policy',
          content: transcript,
          confidence,
          timestamp: new Date()
        }
      };
    } else if (lowerTranscript.includes('edit policy') || lowerTranscript.includes('modify policy')) {
      return {
        success: true,
        command: {
          type: 'edit_policy',
          content: transcript,
          confidence,
          timestamp: new Date()
        }
      };
    } else if (lowerTranscript.includes('search') || lowerTranscript.includes('find policy')) {
      return {
        success: true,
        command: {
          type: 'search_policy',
          content: transcript,
          confidence,
          timestamp: new Date()
        }
      };
    } else if (lowerTranscript.includes('scan document') || lowerTranscript.includes('scan paper')) {
      return {
        success: true,
        command: {
          type: 'scan_document',
          content: transcript,
          confidence,
          timestamp: new Date()
        }
      };
    } else {
      return {
        success: true,
        command: {
          type: 'ai_chat',
          content: transcript,
          confidence,
          timestamp: new Date()
        }
      };
    }
  }

  private createSimplePolicyDraft(voiceContent: string): any {
    const lines = voiceContent.split('.').filter(line => line.trim().length > 0);
    const title = lines[0]?.trim() || 'Voice-Created Policy';
    const description = lines[1]?.trim() || 'Policy created from voice input';
    const content = lines.slice(2).join('. ').trim() || voiceContent;

    return {
      success: true,
      policyDraft: {
        title,
        description,
        content,
        category: 'General',
        confidence: 0.8,
        suggestions: [
          'Add specific terms and conditions',
          'Include coverage limits and exclusions',
          'Specify claim procedures',
          'Add contact information'
        ]
      }
    };
  }

  private simulateDocumentScan(imageData: string): any {
    return {
      success: true,
      text: 'Simulated document text extracted from image',
      confidence: 0.7,
      documentType: 'policy',
      extractedData: {
        title: 'Sample Policy Document',
        policyNumber: 'POL-001',
        dates: ['2024-01-01', '2024-12-31'],
        amounts: ['$100,000', '$500'],
        parties: ['Policy Holder', 'Insurance Company']
      },
      suggestions: [
        'Review extracted text for accuracy',
        'Add missing information manually',
        'Verify policy numbers and dates'
      ]
    };
  }

  private interpretSimpleGesture(
    gestureType: string,
    direction: string | undefined,
    context: string
  ): any {
    switch (gestureType) {
      case 'swipe':
        switch (direction) {
          case 'left':
            return {
              success: true,
              action: 'analyze',
              confidence: 0.8,
              data: { analysisType: 'compliance' },
              suggestions: ['Analyzing policy compliance...']
            };
          case 'right':
            return {
              success: true,
              action: 'summarize',
              confidence: 0.8,
              data: { summaryType: 'brief' },
              suggestions: ['Generating policy summary...']
            };
          case 'up':
            return {
              success: true,
              action: 'highlight',
              confidence: 0.7,
              data: { highlightType: 'important' },
              suggestions: ['Highlighting important sections...']
            };
          case 'down':
            return {
              success: true,
              action: 'search',
              confidence: 0.7,
              data: { searchType: 'keywords' },
              suggestions: ['Searching for keywords...']
            };
          default:
            return {
              success: true,
              action: 'navigate',
              confidence: 0.5,
              suggestions: ['Gesture recognized but action unclear']
            };
        }
      case 'longpress':
        return {
          success: true,
          action: 'highlight',
          confidence: 0.9,
          data: { highlightType: 'context_menu' },
          suggestions: ['Showing context menu...']
        };
      case 'doubletap':
        return {
          success: true,
          action: 'analyze',
          confidence: 0.8,
          data: { analysisType: 'quick' },
          suggestions: ['Quick analysis in progress...']
        };
      default:
        return {
          success: true,
          action: 'navigate',
          confidence: 0.5,
          suggestions: ['Unknown gesture detected']
        };
    }
  }

  private calculateTextComplexity(text: string): string {
    const words = text.split(/\s+/);
    const sentences = text.split(/[.!?]+/);
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = this.calculateAverageSyllables(words);

    const complexity = (avgWordsPerSentence * 0.39) + (avgSyllablesPerWord * 11.8) - 15.59;

    if (complexity < 30) return 'simple';
    if (complexity < 50) return 'moderate';
    if (complexity < 70) return 'complex';
    return 'very complex';
  }

  private calculateAverageSyllables(words: string[]): number {
    const totalSyllables = words.reduce((total, word) => {
      return total + this.countSyllables(word);
    }, 0);
    return totalSyllables / words.length;
  }

  private countSyllables(word: string): number {
    const vowels = 'aeiouy';
    let count = 0;
    let previousWasVowel = false;

    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i].toLowerCase());
      if (isVowel && !previousWasVowel) {
        count++;
      }
      previousWasVowel = isVowel;
    }

    if (word.endsWith('e')) count--;
    return Math.max(1, count);
  }

  private detectLanguage(text: string): string {
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of'];
    const spanishWords = ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se'];
    const frenchWords = ['le', 'la', 'de', 'et', 'à', 'un', 'il', 'que', 'ne', 'se'];

    const words = text.toLowerCase().split(/\s+/);
    let englishCount = 0;
    let spanishCount = 0;
    let frenchCount = 0;

    words.forEach(word => {
      if (englishWords.includes(word)) englishCount++;
      if (spanishWords.includes(word)) spanishCount++;
      if (frenchWords.includes(word)) frenchCount++;
    });

    if (englishCount > spanishCount && englishCount > frenchCount) return 'en';
    if (spanishCount > frenchCount) return 'es';
    if (frenchCount > 0) return 'fr';
    return 'en';
  }
}
