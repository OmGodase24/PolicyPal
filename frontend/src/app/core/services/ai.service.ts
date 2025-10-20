import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, map, tap, catchError, throwError, BehaviorSubject, of } from 'rxjs';

import { environment } from '@environments/environment';
import { NotificationService } from './notification.service';
import { SummaryLevel, SummaryLevelResponse, PolicySummaryInfo } from '../models/summary-level.model';
import { ComplianceRequest, ComplianceResponse, ComplianceReport, RegulationInfo } from '../models/compliance.model';

export interface PolicyDocument {
  _id: string;
  filename: string;
  text_length: number;
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

export interface QuestionRequest {
  question: string;
  policyId?: string;
  sessionId?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string; timestamp?: string }>;
  images?: string[]; // Base64 image data for context
}

export interface AnswerResponse {
  answer: string;
  confidence: number;
  sources: Array<{
    chunk_id: string;
    filename: string;
    similarity_score: number;
    text_preview: string;
  }>;
  policy_id?: string;
  timestamp: string;
}

export interface UploadProgress {
  percentage: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AIService {
  private readonly apiUrl = `${environment.apiUrl}/ai`;
  
  // Upload progress tracking
  private uploadProgressSubject = new BehaviorSubject<UploadProgress | null>(null);
  public uploadProgress$ = this.uploadProgressSubject.asObservable();

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService
  ) {}

  /**
   * Upload a policy PDF file for AI processing
   */
  uploadPolicyDocument(file: File, policyId?: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (policyId) {
      formData.append('policyId', policyId);
    }

    return this.http.post(`${this.apiUrl}/upload-policy`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map((event: HttpEvent<any>) => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            if (event.total) {
              const percentDone = Math.round(100 * event.loaded / event.total);
              this.uploadProgressSubject.next({
                percentage: percentDone,
                status: 'uploading',
                message: `Uploading ${file.name}... ${percentDone}%`
              });
            }
            return null;

          case HttpEventType.Response:
            this.uploadProgressSubject.next({
              percentage: 100,
              status: 'completed',
              message: 'Upload and processing completed!'
            });
            
            // Clear progress after 2 seconds
            setTimeout(() => {
              this.uploadProgressSubject.next(null);
            }, 2000);
            
            return event.body;

          default:
            return null;
        }
      }),
      tap(response => {
        if (response?.success) {
          this.notificationService.showPolicyAIProcessed(file.name);
        }
      }),
      catchError(error => {
        this.uploadProgressSubject.next({
          percentage: 0,
          status: 'error',
          message: 'Upload failed'
        });
        
        // Clear progress after 3 seconds
        setTimeout(() => {
          this.uploadProgressSubject.next(null);
        }, 3000);
        
        const errorMessage = error.error?.message || error.message || 'Upload failed';
        this.notificationService.showPolicyAIError(file.name);
        return throwError(() => error);
      })
    );
  }

  /**
   * Ask a question about uploaded policies
   */
  askQuestion(request: QuestionRequest): Observable<AnswerResponse> {
    return this.http.post<any>(`${this.apiUrl}/ask-question`, request)
      .pipe(
        map(response => response.data || response), // Handle both wrapped and direct responses
        catchError(error => {
          const errorMessage = error.error?.message || 'Failed to get answer';
          this.notificationService.showError(errorMessage);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get all uploaded policies for the current user
   */
  getUserPolicies(): Observable<PolicyDocument[]> {
    return this.http.get<any>(`${this.apiUrl}/policies`)
      .pipe(
        map(response => response.data.policies || []),
        catchError(error => {
          this.notificationService.showError('Failed to load policies');
          return throwError(() => error);
        })
      );
  }

  /**
   * Get a specific policy document
   */
  getPolicy(documentId: string): Observable<PolicyDocument> {
    return this.http.get<any>(`${this.apiUrl}/policies/${documentId}`)
      .pipe(
        map(response => response.data),
        catchError(error => {
          this.notificationService.showError('Failed to load policy');
          return throwError(() => error);
        })
      );
  }

  /**
   * Delete a policy document
   */
  deletePolicy(documentId: string): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/policies/${documentId}`)
      .pipe(
        map(response => response.success),
        tap(success => {
          if (success) {
            this.notificationService.showSuccess('Policy deleted successfully');
          }
        }),
        catchError(error => {
          this.notificationService.showError('Failed to delete policy');
          return throwError(() => error);
        })
      );
  }

  /**
   * Get AI service statistics
   */
  getStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats`)
      .pipe(
        map(response => response.data),
        catchError(error => {
          console.error('Failed to load AI stats:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Check if AI service is available
   */
  checkServiceHealth(): Observable<boolean> {
    return this.http.get<any>(`${this.apiUrl}/health`)
      .pipe(
        map(response => response.success || false),
        catchError(() => {
          // Don't show error notification for health checks
          return throwError(() => false);
        })
      );
  }

  /**
   * Clear upload progress
   */
  clearUploadProgress(): void {
    this.uploadProgressSubject.next(null);
  }

  /**
   * Get AI summary of a policy
   */
  summarizePolicy(policyId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/summarize-policy`, { policyId })
      .pipe(
        map(response => response.data),
        catchError(error => {
          const errorMessage = error.error?.message || 'Failed to summarize policy';
          this.notificationService.showError(errorMessage);
          return throwError(() => error);
        })
      );
  }

  /**
   * Compare multiple policies side by side
   */
  comparePolicies(policyIds: string[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/compare-policies`, { policyIds })
      .pipe(
        map(response => response.data),
        catchError(error => {
          const errorMessage = error.error?.message || 'Failed to compare policies';
          this.notificationService.showError(errorMessage);
          return throwError(() => error);
        })
      );
  }

  /**
   * Start a new AI chat session for a specific policy
   */
  startChatSession(policyId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/assistant/start-chat`, { policyId })
      .pipe(
        map(response => response.data),
        catchError(error => {
          const errorMessage = error.error?.message || 'Failed to start chat session';
          this.notificationService.showError(errorMessage);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get published policies for AI Assistant
   */
  getPublishedPolicies(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/assistant/published-policies`)
      .pipe(
        map(response => response.data || []),
        catchError(error => {
          const errorMessage = error.error?.message || 'Failed to get published policies';
          this.notificationService.showError(errorMessage);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get AI-generated summary for a policy
   */
  getPolicySummary(policyId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/assistant/policy/${policyId}/summary`)
      .pipe(
        map(response => response.data),
        catchError(error => {
          const errorMessage = error.error?.message || 'Failed to get policy summary';
          this.notificationService.showError(errorMessage);
          return throwError(() => error);
        })
      );
  }

  /**
   * Reprocess an existing policy PDF with AI service
   */
  reprocessPolicy(policyId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/process-existing-policy/${policyId}`, {})
      .pipe(
        map(response => response.data),
        tap(() => {
          this.notificationService.showPolicyAIProcessing('Policy');
        }),
        catchError(error => {
          const errorMessage = error.error?.message || 'Failed to reprocess policy';
          this.notificationService.showError(errorMessage);
          return throwError(() => error);
        })
      );
  }

  // New methods for multi-level summaries
  /**
   * Get AI summary for a policy at specific level
   */
  getPolicySummaryByLevel(policyId: string, level: SummaryLevel): Observable<SummaryLevelResponse> {
    return this.http.get<any>(`${this.apiUrl}/policy/${policyId}/summary/${level}`)
      .pipe(
        map(response => response.data),
        catchError(error => {
          const errorMessage = error.error?.message || `Failed to get ${level} summary`;
          this.notificationService.showError(errorMessage);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get summary information for all levels of a policy
   */
  getPolicySummaryInfo(policyId: string): Observable<PolicySummaryInfo> {
    return this.http.get<any>(`${this.apiUrl}/policy/${policyId}/summary-info`)
      .pipe(
        map(response => response.data),
        catchError(error => {
          const errorMessage = error.error?.message || 'Failed to get summary info';
          this.notificationService.showError(errorMessage);
          return throwError(() => error);
        })
      );
  }

  /**
   * Regenerate AI summary for a policy at specific level
   */
  regeneratePolicySummary(policyId: string, level: SummaryLevel): Observable<SummaryLevelResponse> {
    return this.http.post<any>(`${this.apiUrl}/policy/${policyId}/regenerate-summary`, { level })
      .pipe(
        map(response => response.data),
        tap(() => {
          this.notificationService.showSuccess(`${level} summary regenerated successfully`);
        }),
        catchError(error => {
          const errorMessage = error.error?.message || `Failed to regenerate ${level} summary`;
          this.notificationService.showError(errorMessage);
          return throwError(() => error);
        })
      );
  }

  // Compliance Checking Methods
  /**
   * Check policy compliance against specified regulation framework
   */
  checkCompliance(request: ComplianceRequest): Observable<ComplianceResponse> {
    return this.http.post<ComplianceResponse>(`${this.apiUrl}/compliance/check`, request)
      .pipe(
        map((response: any): ComplianceResponse => {
          // Handle the backend response format
          if (response && typeof response === 'object' && 'data' in response) {
            return response.data;
          }
          return response;
        }),
        catchError(error => {
          console.error('Compliance check error:', error);
          const errorMessage = error.error?.message || 'Failed to check compliance';
          this.notificationService.showError(errorMessage);
          return throwError(() => error);
        })
      );
  }

  refreshCompliance(request: ComplianceRequest): Observable<ComplianceResponse> {
    return this.http.post<ComplianceResponse>(`${this.apiUrl}/compliance/refresh`, request)
      .pipe(
        map((response: any): ComplianceResponse => {
          // Handle the backend response format
          if (response && typeof response === 'object' && 'data' in response) {
            return response.data;
          }
          return response;
        }),
        catchError(error => {
          console.error('Compliance refresh error:', error);
          const errorMessage = error.error?.message || 'Failed to refresh compliance';
          this.notificationService.showError(errorMessage);
          return throwError(() => error);
        })
      );
  }

  /**
   * Check compliance from uploaded file
   */
  checkComplianceFromFile(
    file: File, 
    policyId: string, 
    userId: string, 
    regulationFramework: string = 'insurance_standards'
  ): Observable<ComplianceResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('policy_id', policyId);
    formData.append('user_id', userId);
    formData.append('regulation_framework', regulationFramework);

    return this.http.post<ComplianceResponse>(`${this.apiUrl}/compliance/check-file`, formData)
      .pipe(
        map((response: any): ComplianceResponse => {
          // Handle the backend response format
          if (response && typeof response === 'object' && 'data' in response) {
            return response.data;
          }
          return response;
        }),
        catchError(error => {
          console.error('Compliance check from file error:', error);
          const errorMessage = error.error?.message || 'Failed to check compliance from file';
          this.notificationService.showError(errorMessage);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get available regulation frameworks
   */
  getAvailableRegulations(): Observable<{ success: boolean; regulations: Record<string, string>; message: string }> {
    return this.http.get<{ success: boolean; regulations: Record<string, string>; message: string }>(`${this.apiUrl}/compliance/regulations`)
      .pipe(
        catchError(error => {
          console.error('Failed to get regulations from backend:', error);
          // Return fallback regulations if the backend call fails
          return of({
            success: true,
            regulations: {
              'insurance_standards': 'General Insurance Standards',
              'gdpr': 'General Data Protection Regulation (GDPR)',
              'ccpa': 'California Consumer Privacy Act (CCPA)',
              'hipaa': 'Health Insurance Portability and Accountability Act (HIPAA)',
              'sox': 'Sarbanes-Oxley Act (SOX)',
              'pci_dss': 'Payment Card Industry Data Security Standard (PCI DSS)'
            },
            message: 'Using fallback regulations'
          });
        })
      );
  }

  /**
   * Get regulation information as structured data
   */
  getRegulationInfo(): Observable<RegulationInfo[]> {
    return this.getAvailableRegulations().pipe(
      map(response => {
        const regulations = response?.regulations || {};
        return Object.entries(regulations).map(([key, name]) => ({
          key,
          name,
          description: this.getRegulationDescription(key)
        }));
      })
    );
  }

  // Language Detection and Translation Methods
  detectLanguage(text: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/detect-language`, { text })
      .pipe(
        map((response: any): any => {
          if (response && typeof response === 'object' && 'data' in response) {
            return response.data;
          }
          return response;
        }),
        catchError(error => {
          console.error('Language detection error:', error);
          const errorMessage = error.error?.message || 'Failed to detect language';
          this.notificationService.showError(errorMessage);
          return throwError(() => error);
        })
      );
  }

  translateText(text: string, targetLanguage: string, sourceLanguage: string = 'auto'): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/translate`, {
      text,
      target_language: targetLanguage,
      source_language: sourceLanguage
    })
      .pipe(
        map((response: any): any => {
          if (response && typeof response === 'object' && 'data' in response) {
            return response.data;
          }
          return response;
        }),
        catchError(error => {
          console.error('Translation error:', error);
          const errorMessage = error.error?.message || 'Failed to translate text';
          this.notificationService.showError(errorMessage);
          return throwError(() => error);
        })
      );
  }

  getSupportedLanguages(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/supported-languages`)
      .pipe(
        map((response: any): any => {
          if (response && typeof response === 'object' && 'data' in response) {
            return response.data;
          }
          return response;
        }),
        catchError(error => {
          console.error('Failed to get supported languages:', error);
          // Return fallback languages
          return of({
            success: true,
            languages: {
              'en': 'English',
              'es': 'Español',
              'fr': 'Français',
              'de': 'Deutsch',
              'it': 'Italiano',
              'pt': 'Português',
              'ru': 'Русский',
              'zh': '中文',
              'ja': '日本語',
              'ko': '한국어',
              'ar': 'العربية',
              'hi': 'हिन्दी'
            },
            message: 'Using fallback languages'
          });
        })
      );
  }

  private getRegulationDescription(key: string): string {
    const descriptions: Record<string, string> = {
      'insurance_standards': 'General insurance policy compliance standards',
      'gdpr': 'European General Data Protection Regulation for data privacy',
      'ccpa': 'California Consumer Privacy Act for consumer data rights',
      'hipaa': 'Health Insurance Portability and Accountability Act for healthcare data',
      'sox': 'Sarbanes-Oxley Act for financial reporting compliance',
      'pci_dss': 'Payment Card Industry Data Security Standard for payment data'
    };
    return descriptions[key] || 'Compliance framework for policy analysis';
  }
}