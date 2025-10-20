import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface MfaVerifyResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: any;
}

@Injectable({
  providedIn: 'root'
})
export class MfaVerificationService {
  private apiUrl = `${environment.apiUrl}/auth/mfa`;

  constructor(private http: HttpClient) {}

  verifyTotp(code: string, mfaToken: string): Observable<MfaVerifyResponse> {
    return this.http.post<MfaVerifyResponse>(`${this.apiUrl}/verify`, { code, mfaToken });
  }

  verifyBackupCode(code: string, mfaToken: string): Observable<MfaVerifyResponse> {
    return this.http.post<MfaVerifyResponse>(`${this.apiUrl}/verify-backup`, { code, mfaToken });
  }
}
