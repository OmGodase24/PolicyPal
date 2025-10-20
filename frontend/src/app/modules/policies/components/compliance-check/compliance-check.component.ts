import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AIService } from '@core/services/ai.service';
import { NotificationService } from '@core/services/notification.service';
import { RewardService } from '@core/services/reward.service';
import { 
  ComplianceReport, 
  ComplianceRequest, 
  ComplianceResponse,
  ComplianceLevel, 
  RegulationInfo,
  ComplianceStats 
} from '@core/models/compliance.model';

@Component({
  selector: 'app-compliance-check',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="compliance-check-container">
      <!-- Header -->
      <div class="compliance-header">
        <div class="compliance-title-section">
          <h3 class="compliance-title">
            <svg class="compliance-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Compliance Check
          </h3>
          <p class="compliance-description">Analyze policy compliance against regulatory frameworks</p>
        </div>
        
        @if (!isChecking && !complianceReport) {
          <button (click)="startComplianceCheck()" class="check-btn primary" [disabled]="!canCheckCompliance">
            <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Check Compliance
          </button>
        }
      </div>

      <!-- Regulation Selection -->
      @if (!complianceReport && !isChecking) {
        <div class="regulation-selection">
          <label for="regulationSelect" class="regulation-label">Select Regulation Framework:</label>
          <select 
            id="regulationSelect" 
            [(ngModel)]="selectedRegulation" 
            class="regulation-select"
            [disabled]="isLoadingRegulations">
            @if (isLoadingRegulations) {
              <option>Loading regulations...</option>
            } @else {
              @for (regulation of regulations; track regulation.key) {
                <option [value]="regulation.key">{{ regulation.name }}</option>
              }
            }
          </select>
          @if (selectedRegulation) {
            <p class="regulation-description">{{ getRegulationDescription(selectedRegulation) }}</p>
          }
        </div>
      }

      <!-- Loading State -->
      @if (isChecking) {
        <div class="compliance-loading">
          <div class="loading-spinner">
            <div class="spinner"></div>
          </div>
          <div class="loading-content">
            <h4>Analyzing Compliance</h4>
            <p>Checking policy against {{ getRegulationName(selectedRegulation) }}...</p>
            <div class="loading-progress">
              <div class="progress-bar" [style.width.%]="loadingProgress"></div>
            </div>
          </div>
        </div>
      }

      <!-- Compliance Report -->
      @if (complianceReport) {
        <div class="compliance-report">
          <!-- Overall Score -->
          <div class="overall-score-section">
            <div class="score-header">
              <h4 class="score-title">Overall Compliance Score</h4>
              <div class="score-badge" [class]="getScoreBadgeClass(complianceReport.overall_level)">
                {{ getScoreLabel(complianceReport.overall_level) }}
              </div>
            </div>
            <div class="score-details">
              <div class="score-circle">
                <svg class="score-circle-bg" viewBox="0 0 36 36">
                  <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                  <path 
                    class="circle-progress" 
                    [style.stroke-dasharray]="getScoreCircumference(complianceReport.overall_score)"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                </svg>
                <div class="score-text">{{ (complianceReport.overall_score * 100).toFixed(0) }}%</div>
              </div>
              <div class="score-info">
                <p class="score-message">{{ getScoreMessage(complianceReport.overall_level) }}</p>
                <p class="score-framework">{{ getRegulationName(complianceReport.regulation_framework) }}</p>
                <p class="score-date">Generated {{ complianceReport.generated_at | date:'MMM d, y at h:mm a' }}</p>
              </div>
            </div>
          </div>

          <!-- Individual Checks -->
          <div class="checks-section">
            <h4 class="checks-title">Detailed Analysis</h4>
            <div class="checks-stats">
              <div class="stat-item">
                <span class="stat-label">Total Checks:</span>
                <span class="stat-value">{{ complianceReport.checks.length }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Compliant:</span>
                <span class="stat-value compliant">{{ getCompliantCount() }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Partial:</span>
                <span class="stat-value partial">{{ getPartialCount() }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Non-Compliant:</span>
                <span class="stat-value non-compliant">{{ getNonCompliantCount() }}</span>
              </div>
            </div>

            <div class="checks-list">
              @for (check of complianceReport.checks; track check.check_name) {
                <div class="check-item" [class]="getCheckItemClass(check.level)">
                  <div class="check-header">
                    <div class="check-title-section">
                      <h5 class="check-title">{{ check.check_name }}</h5>
                      <div class="check-badge" [class]="getCheckBadgeClass(check.level)">
                        {{ getCheckLabel(check.level) }}
                      </div>
                    </div>
                    <div class="check-score">{{ (check.score * 100).toFixed(0) }}%</div>
                  </div>
                  
                  <div class="check-content">
                    <p class="check-message">{{ check.message }}</p>
                    
                    @if (check.evidence && check.evidence.length > 0) {
                      <div class="check-evidence">
                        <h6 class="evidence-title">Evidence Found:</h6>
                        <ul class="evidence-list">
                          @for (evidence of check.evidence; track evidence) {
                            <li class="evidence-item">{{ evidence }}</li>
                          }
                        </ul>
                      </div>
                    }
                    
                    @if (check.recommendation) {
                      <div class="check-recommendation">
                        <h6 class="recommendation-title">Recommendation:</h6>
                        <p class="recommendation-text">{{ check.recommendation }}</p>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Actions -->
          <div class="compliance-actions">
            <button (click)="checkDifferentRegulation()" class="action-btn secondary">
              <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              Check Different Regulation
            </button>
            <button (click)="downloadReport()" class="action-btn primary">
              <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              Download Report
            </button>
          </div>
        </div>
      }

      <!-- Error State -->
      @if (errorMessage) {
        <div class="compliance-error">
          <div class="error-icon">⚠️</div>
          <h4 class="error-title">Compliance Check Failed</h4>
          <p class="error-message">{{ errorMessage }}</p>
          <button (click)="retryComplianceCheck()" class="retry-btn">
            <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Try Again
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .compliance-check-container {
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border-primary);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .compliance-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      gap: 1rem;
    }

    .compliance-title-section {
      flex: 1;
    }

    .compliance-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 0.5rem 0;
    }

    .compliance-icon {
      width: 1.5rem;
      height: 1.5rem;
      color: var(--color-primary-500);
    }

    .compliance-description {
      color: var(--color-text-secondary);
      font-size: 0.875rem;
      margin: 0;
    }

    .check-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .check-btn.primary {
      background: var(--color-primary-500);
      color: white;
    }

    .check-btn.primary:hover:not(:disabled) {
      background: var(--color-primary-600);
      transform: translateY(-1px);
    }

    .check-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .btn-icon {
      width: 1rem;
      height: 1rem;
    }

    .regulation-selection {
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: var(--color-bg-secondary);
      border-radius: 8px;
      border: 1px solid var(--color-border-primary);
    }

    .regulation-label {
      display: block;
      font-weight: 500;
      color: var(--color-text-primary);
      margin-bottom: 0.5rem;
    }

    .regulation-select {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid var(--color-border-primary);
      border-radius: 6px;
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      font-size: 0.875rem;
      margin-bottom: 0.75rem;
    }

    .regulation-select:focus {
      outline: none;
      border-color: var(--color-primary-500);
      box-shadow: 0 0 0 3px var(--color-primary-100);
    }

    .regulation-description {
      color: var(--color-text-secondary);
      font-size: 0.875rem;
      margin: 0;
      font-style: italic;
    }

    .compliance-loading {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 2rem;
      background: var(--color-bg-secondary);
      border-radius: 8px;
      text-align: center;
    }

    .loading-spinner {
      flex-shrink: 0;
    }

    .spinner {
      width: 2rem;
      height: 2rem;
      border: 3px solid var(--color-border-primary);
      border-top: 3px solid var(--color-primary-500);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .loading-content h4 {
      margin: 0 0 0.5rem 0;
      color: var(--color-text-primary);
    }

    .loading-content p {
      margin: 0 0 1rem 0;
      color: var(--color-text-secondary);
    }

    .loading-progress {
      width: 200px;
      height: 4px;
      background: var(--color-border-primary);
      border-radius: 2px;
      overflow: hidden;
    }

    .progress-bar {
      height: 100%;
      background: var(--color-primary-500);
      border-radius: 2px;
      transition: width 0.3s ease;
    }

    .compliance-report {
      background: var(--color-bg-primary);
    }

    .overall-score-section {
      background: var(--color-bg-secondary);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      border: 1px solid var(--color-border-primary);
    }

    .score-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .score-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0;
    }

    .score-badge {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .score-badge.compliant {
      background: #d1fae5;
      color: #065f46;
    }

    .score-badge.partial {
      background: #fef3c7;
      color: #92400e;
    }

    .score-badge.non-compliant {
      background: #fee2e2;
      color: #991b1b;
    }

    .score-badge.unknown {
      background: #f3f4f6;
      color: #6b7280;
    }

    .score-details {
      display: flex;
      align-items: center;
      gap: 2rem;
    }

    .score-circle {
      position: relative;
      width: 80px;
      height: 80px;
    }

    .score-circle-bg {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }

    .circle-bg {
      fill: none;
      stroke: var(--color-border-primary);
      stroke-width: 3;
    }

    .circle-progress {
      fill: none;
      stroke: var(--color-primary-500);
      stroke-width: 3;
      stroke-linecap: round;
      transition: stroke-dasharray 0.5s ease;
    }

    .score-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-text-primary);
    }

    .score-info {
      flex: 1;
    }

    .score-message {
      font-size: 1rem;
      font-weight: 500;
      color: var(--color-text-primary);
      margin: 0 0 0.5rem 0;
    }

    .score-framework {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      margin: 0 0 0.25rem 0;
    }

    .score-date {
      font-size: 0.75rem;
      color: var(--color-text-tertiary);
      margin: 0;
    }

    .checks-section {
      margin-bottom: 1.5rem;
    }

    .checks-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 1rem 0;
    }

    .checks-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: var(--color-bg-secondary);
      border-radius: 6px;
      border: 1px solid var(--color-border-primary);
    }

    .stat-label {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }

    .stat-value {
      font-weight: 600;
      font-size: 0.875rem;
    }

    .stat-value.compliant {
      color: #059669;
    }

    .stat-value.partial {
      color: #d97706;
    }

    .stat-value.non-compliant {
      color: #dc2626;
    }

    .checks-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .check-item {
      border: 1px solid var(--color-border-primary);
      border-radius: 8px;
      padding: 1rem;
      background: var(--color-bg-primary);
    }

    .check-item.compliant {
      border-left: 4px solid #059669;
    }

    .check-item.partial {
      border-left: 4px solid #d97706;
    }

    .check-item.non-compliant {
      border-left: 4px solid #dc2626;
    }

    .check-item.unknown {
      border-left: 4px solid #6b7280;
    }

    .check-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }

    .check-title-section {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: 1;
    }

    .check-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0;
    }

    .check-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .check-badge.compliant {
      background: #d1fae5;
      color: #065f46;
    }

    .check-badge.partial {
      background: #fef3c7;
      color: #92400e;
    }

    .check-badge.non-compliant {
      background: #fee2e2;
      color: #991b1b;
    }

    .check-badge.unknown {
      background: #f3f4f6;
      color: #6b7280;
    }

    .check-score {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--color-text-primary);
    }

    .check-content {
      margin-top: 0.75rem;
    }

    .check-message {
      color: var(--color-text-primary);
      margin: 0 0 1rem 0;
      line-height: 1.5;
    }

    .check-evidence {
      margin-bottom: 1rem;
    }

    .evidence-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-secondary);
      margin: 0 0 0.5rem 0;
    }

    .evidence-list {
      margin: 0;
      padding-left: 1.25rem;
    }

    .evidence-item {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      margin-bottom: 0.25rem;
    }

    .check-recommendation {
      background: var(--color-bg-secondary);
      border-radius: 6px;
      padding: 0.75rem;
      border-left: 3px solid var(--color-primary-500);
    }

    .recommendation-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 0.5rem 0;
    }

    .recommendation-text {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      margin: 0;
      line-height: 1.5;
    }

    .compliance-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      padding-top: 1rem;
      border-top: 1px solid var(--color-border-primary);
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .action-btn.primary {
      background: var(--color-primary-500);
      color: white;
    }

    .action-btn.primary:hover {
      background: var(--color-primary-600);
      transform: translateY(-1px);
    }

    .action-btn.secondary {
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
      border: 1px solid var(--color-border-primary);
    }

    .action-btn.secondary:hover {
      background: var(--color-bg-tertiary);
      transform: translateY(-1px);
    }

    .compliance-error {
      text-align: center;
      padding: 2rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      color: #991b1b;
    }

    .error-icon {
      font-size: 2rem;
      margin-bottom: 1rem;
    }

    .error-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0 0 0.5rem 0;
    }

    .error-message {
      margin: 0 0 1.5rem 0;
      color: #7f1d1d;
    }

    .retry-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: #dc2626;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .retry-btn:hover {
      background: #b91c1c;
      transform: translateY(-1px);
    }

    /* Dark mode support */
    .dark .compliance-check-container {
      background: var(--color-bg-primary);
      border-color: var(--color-border-primary);
    }

    .dark .regulation-selection {
      background: var(--color-bg-secondary);
      border-color: var(--color-border-primary);
    }

    .dark .overall-score-section {
      background: var(--color-bg-secondary);
      border-color: var(--color-border-primary);
    }

    .dark .check-item {
      background: var(--color-bg-primary);
      border-color: var(--color-border-primary);
    }

    .dark .check-recommendation {
      background: var(--color-bg-secondary);
    }

    .dark .compliance-actions {
      border-color: var(--color-border-primary);
    }

    .dark .compliance-error {
      background: #1f1f1f;
      border-color: #374151;
      color: #fca5a5;
    }

    .dark .error-message {
      color: #fca5a5;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .compliance-header {
        flex-direction: column;
        align-items: stretch;
      }

      .score-details {
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 1rem;
      }

      .checks-stats {
        grid-template-columns: repeat(2, 1fr);
      }

      .compliance-actions {
        flex-direction: column;
      }

      .action-btn {
        justify-content: center;
      }
    }
  `]
})
export class ComplianceCheckComponent implements OnInit, OnDestroy {
  @Input() policyId!: string;
  @Input() userId!: string;
  @Output() complianceChecked = new EventEmitter<ComplianceReport>();

  // State
  complianceReport: ComplianceReport | null = null;
  isChecking = false;
  isLoadingRegulations = false;
  errorMessage: string | null = null;
  selectedRegulation = 'insurance_standards';
  regulations: RegulationInfo[] = [];
  loadingProgress = 0;

  // Expose enums to template
  ComplianceLevel = ComplianceLevel;

  constructor(
    private aiService: AIService,
    private notificationService: NotificationService,
    private rewardService: RewardService
  ) {}

  ngOnInit(): void {
    this.loadRegulations();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  get canCheckCompliance(): boolean {
    return !this.isChecking && !!this.policyId && !!this.userId && !!this.selectedRegulation;
  }

  loadRegulations(): void {
    this.isLoadingRegulations = true;
    this.aiService.getRegulationInfo().subscribe({
      next: (regulations: RegulationInfo[]) => {
        this.regulations = regulations;
        this.isLoadingRegulations = false;
      },
      error: (error) => {
        console.error('Error loading regulations:', error);
        this.isLoadingRegulations = false;
        this.notificationService.showError('Failed to load regulation frameworks');
      }
    });
  }

  startComplianceCheck(): void {
    if (!this.canCheckCompliance) return;

    this.isChecking = true;
    this.errorMessage = null;
    this.complianceReport = null;
    this.loadingProgress = 0;

    // Simulate progress
    const progressInterval = setInterval(() => {
      if (this.loadingProgress < 90) {
        this.loadingProgress += Math.random() * 20;
      }
    }, 200);

    const request: ComplianceRequest = {
      policy_id: this.policyId,
      user_id: this.userId,
      regulation_framework: this.selectedRegulation
    };

    this.aiService.checkCompliance(request).subscribe({
      next: (response: ComplianceResponse) => {
        clearInterval(progressInterval);
        this.loadingProgress = 100;
        
        if (response.success && response.report) {
          this.complianceReport = response.report;
          this.complianceChecked.emit(response.report);
          this.notificationService.showSuccess('Compliance check completed successfully');
        } else {
          this.errorMessage = response.message || 'Compliance check failed';
        }
        
        this.isChecking = false;
      },
      error: (error) => {
        clearInterval(progressInterval);
        this.isChecking = false;
        this.errorMessage = error.error?.message || 'Failed to check compliance';
        console.error('Compliance check error:', error);
      }
    });
  }

  checkDifferentRegulation(): void {
    this.complianceReport = null;
    this.errorMessage = null;
  }

  retryComplianceCheck(): void {
    this.errorMessage = null;
    this.startComplianceCheck();
  }

  downloadReport(): void {
    if (!this.complianceReport) return;

    const reportData = {
      policy_id: this.complianceReport.policy_id,
      regulation_framework: this.complianceReport.regulation_framework,
      overall_score: this.complianceReport.overall_score,
      overall_level: this.complianceReport.overall_level,
      generated_at: this.complianceReport.generated_at,
      checks: this.complianceReport.checks.map(check => ({
        name: check.check_name,
        level: check.level,
        score: check.score,
        message: check.message,
        evidence: check.evidence,
        recommendation: check.recommendation
      }))
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `compliance-report-${this.complianceReport.policy_id}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Helper methods
  getRegulationName(key: string): string {
    const regulation = this.regulations.find(r => r.key === key);
    return regulation?.name || key;
  }

  getRegulationDescription(key: string): string {
    const regulation = this.regulations.find(r => r.key === key);
    return regulation?.description || '';
  }

  getScoreLabel(level: ComplianceLevel): string {
    switch (level) {
      case ComplianceLevel.COMPLIANT: return 'Compliant';
      case ComplianceLevel.PARTIAL: return 'Partial';
      case ComplianceLevel.NON_COMPLIANT: return 'Non-Compliant';
      case ComplianceLevel.UNKNOWN: return 'Unknown';
      default: return 'Unknown';
    }
  }

  getScoreMessage(level: ComplianceLevel): string {
    switch (level) {
      case ComplianceLevel.COMPLIANT: return 'This policy meets most compliance requirements';
      case ComplianceLevel.PARTIAL: return 'This policy meets some compliance requirements but needs improvement';
      case ComplianceLevel.NON_COMPLIANT: return 'This policy needs significant work to meet compliance requirements';
      case ComplianceLevel.UNKNOWN: return 'Unable to determine compliance status';
      default: return 'Unknown compliance status';
    }
  }

  getScoreBadgeClass(level: ComplianceLevel): string {
    return level.toLowerCase().replace('_', '-');
  }

  getScoreCircumference(score: number): string {
    const circumference = 2 * Math.PI * 15.9155; // radius = 15.9155
    const offset = circumference - (score * circumference);
    return `${circumference} ${offset}`;
  }

  getCheckLabel(level: ComplianceLevel): string {
    return this.getScoreLabel(level);
  }

  getCheckBadgeClass(level: ComplianceLevel): string {
    return this.getScoreBadgeClass(level);
  }

  getCheckItemClass(level: ComplianceLevel): string {
    return level.toLowerCase().replace('_', '-');
  }

  getCompliantCount(): number {
    return this.complianceReport?.checks.filter(c => c.level === ComplianceLevel.COMPLIANT).length || 0;
  }

  getPartialCount(): number {
    return this.complianceReport?.checks.filter(c => c.level === ComplianceLevel.PARTIAL).length || 0;
  }

  getNonCompliantCount(): number {
    return this.complianceReport?.checks.filter(c => c.level === ComplianceLevel.NON_COMPLIANT).length || 0;
  }
}
