import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ConfigService } from './config.service';

export interface DLPScanRequest {
  policyText: string;
  policyId: string;
  userId: string;
  customPatterns?: string[];
}

export interface DLPViolation {
  type: string;
  severity: string;
  description: string;
  detectedData: string;
  location: string;
  recommendation: string;
  confidence: number;
}

export interface DLPScanResult {
  policyId: string;
  userId: string;
  scanTimestamp: string;
  sensitivityLevel: string;
  violations: DLPViolation[];
  riskScore: number;
  isSafeToPublish: boolean;
  recommendations: string[];
}

export interface DLPScanResponse {
  success: boolean;
  scanResult: DLPScanResult;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class DLPService {
  private apiUrl = `${environment.apiUrl}/ai/dlp`;

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {}

  scanPolicyContent(request: DLPScanRequest): Observable<DLPScanResponse> {
    // Use the backend API instead of calling AI service directly
    // This ensures proper authentication and error handling
    return this.http.post<DLPScanResponse>(`${this.apiUrl}/scan`, request).pipe(
      map(response => this.normalizeResponse(response))
    );
  }

  private normalizeResponse(aiResponse: any): DLPScanResponse {
    const scanResult = aiResponse.scan_result || aiResponse.scanResult;
    
    return {
      success: aiResponse.success,
      scanResult: {
        policyId: scanResult.policy_id || scanResult.policyId,
        userId: scanResult.user_id || scanResult.userId,
        scanTimestamp: scanResult.scan_timestamp || scanResult.scanTimestamp,
        sensitivityLevel: scanResult.sensitivity_level || scanResult.sensitivityLevel,
        violations: (scanResult.violations || []).map((v: any) => ({
          type: v.type,
          severity: v.severity,
          description: v.description,
          detectedData: v.detected_data || v.detectedData,
          location: v.location,
          recommendation: v.recommendation,
          confidence: v.confidence
        })),
        riskScore: scanResult.risk_score || scanResult.riskScore,
        isSafeToPublish: scanResult.is_safe_to_publish || scanResult.isSafeToPublish,
        recommendations: scanResult.recommendations || []
      },
      message: aiResponse.message
    };
  }

  isEnabled(): boolean {
    return this.configService.isDLPEnabled();
  }

  isAutoScanEnabled(): boolean {
    return this.configService.isDLPAutoScanEnabled();
  }
}
