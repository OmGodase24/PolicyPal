import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface CameraToPDFResult {
  success: boolean;
  pdfData: string; // Base64 encoded PDF
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

export interface VoiceProfile {
  userId: string;
  voiceId: string;
  voiceData: string; // Encoded voice sample
  isActive: boolean;
  createdAt: Date;
  lastUsed: Date;
}

@Injectable({
  providedIn: 'root'
})
export class MobilePDFAIService {
  private apiUrl = `${environment.apiUrl}/ai/mobile/pdf`;
  private voiceProfile = new BehaviorSubject<VoiceProfile | null>(null);
  private isProcessing = new BehaviorSubject<boolean>(false);

  constructor(private http: HttpClient) {}

  get voiceProfile$(): Observable<VoiceProfile | null> {
    return this.voiceProfile.asObservable();
  }

  get isProcessing$(): Observable<boolean> {
    return this.isProcessing.asObservable();
  }

  /**
   * Convert camera image to PDF and analyze it
   * This is the core feature - urgent PDF creation from images
   */
  async createPDFFromImage(imageData: string, userId: string): Promise<CameraToPDFResult> {
    this.isProcessing.next(true);
    
    try {
      const response = await this.http.post<CameraToPDFResult>(`${this.apiUrl}/camera-to-pdf`, {
        imageData,
        userId,
        timestamp: new Date().toISOString()
      }).toPromise();

      if (response?.success) {
        this.isProcessing.next(false);
        return response;
      } else {
        throw new Error(response?.error || 'Failed to create PDF from image');
      }
    } catch (error) {
      this.isProcessing.next(false);
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
        suggestions: ['Please try again with better lighting', 'Ensure document is fully visible'],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Analyze existing PDF for deep understanding
   * This is what PolicyPal is all about - understanding policies
   */
  analyzePDFForUnderstanding(pdfData: string, userId: string): Observable<{
    success: boolean;
    analysis: {
      policyType: string;
      insuranceCompany: string;
      policyNumber: string;
      coverageAmount: string;
      effectiveDate: string;
      expiryDate: string;
      premiumAmount: string;
      deductibles: string[];
      coverageDetails: Array<{
        category: string;
        description: string;
        amount: string;
        conditions: string[];
      }>;
      exclusions: Array<{
        category: string;
        description: string;
        impact: 'high' | 'medium' | 'low';
      }>;
      keyTerms: Array<{
        term: string;
        definition: string;
        importance: 'critical' | 'important' | 'standard';
      }>;
      claimProcess: Array<{
        step: number;
        description: string;
        requiredDocuments: string[];
        timeline: string;
      }>;
      contactInfo: {
        phone: string;
        email: string;
        website: string;
        address: string;
      };
      complianceStatus: {
        gdpr: boolean;
        hipaa: boolean;
        sox: boolean;
        pci: boolean;
      };
    };
    suggestions: string[];
    error?: string;
  }> {
    return this.http.post<{
      success: boolean;
      analysis: any;
      suggestions: string[];
      error?: string;
    }>(`${this.apiUrl}/analyze-pdf`, {
      pdfData,
      userId,
      timestamp: new Date().toISOString()
    }).pipe(
      map(response => ({
        success: response.success,
        analysis: response.analysis,
        suggestions: response.suggestions || [],
        error: response.error
      })),
      catchError(error => from([{
        success: false,
        analysis: null,
        suggestions: ['Failed to analyze PDF', 'Please try again'],
        error: error.message
      }]))
    );
  }

  /**
   * Voice profile management - one voice per account
   */
  async createVoiceProfile(userId: string, voiceData: string): Promise<{
    success: boolean;
    voiceProfile?: VoiceProfile;
    error?: string;
  }> {
    try {
      const response = await this.http.post<{
        success: boolean;
        voiceProfile?: VoiceProfile;
        error?: string;
      }>(`${this.apiUrl}/voice-profile`, {
        userId,
        voiceData,
        timestamp: new Date().toISOString()
      }).toPromise();

      if (response?.success && response.voiceProfile) {
        this.voiceProfile.next(response.voiceProfile);
      }

      return response || { success: false, error: 'Failed to create voice profile' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getVoiceProfile(userId: string): Promise<VoiceProfile | null> {
    try {
      const response = await this.http.get<{
        success: boolean;
        voiceProfile?: VoiceProfile;
      }>(`${this.apiUrl}/voice-profile/${userId}`).toPromise();

      if (response?.success && response.voiceProfile) {
        this.voiceProfile.next(response.voiceProfile);
        return response.voiceProfile;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async deleteVoiceProfile(userId: string): Promise<boolean> {
    try {
      const response = await this.http.delete<{
        success: boolean;
      }>(`${this.apiUrl}/voice-profile/${userId}`).toPromise();

      if (response?.success) {
        this.voiceProfile.next(null);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Voice-based Q&A about policies
   * This is the core AI chat feature with voice
   */
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
    return this.http.post<{
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
    }>(`${this.apiUrl}/voice-qa`, {
      question,
      policyId,
      userId,
      voiceData,
      timestamp: new Date().toISOString()
    }).pipe(
      map(response => response),
      catchError(error => from([{
        success: false,
        answer: 'I apologize, but I encountered an error processing your question.',
        confidence: 0,
        followUpQuestions: [],
        relatedSections: [],
        error: error.message
      }]))
    );
  }

  /**
   * Compare two policies using voice commands
   */
  comparePoliciesWithVoice(
    policy1Id: string,
    policy2Id: string,
    userId: string,
    comparisonType: 'coverage' | 'cost' | 'terms' | 'comprehensive'
  ): Observable<{
    success: boolean;
    comparison: {
      summary: string;
      differences: Array<{
        category: string;
        policy1: string;
        policy2: string;
        recommendation: string;
      }>;
      recommendation: string;
      score: {
        policy1: number;
        policy2: number;
      };
    };
    error?: string;
  }> {
    return this.http.post<{
      success: boolean;
      comparison: any;
      error?: string;
    }>(`${this.apiUrl}/compare-policies`, {
      policy1Id,
      policy2Id,
      userId,
      comparisonType,
      timestamp: new Date().toISOString()
    }).pipe(
      map(response => ({
        success: response.success,
        comparison: response.comparison,
        error: response.error
      })),
      catchError(error => from([{
        success: false,
        comparison: null,
        error: error.message
      }]))
    );
  }

  /**
   * Get policy insights and recommendations
   */
  getPolicyInsights(policyId: string, userId: string): Observable<{
    success: boolean;
    insights: {
      strengths: string[];
      weaknesses: string[];
      recommendations: string[];
      riskAssessment: {
        level: 'low' | 'medium' | 'high';
        factors: string[];
        mitigation: string[];
      };
      complianceScore: number;
      coverageGaps: string[];
    };
    error?: string;
  }> {
    return this.http.post<{
      success: boolean;
      insights: any;
      error?: string;
    }>(`${this.apiUrl}/policy-insights`, {
      policyId,
      userId,
      timestamp: new Date().toISOString()
    }).pipe(
      map(response => ({
        success: response.success,
        insights: response.insights,
        error: response.error
      })),
      catchError(error => from([{
        success: false,
        insights: null,
        error: error.message
      }]))
    );
  }
}
