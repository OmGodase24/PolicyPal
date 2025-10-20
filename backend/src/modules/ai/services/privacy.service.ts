import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PrivacyImpactAssessmentRequest {
  policyText: string;
  policyId: string;
  userId: string;
}

export interface PrivacyImpactAssessmentResponse {
  success: boolean;
  piaResult: {
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
  };
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

@Injectable()
export class PrivacyService {
  private readonly logger = new Logger(PrivacyService.name);
  private readonly aiServiceUrl: string;

  constructor(private configService: ConfigService) {
    this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8000');
  }

  async conductPrivacyImpactAssessment(request: PrivacyImpactAssessmentRequest): Promise<PrivacyImpactAssessmentResponse> {
    try {
      this.logger.log(`Conducting PIA for policy ${request.policyId}`);

      const formData = new FormData();
      formData.append('policy_text', request.policyText);
      formData.append('policy_id', request.policyId);
      formData.append('user_id', request.userId);

      const response = await fetch(`${this.aiServiceUrl}/privacy/impact-assessment`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`PIA failed: ${response.statusText}`);
      }

      const result = await response.json();
      this.logger.log(`PIA completed for policy ${request.policyId}: Risk level ${result.piaResult.riskLevel}`);
      
      return result;
    } catch (error) {
      this.logger.error(`Error conducting PIA: ${error.message}`);
      throw new Error(`PIA failed: ${error.message}`);
    }
  }

  async generatePrivacyPolicyTemplate(
    dataCategories: string[],
    processingPurposes: string[],
    legalBasis: string[]
  ): Promise<{ success: boolean; template: string; message: string }> {
    try {
      this.logger.log('Generating privacy policy template');

      const formData = new FormData();
      formData.append('data_categories', JSON.stringify(dataCategories));
      formData.append('processing_purposes', JSON.stringify(processingPurposes));
      formData.append('legal_basis', JSON.stringify(legalBasis));

      const response = await fetch(`${this.aiServiceUrl}/privacy/generate-policy-template`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Template generation failed: ${response.statusText}`);
      }

      const result = await response.json();
      this.logger.log('Privacy policy template generated successfully');
      
      return result;
    } catch (error) {
      this.logger.error(`Error generating privacy policy template: ${error.message}`);
      throw new Error(`Template generation failed: ${error.message}`);
    }
  }

  async createConsentRecord(request: ConsentRecordRequest): Promise<any> {
    try {
      this.logger.log(`Creating consent record for user ${request.userId}`);

      const formData = new FormData();
      formData.append('user_id', request.userId);
      formData.append('policy_id', request.policyId);
      formData.append('consent_type', request.consentType);
      formData.append('purpose', request.purpose);
      formData.append('legal_basis', request.legalBasis);
      formData.append('evidence', request.evidence);

      const response = await fetch(`${this.aiServiceUrl}/privacy/consent-record`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Consent record creation failed: ${response.statusText}`);
      }

      const result = await response.json();
      this.logger.log(`Consent record created: ${result.consent_record.consent_id}`);
      
      return result;
    } catch (error) {
      this.logger.error(`Error creating consent record: ${error.message}`);
      throw new Error(`Consent record creation failed: ${error.message}`);
    }
  }

  async processDataSubjectRequest(request: DataSubjectRequestRequest): Promise<any> {
    try {
      this.logger.log(`Processing data subject request for user ${request.userId}`);

      const formData = new FormData();
      formData.append('user_id', request.userId);
      formData.append('request_type', request.requestType);
      formData.append('description', request.description);

      const response = await fetch(`${this.aiServiceUrl}/privacy/data-subject-request`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Data subject request processing failed: ${response.statusText}`);
      }

      const result = await response.json();
      this.logger.log(`Data subject request processed: ${result.data_subject_request.request_id}`);
      
      return result;
    } catch (error) {
      this.logger.error(`Error processing data subject request: ${error.message}`);
      throw new Error(`Data subject request processing failed: ${error.message}`);
    }
  }
}
