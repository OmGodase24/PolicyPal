import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AnalysisHistory {
  id: string;
  timestamp: string;
  imageCount: number;
  isPolicyRelated: boolean;
  policyType: string;
  analysisTime: string;
}

export interface AnalysisPatterns {
  commonPolicyTypes: Array<{
    type: string;
    frequency: number;
    avgConfidence: number;
  }>;
  validationSuccessRate: number;
  commonIssues: string[];
  recommendations: string[];
}

export interface AnalysisHistoryResponse {
  success: boolean;
  history: AnalysisHistory[];
  totalAnalyses: number;
  successRate: number;
  error?: string;
}

export interface AnalysisPatternsResponse {
  success: boolean;
  patterns: AnalysisPatterns;
  lastUpdated: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImageAnalysisCacheService {
  private apiUrl = '/api/ai/image-analysis';

  constructor(private http: HttpClient) {}

  getAnalysisHistory(userId: string): Observable<AnalysisHistoryResponse> {
    return this.http.get<AnalysisHistoryResponse>(`${this.apiUrl}/history/${userId}`);
  }

  getAnalysisPatterns(userId: string): Observable<AnalysisPatternsResponse> {
    return this.http.get<AnalysisPatternsResponse>(`${this.apiUrl}/patterns/${userId}`);
  }
}
