import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ApiService } from './api.service';
import { NotificationService } from './notification.service';
import {
  PolicyComparison,
  CreatePolicyComparisonRequest,
  ComparePoliciesRequest,
  PolicyComparisonListResponse,
  PolicyComparisonExportOptions,
} from '../models/policy-comparison.model';

@Injectable({
  providedIn: 'root'
})
export class PolicyComparisonService {
  private readonly endpoint = '/policy-comparisons';

  constructor(
    private apiService: ApiService,
    private notificationService: NotificationService
  ) { }

  /**
   * Create a new policy comparison
   */
  createComparison(request: CreatePolicyComparisonRequest): Observable<PolicyComparison> {
    return this.apiService.post<PolicyComparison>(this.endpoint, request)
      .pipe(
        catchError(error => {
          this.notificationService.showError('Failed to create policy comparison');
          return throwError(() => error);
        })
      );
  }

  /**
   * Compare two specific policies
   */
  comparePolicies(request: ComparePoliciesRequest): Observable<PolicyComparison> {
    return this.apiService.post<PolicyComparison>(this.endpoint, request)
      .pipe(
        catchError(error => {
          this.notificationService.showError('Failed to compare policies');
          return throwError(() => error);
        })
      );
  }

  /**
   * Get user's policy comparisons with pagination
   */
  getUserComparisons(page: number = 1, limit: number = 10): Observable<PolicyComparisonListResponse> {
    const params = { page: page.toString(), limit: limit.toString() };
    return this.apiService.get<PolicyComparisonListResponse>(this.endpoint, params)
      .pipe(
        catchError(error => {
          this.notificationService.showError('Failed to load policy comparisons');
          return throwError(() => error);
        })
      );
  }

  /**
   * Get a specific policy comparison by ID
   */
  getComparisonById(comparisonId: string): Observable<PolicyComparison> {
    return this.apiService.get<PolicyComparison>(`${this.endpoint}/${comparisonId}`)
      .pipe(
        catchError(error => {
          this.notificationService.showError('Failed to load policy comparison');
          return throwError(() => error);
        })
      );
  }

  /**
   * Regenerate AI insights for a comparison
   */
  regenerateAIInsights(comparisonId: string): Observable<PolicyComparison> {
    return this.apiService.patch<PolicyComparison>(`${this.endpoint}/${comparisonId}/regenerate-insights`, {})
      .pipe(
        catchError(error => {
          this.notificationService.showError('Failed to regenerate AI insights');
          return throwError(() => error);
        })
      );
  }

  /**
   * Delete a policy comparison
   */
  deleteComparison(comparisonId: string): Observable<void> {
    return this.apiService.delete<void>(`${this.endpoint}/${comparisonId}`)
      .pipe(
        catchError(error => {
          this.notificationService.showError('Failed to delete policy comparison');
          return throwError(() => error);
        })
      );
  }

  /**
   * Export policy comparison
   */
  exportComparison(comparisonId: string, options: PolicyComparisonExportOptions): Observable<Blob> {
    return this.apiService.getBlob(`${this.endpoint}/${comparisonId}/export`)
      .pipe(
        catchError(error => {
          this.notificationService.showError('Failed to export policy comparison');
          return throwError(() => error);
        })
      );
  }

  /**
   * Download comparison as file
   */
  downloadComparison(comparison: PolicyComparison, format: 'pdf' | 'json' = 'pdf'): void {
    const filename = `policy-comparison-${comparison._id}.${format}`;

    if (format === 'json') {
      // For JSON, create and download the data directly
      const dataStr = JSON.stringify(comparison, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      this.downloadBlob(dataBlob, filename);
    } else {
      // For PDF/export, call the backend export endpoint
      const filename = `policy-comparison-${comparison._id}.pdf`;
      this.exportComparison(comparison._id, { format })
        .subscribe({
          next: (blob) => {
            this.downloadBlob(blob, filename);
            this.notificationService.showSuccess('Policy comparison exported as PDF successfully');
          },
          error: (error) => {
            console.error('Export failed:', error);
            this.notificationService.showError('Failed to export policy comparison');
          }
        });
    }
  }

  /**
   * Helper method to download a blob as a file
   */
  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
