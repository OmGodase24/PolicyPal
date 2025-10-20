import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CreateInviteRequest {
  email: string;
  message?: string;
  expiresAt?: string;
}

export interface InviteResponse {
  success: boolean;
  message: string;
  invite?: {
    token: string;
    email: string;
    expiresAt: string;
    inviteLink: string;
  };
}

export interface ValidateInviteResponse {
  success: boolean;
  valid: boolean;
  invite?: {
    email: string;
    invitedBy: string;
    expiresAt: string;
    message?: string;
  };
  message?: string;
}

export interface UseInviteRequest {
  token: string;
  name: string;
  password: string;
  confirmPassword?: string;
}

export interface UseInviteResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface InviteListResponse {
  invites: Array<{
    id: string;
    email: string;
    invitedBy: string;
    status: string;
    createdAt: string;
    expiresAt: string;
    usedAt?: string;
  }>;
  total: number;
  pending: number;
  used: number;
  expired: number;
}

@Injectable({
  providedIn: 'root'
})
export class InviteService {
  private apiUrl = `${environment.apiUrl}/invites`;
  private publicApiUrl = `${environment.apiUrl}/public/invites`;

  constructor(private http: HttpClient) {}

  createInvite(request: CreateInviteRequest): Observable<InviteResponse> {
    return this.http.post<InviteResponse>(this.apiUrl, request);
  }

  validateInvite(token: string): Observable<ValidateInviteResponse> {
    return this.http.get<ValidateInviteResponse>(`${this.publicApiUrl}/validate/${token}`);
  }

  useInvite(request: UseInviteRequest): Observable<UseInviteResponse> {
    return this.http.post<UseInviteResponse>(`${this.publicApiUrl}/use`, request);
  }

  getInvites(page: number = 1, limit: number = 10): Observable<InviteListResponse> {
    return this.http.get<InviteListResponse>(`${this.apiUrl}?page=${page}&limit=${limit}`);
  }

  resendInvite(inviteId: string): Observable<InviteResponse> {
    return this.http.post<InviteResponse>(`${this.apiUrl}/${inviteId}/resend`, {});
  }

  cancelInvite(inviteId: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/${inviteId}/cancel`, {});
  }
}
