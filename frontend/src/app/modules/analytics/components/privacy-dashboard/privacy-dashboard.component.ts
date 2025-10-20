import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { PrivacyService, PIAResult, PrivacyImpactAssessmentRequest, PrivacyImpactAssessmentResponse } from '@core/services/privacy.service';
import { RewardService } from '@core/services/reward.service';

@Component({
  selector: 'app-privacy-dashboard',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="privacy-dashboard">
      <div class="dashboard-header">
        <h3>{{ 'privacy.dashboardTitle' | translate }}</h3>
        <p class="dashboard-description">{{ 'privacy.dashboardDescription' | translate }}</p>
        <div class="dashboard-actions" *ngIf="policyId">
          <button 
            class="btn btn-primary refresh-btn" 
            (click)="runPrivacyAssessment()"
            [disabled]="isLoading">
            <i class="fas fa-sync-alt" [class.fa-spin]="isLoading"></i>
            {{ isLoading ? 'Analyzing...' : 'Refresh Assessment' }}
          </button>
        </div>
      </div>

      <div class="privacy-metrics" *ngIf="piaResult">
        <!-- Compliance Score -->
        <div class="metric-card compliance-score">
          <div class="metric-header">
            <h4>{{ 'privacy.complianceScore' | translate }}</h4>
            <span class="score-badge" [ngClass]="getComplianceClass()">
              {{ (piaResult.complianceScore * 100).toFixed(0) }}%
            </span>
          </div>
          <div class="score-bar">
            <div class="score-fill" [style.width.%]="piaResult.complianceScore * 100"></div>
          </div>
        </div>

        <!-- Risk Level -->
        <div class="metric-card risk-level">
          <div class="metric-header">
            <h4>{{ 'privacy.riskLevel' | translate }}</h4>
            <span class="risk-badge" [ngClass]="getRiskClass()">
              {{ piaResult.riskLevel }}
            </span>
          </div>
          <p class="risk-description">{{ getRiskDescription() }}</p>
        </div>

        <!-- Data Categories -->
        <div class="metric-card data-categories">
          <h4>{{ 'privacy.dataCategories' | translate }}</h4>
          <div class="categories-list">
            <span class="category-tag" *ngFor="let category of piaResult.dataCategories">
              {{ category }}
            </span>
            <span class="no-categories" *ngIf="piaResult.dataCategories.length === 0">
              {{ 'privacy.noDataCategories' | translate }}
            </span>
          </div>
        </div>

        <!-- Processing Purposes -->
        <div class="metric-card processing-purposes">
          <h4>{{ 'privacy.processingPurposes' | translate }}</h4>
          <div class="purposes-list">
            <div class="purpose-item" *ngFor="let purpose of piaResult.processingPurposes">
              <i class="fas fa-check-circle"></i>
              <span>{{ purpose }}</span>
            </div>
            <div class="no-purposes" *ngIf="piaResult.processingPurposes.length === 0">
              {{ 'privacy.noProcessingPurposes' | translate }}
            </div>
          </div>
        </div>

        <!-- Legal Basis -->
        <div class="metric-card legal-basis">
          <h4>{{ 'privacy.legalBasis' | translate }}</h4>
          <div class="legal-basis-list">
            <div class="legal-item" *ngFor="let basis of piaResult.legalBasis">
              <i class="fas fa-gavel"></i>
              <span>{{ basis }}</span>
            </div>
            <div class="no-legal-basis" *ngIf="piaResult.legalBasis.length === 0">
              <i class="fas fa-exclamation-triangle"></i>
              {{ 'privacy.noLegalBasis' | translate }}
            </div>
          </div>
        </div>

        <!-- Data Subjects -->
        <div class="metric-card data-subjects">
          <h4>{{ 'privacy.dataSubjects' | translate }}</h4>
          <div class="subjects-list">
            <span class="subject-tag" *ngFor="let subject of piaResult.dataSubjects">
              {{ subject }}
            </span>
            <span class="no-subjects" *ngIf="piaResult.dataSubjects.length === 0">
              {{ 'privacy.noDataSubjects' | translate }}
            </span>
          </div>
        </div>

        <!-- Retention Period -->
        <div class="metric-card retention-period" *ngIf="piaResult.retentionPeriod">
          <h4>{{ 'privacy.retentionPeriod' | translate }}</h4>
          <p class="retention-info">{{ piaResult.retentionPeriod }}</p>
        </div>

        <!-- Recommendations -->
        <div class="metric-card recommendations">
          <h4>{{ 'privacy.recommendations' | translate }}</h4>
          <div class="recommendations-list">
            <div class="recommendation-item" *ngFor="let recommendation of piaResult.recommendations">
              <i class="fas fa-lightbulb"></i>
              <span>{{ recommendation }}</span>
            </div>
            <div class="no-recommendations" *ngIf="piaResult.recommendations.length === 0">
              {{ 'privacy.noRecommendations' | translate }}
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <div class="loading-content">
          <i class="fas fa-spinner fa-spin"></i>
          <h4>Running Privacy Assessment...</h4>
          <p>Analyzing policy "{{ policyId }}" for privacy compliance...</p>
        </div>
      </div>

      <!-- Error State -->
      <div class="error-state" *ngIf="errorMessage && !isLoading">
        <div class="error-content">
          <i class="fas fa-exclamation-triangle"></i>
          <h4>Assessment Failed</h4>
          <p>{{ errorMessage }}</p>
          <button class="btn btn-primary" (click)="runPrivacyAssessment()">
            Try Again
          </button>
        </div>
      </div>

      <!-- No Data State -->
      <div class="no-data-state" *ngIf="!piaResult && !isLoading && !errorMessage">
        <div class="no-data-content">
          <i class="fas fa-shield-alt"></i>
          <h4>{{ 'privacy.noDataTitle' | translate }}</h4>
          <p *ngIf="policyId">No privacy assessment data available for policy "{{ policyId }}". Click below to run an assessment.</p>
          <p *ngIf="!policyId">{{ 'privacy.noDataDescription' | translate }}</p>
          <button 
            class="btn btn-primary" 
            (click)="runPrivacyAssessment()"
            [disabled]="!policyText || !policyId || !userId">
            {{ 'privacy.runAssessment' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .privacy-dashboard {
      padding: 1.5rem;
      background: var(--color-bg-tertiary);
      border-radius: 8px;
      margin: 1rem 0;
      border: 1px solid var(--color-border-primary);
    }

    .dashboard-header h3 {
      margin: 0 0 0.5rem 0;
      color: var(--color-text-primary);
    }

      .dashboard-description {
        color: var(--color-text-secondary);
        margin-bottom: 1rem;
      }

      .dashboard-actions {
        margin-top: 1rem;
        display: flex;
        justify-content: flex-end;
      }

      .refresh-btn {
        background-color: var(--color-primary);
        color: var(--color-text-inverse);
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 5px;
        cursor: pointer;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: background-color 0.3s ease;
      }

      .refresh-btn:hover:not(:disabled) {
        background-color: var(--color-primary-hover);
      }

      .refresh-btn:disabled {
        background-color: var(--color-text-tertiary);
        cursor: not-allowed;
      }

      .refresh-btn i {
        font-size: 0.8rem;
      }

    .privacy-metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .metric-card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border-primary);
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .metric-card h4 {
      margin: 0 0 1rem 0;
      color: var(--color-text-primary);
      font-size: 1.1rem;
    }

    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .score-badge {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-weight: 700;
      font-size: 1.2rem;
    }

    .score-badge.excellent {
      background: var(--color-success-light);
      color: var(--color-success);
    }

    .score-badge.good {
      background: var(--color-info-light);
      color: var(--color-info);
    }

    .score-badge.fair {
      background: var(--color-warning-light);
      color: var(--color-warning);
    }

    .score-badge.poor {
      background: var(--color-danger-light);
      color: var(--color-danger);
    }

    .score-bar {
      width: 100%;
      height: 8px;
      background: var(--color-border-primary);
      border-radius: 4px;
      overflow: hidden;
    }

    .score-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--color-danger) 0%, var(--color-warning) 50%, var(--color-success) 100%);
      transition: width 0.3s ease;
    }

    .risk-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .risk-badge.low {
      background: var(--color-success-light);
      color: var(--color-success);
    }

    .risk-badge.medium {
      background: var(--color-warning-light);
      color: var(--color-warning);
    }

    .risk-badge.high {
      background: var(--color-danger-light);
      color: var(--color-danger);
    }

    .risk-description {
      margin: 0;
      color: var(--color-text-secondary);
      font-size: 0.875rem;
    }

    .categories-list, .subjects-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .category-tag, .subject-tag {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.875rem;
    }

    .purposes-list, .legal-basis-list, .recommendations-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .purpose-item, .legal-item, .recommendation-item {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .purpose-item i, .legal-item i, .recommendation-item i {
      color: var(--color-success);
      margin-top: 0.125rem;
    }

    .legal-item i {
      color: var(--color-primary);
    }

    .recommendation-item i {
      color: var(--color-warning);
    }

    .no-categories, .no-subjects, .no-purposes, .no-legal-basis, .no-recommendations {
      color: var(--color-text-secondary);
      font-style: italic;
      text-align: center;
      padding: 1rem;
    }

    .no-legal-basis {
      color: var(--color-danger);
      background: var(--color-danger-light);
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .retention-info {
      margin: 0;
      color: var(--color-text-primary);
      font-weight: 500;
    }

    .no-data-state, .loading-state, .error-state {
      text-align: center;
      padding: 3rem 1rem;
    }

    .no-data-content, .loading-content, .error-content {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .no-data-content i, .loading-content i, .error-content i {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .no-data-content i {
      color: var(--color-text-tertiary);
    }

    .loading-content i {
      color: var(--color-primary);
    }

    .error-content i {
      color: var(--color-danger);
    }

    .no-data-content h4 {
      color: var(--color-text-primary);
      margin-bottom: 0.5rem;
    }

    .no-data-content p {
      color: var(--color-text-secondary);
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
      color: var(--color-text-inverse);
    }

    .btn-primary:hover {
      background: var(--color-primary-hover);
    }

    @media (max-width: 768px) {
      .privacy-metrics {
        grid-template-columns: 1fr;
      }
      
      .metric-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }
    }
  `]
})
export class PrivacyDashboardComponent implements OnInit, OnChanges {
  @Input() piaResult: PIAResult | null = null;
  @Input() policyText: string = '';
  @Input() policyId: string = '';
  @Input() userId: string = '';

  isLoading: boolean = false;
  errorMessage: string = '';
  private lastPolicyId: string = '';

  constructor(private privacyService: PrivacyService, private rewardService: RewardService) {}

  ngOnInit() {}

  ngOnChanges(changes: SimpleChanges) {
    // Check if policy has changed
    if (changes['policyId'] && changes['policyId'].currentValue !== this.lastPolicyId) {
      this.lastPolicyId = changes['policyId'].currentValue;
      // Clear previous data when policy changes
      this.piaResult = null;
      this.errorMessage = '';
      
      // Auto-run assessment for new policy if we have the required data
      if (this.policyText && this.policyId && this.userId) {
        this.runPrivacyAssessment();
      }
    }
  }

  getComplianceClass(): string {
    if (!this.piaResult) return '';
    
    if (this.piaResult.complianceScore >= 0.9) return 'excellent';
    if (this.piaResult.complianceScore >= 0.7) return 'good';
    if (this.piaResult.complianceScore >= 0.5) return 'fair';
    return 'poor';
  }

  getRiskClass(): string {
    if (!this.piaResult) return '';
    return this.piaResult.riskLevel.toLowerCase();
  }

  getRiskDescription(): string {
    if (!this.piaResult) return '';
    
    switch (this.piaResult.riskLevel.toLowerCase()) {
      case 'low':
        return 'Your policy has minimal privacy risks and good compliance practices.';
      case 'medium':
        return 'Your policy has some privacy concerns that should be addressed.';
      case 'high':
        return 'Your policy has significant privacy risks that require immediate attention.';
      default:
        return 'Privacy risk assessment completed.';
    }
  }

  runPrivacyAssessment() {
    if (!this.policyText || !this.policyId || !this.userId) {
      console.error('Missing required information for privacy assessment');
      this.errorMessage = 'Missing required information for privacy assessment. Please select a policy and ensure user is logged in.';
      return;
    }

    console.log(`Running privacy assessment for policy: ${this.policyId}`);
    this.isLoading = true;
    this.errorMessage = '';

    const request = {
      policyText: this.policyText,
      policyId: this.policyId,
      userId: this.userId
    };

    this.privacyService.conductPrivacyImpactAssessment(request).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.piaResult = response.piaResult;
          console.log(`Privacy Impact Assessment completed for policy ${this.policyId}:`, this.piaResult);
          // Record reward: privacy assessment completed
          this.rewardService.recordActivity({
            type: 'privacy_assessment',
            name: 'privacy_assessment',
            points: 15,
            metadata: { policyId: this.policyId }
          }).subscribe({ next: () => {}, error: () => {} });
        } else {
          this.errorMessage = response.message || 'Privacy assessment failed';
          console.error('Privacy assessment failed:', response.message);
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Privacy assessment failed';
        console.error(`Privacy assessment error for policy ${this.policyId}:`, error);
      }
    });
  }
}
