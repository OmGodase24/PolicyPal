import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { DLPService, DLPScanRequest, DLPScanResult, DLPViolation, DLPScanResponse } from '@core/services/dlp.service';
import { RewardService } from '@core/services/reward.service';
import { ConfigService } from '@core/services/config.service';
import { ThemeService } from '@core/services/theme.service';

@Component({
  selector: 'app-dlp-scan',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="dlp-scan-container" [class.dark]="isDarkMode()">
      <div class="dlp-header">
        <h3>{{ 'dlp.privacyCheckTitle' | translate }}</h3>
        <p class="dlp-description">{{ 'dlp.privacyCheckDescription' | translate }}</p>
      </div>

      <div class="dlp-actions">
        <button 
          class="btn btn-primary"
          [disabled]="isScanning"
          (click)="startScan()">
          <i class="fas fa-shield-alt" *ngIf="!isScanning"></i>
          <i class="fas fa-spinner fa-spin" *ngIf="isScanning"></i>
          {{ isScanning ? ('dlp.scanning' | translate) : ('dlp.startPrivacyCheck' | translate) }}
        </button>
      </div>

      <!-- Scan Results -->
      <div class="dlp-results" *ngIf="scanResult">
        <div class="scan-summary" [ngClass]="getSummaryClass()" [class.dark]="isDarkMode()">
          <div class="summary-header">
            <h4>{{ 'dlp.privacyCheckResults' | translate }}</h4>
            <span class="risk-badge" [ngClass]="getRiskClass()">
              {{ 'dlp.' + getRiskLevel() + 'Risk' | translate }}
            </span>
          </div>
          
          <div class="summary-stats" [class.dark]="isDarkMode()">
            <div class="stat" [class.dark]="isDarkMode()">
              <span class="stat-value">{{ scanResult.violations.length }}</span>
              <span class="stat-label">{{ 'dlp.issuesFound' | translate }}</span>
            </div>
            <div class="stat" [class.dark]="isDarkMode()">
              <span class="stat-value">{{ getRiskScorePercentage() }}%</span>
              <span class="stat-label">{{ 'dlp.riskLevel' | translate }}</span>
            </div>
            <div class="stat" [class.dark]="isDarkMode()">
              <span class="stat-value">{{ scanResult.sensitivityLevel }}</span>
              <span class="stat-label">{{ 'dlp.privacyLevel' | translate }}</span>
            </div>
          </div>

          <div class="publish-status" [ngClass]="scanResult.isSafeToPublish ? 'safe' : 'unsafe'">
            <i class="fas" [ngClass]="scanResult.isSafeToPublish ? 'fa-check-circle' : 'fa-exclamation-triangle'"></i>
            <span>{{ scanResult.isSafeToPublish ? ('dlp.safeToPublishStatus' | translate) : ('dlp.reviewBeforePublishing' | translate) }}</span>
          </div>
        </div>

        <!-- Violations List -->
        <div class="violations-section" *ngIf="scanResult.violations.length > 0">
          <h5>{{ 'dlp.whatWeFound' | translate }}</h5>
          <div class="violations-list">
            <div class="violation-item" *ngFor="let violation of scanResult.violations; trackBy: trackViolation">
              <div class="violation-header">
                <span class="violation-type">{{ violation.type }}</span>
                <span class="violation-severity" [ngClass]="getSeverityClass(violation.severity)">
                  {{ violation.severity }}
                </span>
              </div>
              <div class="violation-details">
                <p class="violation-description">{{ violation.description }}</p>
                <p class="violation-data"><strong>{{ 'dlp.detectedData' | translate }}:</strong> {{ violation.detectedData }}</p>
                <p class="violation-location"><strong>{{ 'dlp.location' | translate }}:</strong> {{ violation.location }}</p>
                <p class="violation-recommendation"><strong>{{ 'dlp.recommendation' | translate }}:</strong> {{ violation.recommendation }}</p>
                <div class="violation-confidence">
                  <span>{{ 'dlp.confidence' | translate }}: {{ (violation.confidence * 100).toFixed(0) }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recommendations -->
        <div class="recommendations-section" *ngIf="scanResult.recommendations.length > 0">
          <h5>{{ 'dlp.whatYouShouldDo' | translate }}</h5>
          <ul class="recommendations-list">
            <li *ngFor="let recommendation of scanResult.recommendations">
              {{ recommendation }}
            </li>
          </ul>
        </div>

        <!-- Actions -->
        <div class="dlp-actions-footer">
          <button 
            class="btn btn-secondary"
            (click)="closeResults()">
            {{ 'dlp.close' | translate }}
          </button>
        </div>
      </div>

      <!-- Error Message -->
      <div class="dlp-error" *ngIf="errorMessage">
        <div class="error-content">
          <i class="fas fa-exclamation-circle"></i>
          <span>{{ errorMessage }}</span>
        </div>
        <button class="btn btn-sm btn-outline-secondary" (click)="clearError()">
          {{ 'dlp.dismiss' | translate }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dlp-scan-container {
      padding: 1.5rem;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border-primary);
      border-radius: 8px;
      margin: 1rem 0;
    }

    .dlp-header h3 {
      margin: 0 0 0.5rem 0;
      color: var(--color-text-primary);
    }

    .dlp-description {
      color: var(--color-text-secondary);
      margin-bottom: 1.5rem;
    }

    .dlp-actions {
      margin-bottom: 1.5rem;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--color-primary);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #1d4ed8;
    }

    .btn-primary:disabled {
      background: var(--color-text-tertiary);
      cursor: not-allowed;
    }

    .btn-secondary {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
      border: 1px solid var(--color-border-primary);
    }

    .btn-secondary:hover {
      background: var(--color-text-secondary);
      color: var(--color-bg-primary);
    }

    .btn-outline-secondary {
      background: transparent;
      color: var(--color-text-secondary);
      border: 1px solid var(--color-border-primary);
    }

    .btn-outline-secondary:hover {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
    }

    .dlp-results {
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border-primary);
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 2px 4px var(--color-shadow);
    }

    .scan-summary {
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      position: relative;
      overflow: hidden;
    }

    /* Clean dark mode without glow effects */

    .scan-summary.safe {
      background: #d4edda;
      border: 1px solid #c3e6cb;
    }

    .scan-summary.warning {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
    }

    .scan-summary.danger {
      background: #f8d7da;
      border: 1px solid #f5c6cb;
    }

    /* Dark mode scan summary - use consistent theme colors */
    .dark .scan-summary.safe {
      background: var(--color-bg-secondary) !important;
      border: 1px solid var(--color-border-primary) !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
    }

    .dark .scan-summary.warning {
      background: var(--color-bg-secondary) !important;
      border: 1px solid var(--color-border-primary) !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
    }

    .dark .scan-summary.danger {
      background: var(--color-bg-secondary) !important;
      border: 1px solid var(--color-border-primary) !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
    }

    /* Override any other background colors - use theme colors */
    .dark .scan-summary {
      background: var(--color-bg-secondary) !important;
    }

    /* Force consistent background with maximum specificity */
    .dlp-scan-container .dark .scan-summary {
      background: var(--color-bg-secondary) !important;
    }

    .dlp-scan-container .dark .scan-summary.safe,
    .dlp-scan-container .dark .scan-summary.warning,
    .dlp-scan-container .dark .scan-summary.danger {
      background: var(--color-bg-secondary) !important;
    }

    /* Dark mode text within scan summary - use theme colors */
    .dark .scan-summary h4 {
      color: var(--color-text-primary) !important;
      font-weight: 700 !important;
      font-size: 1.25rem !important;
    }

    .dark .scan-summary .stat-value {
      color: var(--color-text-primary) !important;
      font-weight: 800 !important;
      font-size: 2rem !important;
      line-height: 1.2 !important;
    }

    .dark .scan-summary .stat-label {
      color: var(--color-text-secondary) !important;
      font-weight: 600 !important;
      font-size: 0.9rem !important;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .dark .scan-summary .publish-status {
      color: var(--color-text-primary) !important;
      font-weight: 700 !important;
      font-size: 1rem !important;
    }

    /* Clean dark mode risk badges */
    .dark .risk-badge.low {
      background: #10b981;
      color: #ffffff;
      font-weight: 700;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
      font-size: 0.9rem !important;
      padding: 0.5rem 1rem !important;
    }

    .dark .risk-badge.medium {
      background: #f59e0b;
      color: #ffffff;
      font-weight: 700;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
      font-size: 0.9rem !important;
      padding: 0.5rem 1rem !important;
    }

    .dark .risk-badge.high {
      background: #ef4444;
      color: #ffffff;
      font-weight: 700;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
      font-size: 0.9rem !important;
      padding: 0.5rem 1rem !important;
    }

    .summary-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .summary-header h4 {
      margin: 0;
      color: var(--color-text-primary);
    }

    .risk-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .risk-badge.low {
      background: #d4edda;
      color: #155724;
    }

    .risk-badge.medium {
      background: #fff3cd;
      color: #856404;
    }

    .risk-badge.high {
      background: #f8d7da;
      color: #721c24;
    }

    /* Dark mode risk badges */
    .dark .risk-badge.low {
      background: #2d5a3d;
      color: #a7f3d0;
    }

    .dark .risk-badge.medium {
      background: #6b5a2a;
      color: #fcd34d;
    }

    .dark .risk-badge.high {
      background: #6b2a2a;
      color: #fca5a5;
    }

    .summary-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }

    /* Enhanced dark mode summary stats - use theme colors */
    .dark .summary-stats {
      background: var(--color-bg-primary) !important;
      border-radius: 8px;
      padding: 1rem;
      border: 1px solid var(--color-border-primary) !important;
    }

    .stat {
      text-align: center;
    }

    .stat-value {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text-primary);
    }

    .stat-label {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }

    /* Enhanced dark mode stat elements - use theme colors */
    .dark .stat {
      background: var(--color-bg-secondary) !important;
      border-radius: 6px;
      padding: 0.75rem;
      border: 1px solid var(--color-border-primary) !important;
    }

    .dark .stat-value {
      color: var(--color-text-primary) !important;
      font-size: 2rem !important;
      font-weight: 800 !important;
    }

    .dark .stat-label {
      color: var(--color-text-secondary) !important;
      font-size: 0.8rem !important;
      font-weight: 600 !important;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .publish-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      border-radius: 6px;
      font-weight: 600;
    }

    .publish-status.safe {
      background: #d4edda;
      color: #155724;
    }

    .publish-status.unsafe {
      background: #f8d7da;
      color: #721c24;
    }

    /* Enhanced dark mode publish status */
    .dark .publish-status.safe {
      background: #10b981;
      color: #ffffff;
      font-weight: 700;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
      box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
    }

    .dark .publish-status.unsafe {
      background: #ef4444;
      color: #ffffff;
      font-weight: 700;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
      box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
    }

    .violations-section {
      margin-bottom: 1.5rem;
    }

    .violations-section h5 {
      color: var(--color-text-primary);
      margin-bottom: 1rem;
    }

    .violations-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .violation-item {
      border: 1px solid var(--color-border-primary);
      border-radius: 6px;
      padding: 1rem;
      background: var(--color-bg-secondary);
    }

    .violation-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .violation-type {
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .violation-severity {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .violation-severity.critical {
      background: #f8d7da;
      color: #721c24;
    }

    .violation-severity.high {
      background: #f8d7da;
      color: #721c24;
    }

    .violation-severity.medium {
      background: #fff3cd;
      color: #856404;
    }

    .violation-severity.low {
      background: #d4edda;
      color: #155724;
    }

    .violation-details p {
      margin: 0.5rem 0;
      font-size: 0.875rem;
      color: var(--color-text-primary);
    }

    .violation-confidence {
      margin-top: 0.5rem;
      font-size: 0.75rem;
      color: var(--color-text-secondary);
    }

    .recommendations-section {
      margin-bottom: 1.5rem;
    }

    .recommendations-section h5 {
      color: var(--color-text-primary);
      margin-bottom: 1rem;
    }

    .recommendations-list {
      list-style: none;
      padding: 0;
    }

    .recommendations-list li {
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--color-border-primary);
      color: var(--color-text-primary);
    }

    .recommendations-list li:last-child {
      border-bottom: none;
    }

    .dlp-actions-footer {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
    }

    .dlp-error {
      background: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 6px;
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .error-content {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #721c24;
    }

    /* Dark mode support */
    .dark .dlp-scan-container {
      background: var(--color-bg-secondary);
      border-color: var(--color-border-primary);
    }

    .dark .dlp-results {
      background: var(--color-bg-primary);
      border-color: var(--color-border-primary);
    }

    .dark .violation-item {
      background: var(--color-bg-secondary);
      border-color: var(--color-border-primary);
    }

    .dark .dlp-error {
      background: #2d1b1b;
      border-color: #4a1e1e;
    }

    .dark .error-content {
      color: #fca5a5;
    }

    @media (max-width: 768px) {
      .summary-stats {
        grid-template-columns: 1fr;
      }
      
      .dlp-actions-footer {
        flex-direction: column;
      }
    }
  `]
})
export class DLPScanComponent implements OnInit {
  @Input() policyText: string = '';
  @Input() policyId: string = '';
  @Input() userId: string = '';
  @Output() scanComplete = new EventEmitter<DLPScanResult>();

  isScanning = false;
  scanResult: DLPScanResult | null = null;
  errorMessage: string = '';

  constructor(
    private dlpService: DLPService,
    private configService: ConfigService,
    private rewardService: RewardService,
    private themeService: ThemeService
  ) {}

  ngOnInit() {
    // Check if DLP is enabled
    if (!this.dlpService.isEnabled()) {
      console.log('DLP scanning is disabled');
    }
  }

  isDarkMode(): boolean {
    return this.themeService.currentTheme === 'dark';
  }

  startScan() {
    if (!this.policyText || !this.policyId || !this.userId) {
      this.errorMessage = 'Missing required information for DLP scan';
      return;
    }

    this.isScanning = true;
    this.errorMessage = '';
    this.scanResult = null;

    const request: DLPScanRequest = {
      policyText: this.policyText,
      policyId: this.policyId,
      userId: this.userId
    };

    this.dlpService.scanPolicyContent(request).subscribe({
      next: (response: DLPScanResponse) => {
        this.isScanning = false;
        if (response.success) {
          this.scanResult = response.scanResult;
          this.scanComplete.emit(this.scanResult);

          // Record reward: DLP scan completed
          this.rewardService.recordActivity({
            type: 'dlp_scan',
            name: 'dlp_scan',
            points: 10,
            metadata: { policyId: this.policyId, violations: this.scanResult?.violations?.length || 0 }
          }).subscribe({ next: () => {}, error: () => {} });
        } else {
          this.errorMessage = response.message || 'DLP scan failed';
        }
      },
      error: (error: any) => {
        this.isScanning = false;
        this.errorMessage = error.message || 'DLP scan failed';
      }
    });
  }

  getSummaryClass(): string {
    if (!this.scanResult) return '';
    
    if (this.scanResult.isSafeToPublish) return 'safe';
    if (this.scanResult.riskScore < 0.5) return 'warning';
    return 'danger';
  }

  getRiskClass(): string {
    if (!this.scanResult) return '';
    
    if (this.scanResult.riskScore < 0.3) return 'low';
    if (this.scanResult.riskScore < 0.7) return 'medium';
    return 'high';
  }

  getRiskLevel(): string {
    if (!this.scanResult) return '';
    
    if (this.scanResult.riskScore < 0.3) return 'low';
    if (this.scanResult.riskScore < 0.7) return 'medium';
    return 'high';
  }

  getSeverityClass(severity: string): string {
    return severity.toLowerCase();
  }

  getRiskScorePercentage(): string {
    if (!this.scanResult || this.scanResult.riskScore === undefined || this.scanResult.riskScore === null) {
      return '0';
    }
    
    const percentage = this.scanResult.riskScore * 100;
    return isNaN(percentage) ? '0' : percentage.toFixed(0);
  }

  closeResults() {
    this.scanResult = null;
  }


  clearError() {
    this.errorMessage = '';
  }

  trackViolation(index: number, violation: DLPViolation): any {
    return violation.type + violation.detectedData;
  }
}
