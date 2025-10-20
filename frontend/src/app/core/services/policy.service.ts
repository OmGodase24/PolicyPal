import { Injectable } from '@angular/core';
import { Observable, tap, catchError, throwError } from 'rxjs';

import { ApiService } from './api.service';
import { NotificationService } from './notification.service';
import { Policy, CreatePolicyRequest, UpdatePolicyRequest, PolicyStatus, PolicyLifecycle, PolicyLifecycleInfo } from '../models/policy.model';

@Injectable({
  providedIn: 'root'
})
export class PolicyService {
  private readonly endpoint = '/policies';

  constructor(
    private apiService: ApiService,
    private notificationService: NotificationService
  ) {}

  getAllPolicies(status?: PolicyStatus): Observable<Policy[]> {
    const params = status ? { status } : {};
    return this.apiService.get<Policy[]>(this.endpoint, params)
      .pipe(
        catchError(error => {
          this.notificationService.showError('Failed to load policies');
          return throwError(() => error);
        })
      );
  }

  getMyPolicies(): Observable<Policy[]> {
    return this.apiService.get<Policy[]>(`${this.endpoint}/my-policies`)
      .pipe(
        catchError(error => {
          this.notificationService.showError('Failed to load your policies');
          return throwError(() => error);
        })
      );
  }

  getPolicyById(id: string): Observable<Policy> {
    return this.apiService.get<Policy>(`${this.endpoint}/${id}`)
      .pipe(
        catchError(error => {
          this.notificationService.showError('Failed to load policy');
          return throwError(() => error);
        })
      );
  }

  getPolicyPDFUrl(id: string): string {
    return this.apiService.getFullUrl(`${this.endpoint}/${id}/pdf`);
  }

  getPolicyPDFBlob(id: string): Observable<Blob> {
    return this.apiService.getBlob(`${this.endpoint}/${id}/pdf`);
  }

  getPolicyPDFDebug(id: string): Observable<any> {
    return this.apiService.get<any>(`${this.endpoint}/${id}/pdf-debug`);
  }

  // Alias for getPolicyById for consistency
  getPolicy(id: string): Observable<Policy> {
    return this.getPolicyById(id);
  }

  createPolicy(policyData: CreatePolicyRequest): Observable<Policy> {
    return this.apiService.post<Policy>(this.endpoint, policyData)
      .pipe(
        tap(() => {
          const message = policyData.status === 'publish' 
            ? 'Policy created and published successfully!'
            : 'Policy created successfully!';
          this.notificationService.showSuccess(message);
        }),
        catchError(error => {
          this.notificationService.showError('Failed to create policy');
          return throwError(() => error);
        })
      );
  }

  createPolicyWithPDF(formData: FormData): Observable<Policy> {
    return this.apiService.post<Policy>(`${this.endpoint}/with-pdf`, formData)
      .pipe(
        tap(() => {
          // Note: We need to parse the FormData to get the status for dynamic messaging
          // For now, using a generic message
          this.notificationService.showSuccess('Policy created successfully with PDF processing!');
        }),
        catchError(error => {
          this.notificationService.showError('Failed to create policy with PDF');
          return throwError(() => error);
        })
      );
  }

  updatePolicy(id: string, policyData: UpdatePolicyRequest): Observable<Policy> {
    return this.apiService.patch<Policy>(`${this.endpoint}/${id}`, policyData)
      .pipe(
        tap(() => {
          this.notificationService.showSuccess('Policy updated successfully!');
        }),
        catchError(error => {
          this.notificationService.showError('Failed to update policy');
          return throwError(() => error);
        })
      );
  }

  updatePolicyPDF(id: string, pdf: File): Observable<Policy> {
    const formData = new FormData();
    formData.append('pdf', pdf);

    return this.apiService.post<Policy>(`${this.endpoint}/${id}/update-pdf`, formData)
      .pipe(
        tap(() => {
          this.notificationService.showSuccess('Policy PDF updated successfully!');
        }),
        catchError(error => {
          this.notificationService.showError('Failed to update policy PDF');
          return throwError(() => error);
        })
      );
  }

  removePolicyPDF(id: string): Observable<Policy> {
    return this.apiService.delete<Policy>(`${this.endpoint}/${id}/remove-pdf`)
      .pipe(
        tap(() => {
          this.notificationService.showSuccess('Policy PDF removed successfully!');
        }),
        catchError(error => {
          this.notificationService.showError('Failed to remove policy PDF');
          return throwError(() => error);
        })
      );
  }

  retryPDFProcessing(id: string): Observable<Policy> {
    return this.apiService.post<Policy>(`${this.endpoint}/${id}/retry-pdf-processing`, {})
      .pipe(
        tap(() => {
          this.notificationService.showSuccess('PDF processing retry initiated!');
        }),
        catchError(error => {
          this.notificationService.showError('Failed to retry PDF processing');
          return throwError(() => error);
        })
      );
  }

  deletePolicy(id: string): Observable<void> {
    return this.apiService.delete<void>(`${this.endpoint}/${id}`)
      .pipe(
        tap(() => {
          this.notificationService.showSuccess('Policy deleted successfully!');
        }),
        catchError(error => {
          this.notificationService.showError('Failed to delete policy');
          return throwError(() => error);
        })
      );
  }

  publishPolicy(id: string): Observable<Policy> {
    return this.apiService.post<Policy>(`${this.endpoint}/${id}/publish`, { confirmPublish: true })
      .pipe(
        tap(() => {
          this.notificationService.showSuccess('Policy published successfully!');
        }),
        catchError(error => {
          this.notificationService.showError('Failed to publish policy');
          return throwError(() => error);
        })
      );
  }

  canEditPolicy(id: string): Observable<{ canEdit: boolean }> {
    return this.apiService.get<{ canEdit: boolean }>(`${this.endpoint}/${id}/can-edit`);
  }

  canUseAI(id: string): Observable<{ canUseAI: boolean }> {
    return this.apiService.get<{ canUseAI: boolean }>(`${this.endpoint}/${id}/can-use-ai`);
  }

  // Lifecycle management methods
  getPoliciesByLifecycle(lifecycle: PolicyLifecycle): Observable<Policy[]> {
    return this.apiService.get<Policy[]>(`${this.endpoint}/lifecycle/${lifecycle}`)
      .pipe(
        catchError(error => {
          this.notificationService.showError('Failed to load policies by lifecycle');
          return throwError(() => error);
        })
      );
  }

  getLifecycleStats(): Observable<{
    total: number;
    active: number;
    expiringSoon: number;
    expired: number;
    draft: number;
  }> {
    return this.apiService.get<{
      total: number;
      active: number;
      expiringSoon: number;
      expired: number;
      draft: number;
    }>(`${this.endpoint}/stats/lifecycle`)
      .pipe(
        catchError(error => {
          this.notificationService.showError('Failed to load lifecycle statistics');
          return throwError(() => error);
        })
      );
  }

  /**
   * Calculate policy lifecycle based on expiry date
   */
  calculatePolicyLifecycle(policy: Policy): PolicyLifecycleInfo {
    // If no expiry date, consider it active
    if (!policy.expiryDate) {
      return {
        lifecycle: 'active',
        isExpired: false,
        isExpiringSoon: false,
        isActive: true
      };
    }

    const today = new Date();
    const expiryDate = new Date(policy.expiryDate);
    const timeDiff = expiryDate.getTime() - today.getTime();
    const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // Check if policy is expired first (regardless of status)
    if (daysUntilExpiry < 0) {
      return {
        lifecycle: 'expired',
        daysUntilExpiry,
        isExpired: true,
        isExpiringSoon: false,
        isActive: false
      };
    } else if (daysUntilExpiry <= 30) {
      return {
        lifecycle: 'expiring-soon',
        daysUntilExpiry,
        isExpired: false,
        isExpiringSoon: true,
        isActive: false
      };
    } else {
      return {
        lifecycle: 'active',
        daysUntilExpiry,
        isExpired: false,
        isExpiringSoon: false,
        isActive: true
      };
    }
  }

  /**
   * Filter policies by lifecycle state
   */
  filterPoliciesByLifecycle(policies: Policy[], lifecycle: PolicyLifecycle): Policy[] {
    return policies.filter(policy => {
      const lifecycleInfo = this.calculatePolicyLifecycle(policy);
      return lifecycleInfo.lifecycle === lifecycle;
    });
  }

  /**
   * Get policies that are valid for AI features (not expired)
   */
  getValidPoliciesForAI(policies: Policy[]): Policy[] {
    return policies.filter(policy => {
      const lifecycleInfo = this.calculatePolicyLifecycle(policy);
      return policy.status === 'publish' && !lifecycleInfo.isExpired;
    });
  }
}