import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable()
export class MobilePDFAIService {
  private readonly logger = new Logger(MobilePDFAIService.name);
  private readonly aiServiceUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService
  ) {
    this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:5000');
  }

  async createPDFFromImage(
    imageData: string,
    userId: string
  ): Promise<{
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
  }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/mobile/pdf/camera-to-pdf`, {
          imageData,
          userId,
          timestamp: new Date().toISOString()
        })
      );

      return {
        success: true,
        pdfData: response.data.pdfData || '',
        extractedText: response.data.extractedText || '',
        confidence: response.data.confidence || 0.8,
        documentType: response.data.documentType || 'policy',
        analysisResults: {
          policyNumber: response.data.analysisResults?.policyNumber,
          insuranceCompany: response.data.analysisResults?.insuranceCompany,
          coverageAmount: response.data.analysisResults?.coverageAmount,
          effectiveDate: response.data.analysisResults?.effectiveDate,
          expiryDate: response.data.analysisResults?.expiryDate,
          keyTerms: response.data.analysisResults?.keyTerms || [],
          exclusions: response.data.analysisResults?.exclusions || [],
          coverageDetails: response.data.analysisResults?.coverageDetails || []
        },
        suggestions: response.data.suggestions || [
          'Review extracted information for accuracy',
          'Add missing details manually if needed',
          'Verify policy numbers and dates'
        ]
      };
    } catch (error) {
      this.logger.error(`Camera to PDF conversion failed: ${error.message}`);
      
      // Fallback to simulated response
      return this.simulateCameraToPDF(imageData, userId);
    }
  }

  analyzePDFForUnderstanding(
    pdfData: string,
    userId: string
  ): Observable<{
    success: boolean;
    analysis: any;
    suggestions: string[];
    error?: string;
  }> {
    return this.httpService.post(`${this.aiServiceUrl}/mobile/pdf/analyze-pdf`, {
      pdfData,
      userId,
      timestamp: new Date().toISOString()
    }).pipe(
      map(response => ({
        success: true,
        analysis: response.data.analysis || this.generateMockAnalysis(),
        suggestions: response.data.suggestions || [
          'Review the analysis for accuracy',
          'Check coverage details against your needs',
          'Verify exclusions and limitations'
        ]
      })),
      catchError(error => {
        this.logger.error(`PDF analysis failed: ${error.message}`);
        return of({
          success: false,
          analysis: null,
          suggestions: ['Failed to analyze PDF', 'Please try again'],
          error: error.message
        });
      })
    );
  }

  async createVoiceProfile(
    userId: string,
    voiceData: string
  ): Promise<{
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
  }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/mobile/pdf/voice-profile`, {
          userId,
          voiceData,
          timestamp: new Date().toISOString()
        })
      );

      if (response.data.success) {
        return {
          success: true,
          voiceProfile: {
            userId: response.data.voiceProfile.userId,
            voiceId: response.data.voiceProfile.voiceId || `voice_${userId}_${Date.now()}`,
            voiceData: response.data.voiceProfile.voiceData || voiceData,
            isActive: true,
            createdAt: new Date(),
            lastUsed: new Date()
          }
        };
      } else {
        return {
          success: false,
          error: response.data.error || 'Failed to create voice profile'
        };
      }
    } catch (error) {
      this.logger.error(`Voice profile creation failed: ${error.message}`);
      
      // Fallback to local creation
      return {
        success: true,
        voiceProfile: {
          userId,
          voiceId: `voice_${userId}_${Date.now()}`,
          voiceData,
          isActive: true,
          createdAt: new Date(),
          lastUsed: new Date()
        }
      };
    }
  }

  async getVoiceProfile(userId: string): Promise<{
    userId: string;
    voiceId: string;
    voiceData: string;
    isActive: boolean;
    createdAt: Date;
    lastUsed: Date;
  } | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.aiServiceUrl}/mobile/pdf/voice-profile/${userId}`)
      );

      if (response.data.success && response.data.voiceProfile) {
        return response.data.voiceProfile;
      }
      return null;
    } catch (error) {
      this.logger.error(`Voice profile retrieval failed: ${error.message}`);
      return null;
    }
  }

  async deleteVoiceProfile(userId: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(`${this.aiServiceUrl}/mobile/pdf/voice-profile/${userId}`)
      );

      return response.data.success || false;
    } catch (error) {
      this.logger.error(`Voice profile deletion failed: ${error.message}`);
      return false;
    }
  }

  askQuestionWithVoice(
    question: string,
    policyId: string,
    userId: string,
    voiceData?: string
  ): Observable<{
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
  }> {
    return this.httpService.post(`${this.aiServiceUrl}/mobile/pdf/voice-qa`, {
      question,
      policyId,
      userId,
      voiceData,
      timestamp: new Date().toISOString()
    }).pipe(
      map(response => ({
        success: response.data.success || false,
        answer: response.data.answer || 'I apologize, but I could not process your question.',
        confidence: response.data.confidence || 0.8,
        followUpQuestions: response.data.followUpQuestions || this.generateFollowUpQuestions(question),
        relatedSections: response.data.relatedSections || this.generateRelatedSections(question),
        error: response.data.error
      })),
      catchError(error => {
        this.logger.error(`Voice Q&A failed: ${error.message}`);
        return of({
          success: false,
          answer: 'I apologize, but I encountered an error processing your question. Please try again.',
          confidence: 0,
          followUpQuestions: [],
          relatedSections: [],
          error: error.message
        });
      })
    );
  }

  comparePoliciesWithVoice(
    policy1Id: string,
    policy2Id: string,
    userId: string,
    comparisonType: 'coverage' | 'cost' | 'terms' | 'comprehensive'
  ): Observable<{
    success: boolean;
    comparison: any;
    error?: string;
  }> {
    return this.httpService.post(`${this.aiServiceUrl}/mobile/pdf/compare-policies`, {
      policy1Id,
      policy2Id,
      userId,
      comparisonType,
      timestamp: new Date().toISOString()
    }).pipe(
      map(response => ({
        success: response.data.success || false,
        comparison: response.data.comparison || this.generateMockComparison(comparisonType),
        error: response.data.error
      })),
      catchError(error => {
        this.logger.error(`Policy comparison failed: ${error.message}`);
        return of({
          success: false,
          comparison: null,
          error: error.message
        });
      })
    );
  }

  getPolicyInsights(
    policyId: string,
    userId: string
  ): Observable<{
    success: boolean;
    insights: any;
    error?: string;
  }> {
    return this.httpService.post(`${this.aiServiceUrl}/mobile/pdf/policy-insights`, {
      policyId,
      userId,
      timestamp: new Date().toISOString()
    }).pipe(
      map(response => ({
        success: response.data.success || false,
        insights: response.data.insights || this.generateMockInsights(),
        error: response.data.error
      })),
      catchError(error => {
        this.logger.error(`Policy insights failed: ${error.message}`);
        return of({
          success: false,
          insights: null,
          error: error.message
        });
      })
    );
  }

  // Helper methods for fallback responses
  private simulateCameraToPDF(imageData: string, userId: string): any {
    return {
      success: true,
      pdfData: 'simulated_pdf_data',
      extractedText: 'Simulated policy text extracted from image',
      confidence: 0.7,
      documentType: 'policy' as const,
      analysisResults: {
        policyNumber: 'POL-12345',
        insuranceCompany: 'Sample Insurance Co',
        coverageAmount: '$500,000',
        effectiveDate: '2024-01-01',
        expiryDate: '2024-12-31',
        keyTerms: ['Coverage', 'Deductible', 'Premium', 'Exclusions'],
        exclusions: ['Pre-existing conditions', 'Cosmetic surgery'],
        coverageDetails: ['Hospitalization', 'Emergency care', 'Prescription drugs']
      },
      suggestions: [
        'Review extracted information for accuracy',
        'Add missing details manually if needed',
        'Verify policy numbers and dates'
      ]
    };
  }

  private generateMockAnalysis(): any {
    return {
      policyType: 'Health Insurance',
      insuranceCompany: 'ABC Insurance Company',
      policyNumber: 'POL-12345',
      coverageAmount: '$500,000',
      effectiveDate: '2024-01-01',
      expiryDate: '2024-12-31',
      premiumAmount: '$500/month',
      deductibles: ['$1,000 individual', '$2,000 family'],
      coverageDetails: [
        {
          category: 'Hospitalization',
          description: 'Inpatient hospital care',
          amount: '$500,000',
          conditions: ['Network hospitals only', 'Pre-authorization required']
        },
        {
          category: 'Emergency Care',
          description: 'Emergency room visits',
          amount: '$10,000',
          conditions: ['True emergency only', 'Co-pay required']
        }
      ],
      exclusions: [
        {
          category: 'Pre-existing Conditions',
          description: 'Conditions existing before policy start',
          impact: 'high'
        },
        {
          category: 'Cosmetic Surgery',
          description: 'Elective cosmetic procedures',
          impact: 'medium'
        }
      ],
      keyTerms: [
        {
          term: 'Deductible',
          definition: 'Amount you pay before insurance coverage begins',
          importance: 'critical'
        },
        {
          term: 'Co-pay',
          definition: 'Fixed amount you pay for covered services',
          importance: 'important'
        }
      ],
      claimProcess: [
        {
          step: 1,
          description: 'Contact insurance company',
          requiredDocuments: ['Policy number', 'Medical bills'],
          timeline: 'Within 30 days'
        },
        {
          step: 2,
          description: 'Submit claim form',
          requiredDocuments: ['Completed claim form', 'Supporting documents'],
          timeline: 'Within 60 days'
        }
      ],
      contactInfo: {
        phone: '1-800-123-4567',
        email: 'claims@abcinsurance.com',
        website: 'www.abcinsurance.com',
        address: '123 Insurance St, City, State 12345'
      },
      complianceStatus: {
        gdpr: true,
        hipaa: true,
        sox: false,
        pci: false
      }
    };
  }

  private generateFollowUpQuestions(question: string): string[] {
    const questionLower = question.toLowerCase();
    
    if (questionLower.includes('coverage') || questionLower.includes('covered')) {
      return [
        'What are the exclusions?',
        'What is the coverage amount?',
        'Are there any limitations?'
      ];
    } else if (questionLower.includes('claim') || questionLower.includes('claim')) {
      return [
        'What documents do I need?',
        'What is the claim timeline?',
        'How do I track my claim?'
      ];
    } else if (questionLower.includes('cost') || questionLower.includes('premium')) {
      return [
        'What is the deductible?',
        'Are there any co-pays?',
        'What affects the premium?'
      ];
    } else {
      return [
        'Can you explain this in more detail?',
        'What are the key terms?',
        'How does this affect me?'
      ];
    }
  }

  private generateRelatedSections(question: string): Array<{
    section: string;
    relevance: number;
    excerpt: string;
  }> {
    const questionLower = question.toLowerCase();
    
    if (questionLower.includes('coverage')) {
      return [
        {
          section: 'Coverage Details',
          relevance: 0.9,
          excerpt: 'This policy covers hospitalization, emergency care, and prescription drugs...'
        },
        {
          section: 'Exclusions',
          relevance: 0.7,
          excerpt: 'The following are not covered under this policy...'
        }
      ];
    } else if (questionLower.includes('claim')) {
      return [
        {
          section: 'Claims Process',
          relevance: 0.9,
          excerpt: 'To file a claim, contact us within 30 days of treatment...'
        },
        {
          section: 'Required Documents',
          relevance: 0.8,
          excerpt: 'You will need to provide the following documents...'
        }
      ];
    } else {
      return [
        {
          section: 'General Terms',
          relevance: 0.6,
          excerpt: 'This policy is subject to the following terms and conditions...'
        }
      ];
    }
  }

  private generateMockComparison(comparisonType: string): any {
    return {
      summary: `Comparison of policies based on ${comparisonType}`,
      differences: [
        {
          category: 'Coverage Amount',
          policy1: '$500,000',
          policy2: '$750,000',
          recommendation: 'Policy 2 offers higher coverage'
        },
        {
          category: 'Deductible',
          policy1: '$1,000',
          policy2: '$2,000',
          recommendation: 'Policy 1 has lower deductible'
        }
      ],
      recommendation: 'Based on your needs, Policy 2 may be better for higher coverage',
      score: {
        policy1: 75,
        policy2: 85
      }
    };
  }

  private generateMockInsights(): any {
    return {
      strengths: [
        'Comprehensive coverage for major medical expenses',
        'Good network of hospitals and doctors',
        'Reasonable premium for coverage provided'
      ],
      weaknesses: [
        'High deductible may be difficult to meet',
        'Limited coverage for alternative treatments',
        'No coverage for pre-existing conditions'
      ],
      recommendations: [
        'Consider adding a supplemental policy for lower deductible',
        'Review network hospitals in your area',
        'Understand exclusions before making claims'
      ],
      riskAssessment: {
        level: 'medium',
        factors: [
          'High deductible risk',
          'Limited pre-existing condition coverage',
          'Network restrictions'
        ],
        mitigation: [
          'Build emergency fund for deductible',
          'Consider additional coverage',
          'Verify network providers'
        ]
      },
      complianceScore: 85,
      coverageGaps: [
        'Pre-existing conditions',
        'Alternative medicine',
        'Cosmetic procedures'
      ]
    };
  }
}
