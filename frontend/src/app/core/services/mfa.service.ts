import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface MfaSetupResponse {
  success: boolean;
  qrDataUrl: string;
  manualEntryKey: string;
}

export interface MfaVerifySetupResponse {
  success: boolean;
  backupCodes: string[];
  message: string;
}

export interface MfaStatusResponse {
  success: boolean;
  enabled: boolean;
}

export interface MfaRegenerateResponse {
  success: boolean;
  backupCodes: string[];
  message: string;
}

export interface MfaDisableResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class MfaService {
  private apiUrl = `${environment.apiUrl}/mfa`;

  constructor(private http: HttpClient) {}

  setup(): Observable<MfaSetupResponse> {
    return this.http.post<MfaSetupResponse>(`${this.apiUrl}/setup`, {});
  }

  verifySetup(code: string, tempSecret?: string): Observable<MfaVerifySetupResponse> {
    return this.http.post<MfaVerifySetupResponse>(`${this.apiUrl}/verify-setup`, { code, tempSecret });
  }

  disable(password: string, code: string): Observable<MfaDisableResponse> {
    return this.http.post<MfaDisableResponse>(`${this.apiUrl}/disable`, { password, code });
  }

  regenerateBackupCodes(): Observable<MfaRegenerateResponse> {
    return this.http.post<MfaRegenerateResponse>(`${this.apiUrl}/backup-codes/regenerate`, {});
  }

  getStatus(): Observable<MfaStatusResponse> {
    return this.http.post<MfaStatusResponse>(`${this.apiUrl}/status`, {});
  }
}
