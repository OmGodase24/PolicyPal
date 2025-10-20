import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ConfigService } from './config.service';

export interface PrivacyImpactAssessmentRequest {
  policyText: string;
  policyId: string;
  userId: string;
}

export interface PIAResult {
  policyId: string;
  userId: string;
  assessmentDate: string;
  dataCategories: string[];
  processingPurposes: string[];
  legalBasis: string[];
  dataSubjects: string[];
  retentionPeriod?: string;
  riskLevel: string;
  complianceScore: number;
  recommendations: string[];
}

export interface PrivacyImpactAssessmentResponse {
  success: boolean;
  piaResult: PIAResult;
  message: string;
}

export interface ConsentRecordRequest {
  userId: string;
  policyId: string;
  consentType: string;
  purpose: string;
  legalBasis: string;
  evidence: string;
}

export interface DataSubjectRequestRequest {
  userId: string;
  requestType: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class PrivacyService {
  private apiUrl = `${environment.apiUrl}/ai/privacy`;

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {}

  conductPrivacyImpactAssessment(request: PrivacyImpactAssessmentRequest): Observable<PrivacyImpactAssessmentResponse> {
    // Create FormData for the AI service
    const formData = new FormData();
    formData.append('policy_text', request.policyText);
    formData.append('policy_id', request.policyId);
    formData.append('user_id', request.userId);

    // Call AI service directly to avoid payload size limits
    const aiServiceUrl = this.configService.getAIServiceUrl();
    return this.http.post<any>(`${aiServiceUrl}/privacy/impact-assessment`, formData).pipe(
      map(response => this.normalizePrivacyResponse(response))
    );
  }

  generatePrivacyPolicyTemplate(
    dataCategories: string[],
    processingPurposes: string[],
    legalBasis: string[]
  ): Observable<{ success: boolean; template: string; message: string }> {
    return this.http.post<{ success: boolean; template: string; message: string }>(
      `${this.apiUrl}/generate-policy-template`,
      { dataCategories, processingPurposes, legalBasis }
    );
  }

  createConsentRecord(request: ConsentRecordRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/consent-record`, request);
  }

  processDataSubjectRequest(request: DataSubjectRequestRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/data-subject-request`, request);
  }

  isDashboardEnabled(): boolean {
    return this.configService.isPrivacyDashboardEnabled();
  }

  isConsentManagementEnabled(): boolean {
    return this.configService.isConsentManagementEnabled();
  }

  private normalizePrivacyResponse(aiResponse: any): PrivacyImpactAssessmentResponse {
    const piaResult = aiResponse.pia_result || aiResponse.piaResult;
    
    return {
      success: aiResponse.success,
      piaResult: {
        policyId: piaResult.policy_id || piaResult.policyId,
        userId: piaResult.user_id || piaResult.userId,
        assessmentDate: piaResult.assessment_date || piaResult.assessmentDate,
        dataCategories: piaResult.data_categories || piaResult.dataCategories || [],
        processingPurposes: piaResult.processing_purposes || piaResult.processingPurposes || [],
        legalBasis: piaResult.legal_basis || piaResult.legalBasis || [],
        dataSubjects: piaResult.data_subjects || piaResult.dataSubjects || [],
        retentionPeriod: piaResult.retention_period || piaResult.retentionPeriod,
        riskLevel: piaResult.risk_level || piaResult.riskLevel || 'unknown',
        complianceScore: piaResult.compliance_score || piaResult.complianceScore || 0,
        recommendations: piaResult.recommendations || []
      },
      message: aiResponse.message || 'Privacy Impact Assessment completed'
    };
  }
}
