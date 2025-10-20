import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AIService } from '@core/services/ai.service';
import { NotificationService } from '@core/services/notification.service';
import { ComplianceReport, ComplianceLevel, ComplianceCheck } from '@core/models/compliance.model';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { LanguageService } from '@core/services/language.service';

@Component({
  selector: 'app-compliance-report',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="compliance-report-container">
      <!-- Header -->
      <div class="report-header">
        <div class="header-content">
          <div class="header-info">
            <h1 class="report-title">{{ 'compliance.report.title' | translate }}</h1>
            <p class="report-subtitle">{{ 'compliance.report.subtitle' | translate }}</p>
          </div>
          <div class="header-actions">
            <button (click)="exportReport('pdf')" class="export-btn pdf" [disabled]="isLoading">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              {{ 'compliance.report.exportPDF' | translate }}
            </button>
            <button (click)="exportReport('excel')" class="export-btn excel" [disabled]="isLoading">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
              {{ 'compliance.report.exportExcel' | translate }}
            </button>
            <button (click)="goBack()" class="back-btn">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
              {{ 'compliance.report.backToPolicies' | translate }}
            </button>
          </div>
        </div>
      </div>

      @if (isLoading) {
        <div class="loading-state">
          <div class="loading-spinner">
            <div class="spinner"></div>
          </div>
          <p>{{ 'compliance.report.generating' | translate }}</p>
        </div>
      } @else if (errorMessage) {
        <div class="error-state">
          <div class="error-icon">⚠️</div>
          <h3 class="error-title">Report Generation Failed</h3>
          <p class="error-message">{{ errorMessage }}</p>
          <button (click)="retryGeneration()" class="retry-btn">
            Try Again
          </button>
        </div>
      } @else if (complianceReport) {
        <div class="report-content">
          <!-- Policy Health Overview -->
          <div class="policy-health-section">
            <div class="health-header">
              <h2 class="health-title">Your Policy Health Check</h2>
              <div class="health-status" [class]="getHealthStatusClass(complianceReport.overall_level)">
                <div class="status-icon">
                  @if (complianceReport.overall_level === 'compliant') {
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  } @else if (complianceReport.overall_level === 'partial') {
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                  } @else {
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  }
                </div>
                <div class="status-text">
                  <h3 class="status-title">{{ getHealthStatusTitle(complianceReport.overall_level) }}</h3>
                  <p class="status-description">{{ getHealthStatusDescription(complianceReport.overall_level) }}</p>
                </div>
              </div>
            </div>
            
            <div class="health-summary">
              <div class="summary-card">
                <div class="summary-icon">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                </div>
                <div class="summary-content">
                  <h4 class="summary-title">What This Means for You</h4>
                  <p class="summary-text">{{ getHealthSummaryText(complianceReport.overall_level, complianceReport.overall_score) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Key Information Cards -->
          <div class="key-info-section">
            <h3 class="section-title">Key Information About Your Policy</h3>
            <div class="info-cards">
              <div class="info-card">
                <div class="card-icon">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div class="card-content">
                  <h4 class="card-title">What's Working Well</h4>
                  <p class="card-description">{{ getCompliantCount() }} important areas are properly covered</p>
                </div>
              </div>

              <div class="info-card">
                <div class="card-icon">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                  </svg>
                </div>
                <div class="card-content">
                  <h4 class="card-title">Areas to Review</h4>
                  <p class="card-description">{{ getPartialCount() }} areas need attention or clarification</p>
                </div>
              </div>

              <div class="info-card">
                <div class="card-icon">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div class="card-content">
                  <h4 class="card-title">Important Issues</h4>
                  <p class="card-description">{{ getNonCompliantCount() }} critical areas need immediate attention</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Policy Insights -->
          <div class="policy-insights-section">
            <h3 class="section-title">What This Means for You</h3>
            <div class="insights-grid">
              @for (check of complianceReport.checks; track check.check_name) {
                <div class="insight-card" [class]="getInsightCardClass(check.level)">
                  <div class="insight-header">
                    <div class="insight-icon">
                      @if (check.level === 'compliant') {
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      } @else if (check.level === 'partial') {
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                        </svg>
                      } @else {
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      }
                    </div>
                    <div class="insight-title-section">
                      <h4 class="insight-title">{{ getFriendlyCheckName(check.check_name) }}</h4>
                      <div class="insight-status" [class]="getInsightStatusClass(check.level)">
                        {{ getFriendlyCheckLabel(check.level) }}
                      </div>
                    </div>
                  </div>
                  
                  <div class="insight-content">
                    <p class="insight-description">{{ getFriendlyCheckMessage(check) }}</p>
                    
                    @if (check.evidence && check.evidence.length > 0) {
                      <div class="insight-details">
                        <h5 class="details-title">What We Found in Your Policy:</h5>
                        <div class="details-list">
                          @for (evidence of check.evidence.slice(0, 3); track evidence) {
                            <div class="detail-item">
                              <span class="detail-bullet">•</span>
                              <span class="detail-text">{{ getFriendlyEvidence(evidence) }}</span>
                            </div>
                          }
                          @if (check.evidence.length > 3) {
                            <div class="detail-item">
                              <span class="detail-bullet">•</span>
                              <span class="detail-text">... and {{ check.evidence.length - 3 }} more items</span>
                            </div>
                          }
                        </div>
                      </div>
                    }
                    
                    @if (check.recommendation) {
                      <div class="insight-action">
                        <h5 class="action-title">What You Should Do:</h5>
                        <p class="action-text">{{ getFriendlyRecommendation(check.recommendation) }}</p>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Action Items -->
          <div class="action-items">
            <h3 class="action-title">Recommended Actions</h3>
            <div class="action-list">
              @for (check of getActionItems(); track check.check_name) {
                <div class="action-item" [class]="getActionItemClass(check.level)">
                  <div class="action-icon">
                    @if (check.level === ComplianceLevel.NON_COMPLIANT) {
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                      </svg>
                    } @else if (check.level === ComplianceLevel.PARTIAL) {
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    } @else {
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    }
                  </div>
                  <div class="action-content">
                    <h5 class="action-item-title">{{ check.check_name }}</h5>
                    <p class="action-description">{{ check.recommendation }}</p>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      } @else {
        <div class="no-report-state">
          <div class="no-report-icon">📊</div>
          <h3 class="no-report-title">No Compliance Report Available</h3>
          <p class="no-report-message">Unable to generate compliance report. Please check if the policy has been processed and try again.</p>
          <button (click)="retryGeneration()" class="retry-btn">
            Try Again
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .compliance-report-container {
      min-height: 100vh;
      background: var(--color-bg-primary);
    }

    .report-header {
      background: var(--color-bg-primary);
      border-bottom: 1px solid var(--color-border-primary);
      padding: 2rem 0;
    }

    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 2rem;
    }

    .header-info {
      flex: 1;
    }

    .report-title {
      font-size: 2rem;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 0.5rem 0;
    }

    .report-subtitle {
      color: var(--color-text-secondary);
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .export-btn {
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

    .export-btn.pdf {
      background: var(--color-danger);
      color: white;
    }

    .export-btn.pdf:hover:not(:disabled) {
      background: var(--color-danger-hover);
      transform: translateY(-1px);
    }

    .export-btn.excel {
      background: var(--color-success);
      color: white;
    }

    .export-btn.excel:hover:not(:disabled) {
      background: var(--color-success-hover);
      transform: translateY(-1px);
    }

    .export-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .back-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
      border: 1px solid var(--color-border-primary);
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .back-btn:hover {
      background: var(--color-bg-tertiary);
      transform: translateY(-1px);
    }

    .loading-state, .error-state {
      text-align: center;
      padding: 4rem 2rem;
    }

    .loading-spinner {
      margin-bottom: 1rem;
    }

    .spinner {
      width: 3rem;
      height: 3rem;
      border: 4px solid var(--color-border-primary);
      border-top: 4px solid var(--color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .error-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-danger);
      margin: 0 0 0.5rem 0;
    }

    .error-message {
      color: var(--color-text-secondary);
      margin: 0 0 2rem 0;
    }

    .retry-btn {
      background: var(--color-danger);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .retry-btn:hover {
      background: var(--color-danger-hover);
      transform: translateY(-1px);
    }

    .report-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .overall-score-section {
      background: var(--color-bg-primary);
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 1px 3px var(--color-shadow);
    }

    .score-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .score-title {
      font-size: 1.5rem;
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
      background: var(--color-success-light);
      color: var(--color-success);
    }

    .score-badge.partial {
      background: var(--color-warning-light);
      color: var(--color-warning);
    }

    .score-badge.non-compliant {
      background: var(--color-danger-light);
      color: var(--color-danger);
    }

    .score-details {
      display: flex;
      align-items: center;
      gap: 3rem;
    }

    .score-gauge {
      flex-shrink: 0;
    }

    .gauge-circle {
      position: relative;
      width: 150px;
      height: 150px;
    }

    .gauge-svg {
      width: 100%;
      height: 100%;
    }

    .gauge-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }

    .gauge-score {
      font-size: 2rem;
      font-weight: 700;
      color: var(--color-text-primary);
      margin-bottom: 0.25rem;
    }

    .gauge-label {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .score-info {
      flex: 1;
    }

    .score-message {
      font-size: 1.125rem;
      color: var(--color-text-primary);
      margin: 0 0 1rem 0;
      line-height: 1.6;
    }

    .score-meta {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .score-framework {
      font-weight: 500;
      color: var(--color-text-primary);
    }

    .score-date {
      color: var(--color-text-secondary);
      font-size: 0.875rem;
    }

    .summary-stats {
      margin-bottom: 2rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
    }

    .stat-card {
      background: var(--color-bg-primary);
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px var(--color-shadow);
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .stat-icon {
      width: 3rem;
      height: 3rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-icon.compliant {
      background: var(--color-success-light);
      color: var(--color-success);
    }

    .stat-icon.partial {
      background: var(--color-warning-light);
      color: var(--color-warning);
    }

    .stat-icon.non-compliant {
      background: var(--color-danger-light);
      color: var(--color-danger);
    }

    .stat-icon.total {
      background: var(--color-primary-light);
      color: var(--color-primary);
    }

    .stat-content {
      flex: 1;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--color-text-primary);
      margin-bottom: 0.25rem;
    }

    .stat-label {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      margin-bottom: 0.25rem;
    }

    .stat-percentage {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text-tertiary);
    }

    .category-cards {
      margin-bottom: 2rem;
    }

    .category-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 1.5rem 0;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 1.5rem;
    }

    .category-card {
      background: var(--color-bg-primary);
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px var(--color-shadow);
      border-left: 4px solid;
    }

    .category-card.compliant {
      border-left-color: var(--color-success);
    }

    .category-card.partial {
      border-left-color: var(--color-warning);
    }

    .category-card.non-compliant {
      border-left-color: var(--color-danger);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .card-title-section {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: 1;
    }

    .card-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0;
    }

    .card-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .card-badge.compliant {
      background: var(--color-success-light);
      color: var(--color-success);
    }

    .card-badge.partial {
      background: var(--color-warning-light);
      color: var(--color-warning);
    }

    .card-badge.non-compliant {
      background: var(--color-danger-light);
      color: var(--color-danger);
    }

    .card-score {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text-primary);
    }

    .card-content {
      margin-top: 1rem;
    }

    .card-message {
      color: var(--color-text-primary);
      margin: 0 0 1rem 0;
      line-height: 1.6;
    }

    .card-evidence {
      margin-bottom: 1rem;
    }

    .evidence-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-secondary);
      margin: 0 0 0.5rem 0;
    }

    .evidence-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .evidence-tag {
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .card-recommendation {
      border-top: 1px solid var(--color-border-primary);
      padding-top: 1rem;
    }

    .recommendation-toggle {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
    }

    .recommendation-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0;
    }

    .toggle-icon {
      width: 1rem;
      height: 1rem;
      color: var(--color-text-secondary);
      transition: transform 0.2s ease;
    }

    .toggle-icon.rotated {
      transform: rotate(180deg);
    }

    .recommendation-content {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
    }

    .card-recommendation.expanded .recommendation-content {
      max-height: 200px;
    }

    .recommendation-text {
      color: var(--color-text-primary);
      margin: 0.5rem 0 0 0;
      line-height: 1.6;
    }

    .action-items {
      background: var(--color-bg-primary);
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 1px 3px var(--color-shadow);
    }

    .action-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 1.5rem 0;
    }

    .action-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .action-item {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid;
    }

    .action-item.non-compliant {
      background: var(--color-danger-light);
      border-color: var(--color-danger);
    }

    .action-item.partial {
      background: var(--color-warning-light);
      border-color: var(--color-warning);
    }

    .action-item.compliant {
      background: var(--color-success-light);
      border-color: var(--color-success);
    }

    .action-icon {
      flex-shrink: 0;
      margin-top: 0.25rem;
    }

    .action-icon.non-compliant {
      color: var(--color-danger);
    }

    .action-icon.partial {
      color: var(--color-warning);
    }

    .action-icon.compliant {
      color: var(--color-success);
    }

    .action-content {
      flex: 1;
    }

    .action-item-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 0.5rem 0;
    }

    .action-description {
      color: var(--color-text-primary);
      margin: 0;
      line-height: 1.6;
    }

    /* Dark mode support */
    .dark .compliance-report-container {
      background: var(--color-bg-primary);
    }

    .dark .report-header {
      background: var(--color-bg-primary);
      border-color: var(--color-border-primary);
    }

    .dark .report-title {
      color: var(--color-text-primary);
    }

    .dark .report-subtitle {
      color: var(--color-text-secondary);
    }

    .dark .back-btn {
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
      border-color: var(--color-border-primary);
    }

    .dark .back-btn:hover {
      background: var(--color-bg-tertiary);
    }

    .dark .overall-score-section,
    .dark .stat-card,
    .dark .category-card,
    .dark .action-items {
      background: var(--color-bg-secondary);
      box-shadow: 0 1px 3px var(--color-shadow);
    }

    .dark .gauge-score {
      color: var(--color-text-primary);
    }

    .dark .gauge-label {
      color: var(--color-text-secondary);
    }

    .dark .score-message {
      color: var(--color-text-primary);
    }

    .dark .score-framework {
      color: var(--color-text-primary);
    }

    .dark .score-date {
      color: var(--color-text-tertiary);
    }

    .dark .stat-value {
      color: var(--color-text-primary);
    }

    .dark .stat-label {
      color: var(--color-text-secondary);
    }

    .dark .category-title,
    .dark .action-title {
      color: var(--color-text-primary);
    }

    .dark .card-title {
      color: var(--color-text-primary);
    }

    .dark .card-message {
      color: var(--color-text-secondary);
    }

    .dark .evidence-tag {
      background: var(--color-bg-tertiary);
      color: var(--color-text-secondary);
    }

    .dark .recommendation-title {
      color: var(--color-text-primary);
    }

    .dark .recommendation-text {
      color: var(--color-text-secondary);
    }

    .dark .action-item-title {
      color: var(--color-text-primary);
    }

    .dark .action-description {
      color: var(--color-text-secondary);
    }

    /* Dark mode for user-friendly design sections */
    .dark .policy-health-section {
      background: var(--color-bg-secondary);
      border-color: var(--color-border-primary);
    }

    .dark .health-title {
      color: var(--color-text-primary);
    }

    .dark .health-status.health-good {
      background: rgba(16, 185, 129, 0.1);
      border-color: rgba(16, 185, 129, 0.3);
    }

    .dark .health-status.health-warning {
      background: rgba(245, 158, 11, 0.1);
      border-color: rgba(245, 158, 11, 0.3);
    }

    .dark .health-status.health-critical {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.3);
    }

    .dark .status-title {
      color: var(--color-text-primary);
    }

    .dark .status-description {
      color: var(--color-text-secondary);
    }

    .dark .summary-card {
      background: var(--color-bg-tertiary);
      border-color: var(--color-border-primary);
    }

    .dark .summary-title {
      color: var(--color-text-primary);
    }

    .dark .summary-text {
      color: var(--color-text-secondary);
    }

    .dark .section-title {
      color: var(--color-text-primary);
    }

    .dark .info-card {
      background: var(--color-bg-secondary);
      border-color: var(--color-border-primary);
    }

    .dark .card-title {
      color: var(--color-text-primary);
    }

    .dark .card-description {
      color: var(--color-text-secondary);
    }

    .dark .insight-card {
      background: var(--color-bg-secondary);
      border-color: var(--color-border-primary);
    }

    .dark .insight-title {
      color: var(--color-text-primary);
    }

    .dark .insight-description {
      color: var(--color-text-secondary);
    }

    .dark .details-title {
      color: var(--color-text-primary);
    }

    .dark .detail-text {
      color: var(--color-text-secondary);
    }

    .dark .insight-action {
      background: var(--color-bg-tertiary);
      border-color: var(--color-primary);
    }

    .dark .action-title {
      color: var(--color-text-primary);
    }

    .dark .action-text {
      color: var(--color-text-secondary);
    }

    .dark .no-report-state {
      background: var(--color-bg-secondary);
      border-color: var(--color-border-primary);
    }

    .dark .no-report-title {
      color: var(--color-text-primary);
    }

    .dark .no-report-message {
      color: var(--color-text-secondary);
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        align-items: stretch;
      }

      .header-actions {
        flex-wrap: wrap;
      }

      .score-details {
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 2rem;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .cards-grid {
        grid-template-columns: 1fr;
      }

      .report-content {
        padding: 1rem;
      }
    }

    .no-report-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      text-align: center;
      background: white;
      border-radius: 12px;
      margin: 2rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .no-report-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .no-report-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 1rem 0;
    }

    .no-report-message {
      color: var(--color-text-secondary);
      margin: 0 0 2rem 0;
      max-width: 500px;
      line-height: 1.5;
    }

    /* User-friendly design styles */
    .policy-health-section {
      background: var(--color-bg-primary);
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 1px 3px var(--color-shadow);
    }

    .health-header {
      margin-bottom: 1.5rem;
    }

    .health-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 1rem 0;
    }

    .health-status {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem;
      border-radius: 8px;
    }

    .health-status.health-good {
      background: var(--color-success-light);
      border: 1px solid var(--color-success);
    }

    .health-status.health-warning {
      background: var(--color-warning-light);
      border: 1px solid var(--color-warning);
    }

    .health-status.health-critical {
      background: var(--color-danger-light);
      border: 1px solid var(--color-danger);
    }

    .status-icon {
      flex-shrink: 0;
    }

    .status-text {
      flex: 1;
    }

    .status-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0 0 0.5rem 0;
    }

    .status-description {
      color: var(--color-text-secondary);
      margin: 0;
      line-height: 1.5;
    }

    .health-summary {
      margin-top: 1.5rem;
    }

    .summary-card {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.5rem;
      background: var(--color-bg-secondary);
      border-radius: 8px;
      border: 1px solid var(--color-border-primary);
    }

    .summary-icon {
      flex-shrink: 0;
      color: var(--color-primary);
    }

    .summary-content {
      flex: 1;
    }

    .summary-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 0.5rem 0;
    }

    .summary-text {
      color: var(--color-text-secondary);
      margin: 0;
      line-height: 1.6;
    }

    .key-info-section {
      margin-bottom: 2rem;
    }

    .section-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 1.5rem 0;
    }

    .info-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
    }

    .info-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem;
      background: var(--color-bg-primary);
      border-radius: 8px;
      box-shadow: 0 1px 3px var(--color-shadow);
    }

    .card-icon {
      flex-shrink: 0;
    }

    .card-content {
      flex: 1;
    }

    .card-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 0.25rem 0;
    }

    .card-description {
      color: var(--color-text-secondary);
      margin: 0;
      font-size: 0.875rem;
    }

    .policy-insights-section {
      margin-bottom: 2rem;
    }

    .insights-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 1.5rem;
    }

    .insight-card {
      background: var(--color-bg-primary);
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px var(--color-shadow);
      border: 1px solid var(--color-border-primary);
    }

    .insight-card.insight-good {
      border-left: 4px solid var(--color-success);
    }

    .insight-card.insight-warning {
      border-left: 4px solid var(--color-warning);
    }

    .insight-card.insight-critical {
      border-left: 4px solid var(--color-danger);
    }

    .insight-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .insight-icon {
      flex-shrink: 0;
    }

    .insight-title-section {
      flex: 1;
    }

    .insight-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 0.25rem 0;
    }

    .insight-status {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .insight-status.status-good {
      background: var(--color-success-light);
      color: var(--color-success);
    }

    .insight-status.status-warning {
      background: var(--color-warning-light);
      color: var(--color-warning);
    }

    .insight-status.status-critical {
      background: var(--color-danger-light);
      color: var(--color-danger);
    }

    .insight-content {
      margin-top: 1rem;
    }

    .insight-description {
      color: var(--color-text-secondary);
      margin: 0 0 1rem 0;
      line-height: 1.6;
    }

    .insight-details {
      margin-bottom: 1rem;
    }

    .details-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 0.5rem 0;
    }

    .details-list {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .detail-item {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .detail-bullet {
      color: var(--color-text-secondary);
      font-weight: 600;
    }

    .detail-text {
      color: var(--color-text-secondary);
      font-size: 0.875rem;
      line-height: 1.4;
    }

    .insight-action {
      background: var(--color-bg-secondary);
      border-radius: 6px;
      padding: 1rem;
      border-left: 3px solid var(--color-primary);
    }

    .action-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 0.5rem 0;
    }

    .action-text {
      color: var(--color-text-secondary);
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.5;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .policy-health-section {
        padding: 1.5rem;
      }

      .health-status {
        flex-direction: column;
        text-align: center;
        gap: 0.75rem;
      }

      .summary-card {
        flex-direction: column;
        text-align: center;
      }

      .info-cards {
        grid-template-columns: 1fr;
      }

      .insights-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ComplianceReportComponent implements OnInit, OnDestroy {
  @Input() policyId!: string;
  @Input() userId!: string;
  @Input() regulationFramework: string = 'insurance_standards';

  complianceReport: ComplianceReport | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  expandedRecommendations: { [key: string]: boolean } = {};

  // Expose enums to template
  ComplianceLevel = ComplianceLevel;

  constructor(
    private aiService: AIService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private router: Router,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    // Get parameters from route or inputs
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.policyId = params['id'];
      }
      if (params['regulationFramework']) {
        this.regulationFramework = params['regulationFramework'];
      }
    });

    this.route.queryParams.subscribe(params => {
      if (params['userId']) {
        this.userId = params['userId'];
      }
    });

    console.log('Compliance Report Component initialized:', {
      policyId: this.policyId,
      userId: this.userId,
      regulationFramework: this.regulationFramework
    });

    if (this.policyId && this.userId) {
      this.generateReport();
    } else {
      console.warn('Missing required parameters for compliance report:', {
        policyId: this.policyId,
        userId: this.userId
      });
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  generateReport(): void {
    this.isLoading = true;
    this.errorMessage = null;

    const request = {
      policy_id: this.policyId,
      user_id: this.userId,
      regulation_framework: this.regulationFramework
    };

    this.aiService.checkCompliance(request).subscribe({
      next: (response) => {
        this.complianceReport = response.report || null;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Compliance report generation error:', error);
        this.errorMessage = error.message || 'Failed to generate compliance report';
        this.isLoading = false;
        this.notificationService.showError('Failed to generate compliance report');
      }
    });
  }

  retryGeneration(): void {
    this.generateReport();
  }

  goBack(): void {
    this.router.navigate(['/policies']);
  }

  exportReport(format: 'pdf' | 'excel'): void {
    if (!this.complianceReport) {
      this.notificationService.showError('No compliance report available to export');
      return;
    }

    try {
      if (format === 'pdf') {
        this.exportToPDF();
      } else if (format === 'excel') {
        this.exportToExcel();
      }
    } catch (error) {
      console.error('Export error:', error);
      this.notificationService.showError(`Failed to export ${format.toUpperCase()}`);
    }
  }

  private exportToPDF(): void {
    // Create a simple PDF export using browser's print functionality
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.notificationService.showError('Unable to open print window. Please check your browser settings.');
      return;
    }

    const reportContent = this.generateReportHTML();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Compliance Report - ${new Date().toLocaleDateString()}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 25px; }
            .section h2 { color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
            .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
            .status-good { border-left: 4px solid #10b981; }
            .status-warning { border-left: 4px solid #f59e0b; }
            .status-critical { border-left: 4px solid #ef4444; }
            .insight-title { font-weight: bold; margin-bottom: 10px; }
            .insight-description { margin-bottom: 10px; }
            .action-text { background: #f8fafc; padding: 10px; border-radius: 4px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          ${reportContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
    
    this.notificationService.showSuccess('PDF export initiated. Please use your browser\'s print dialog to save as PDF.');
  }

  private exportToExcel(): void {
    // Create Excel export using CSV format
    const csvContent = this.generateReportCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `compliance-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.notificationService.showSuccess('Excel export completed successfully');
  }

  private generateReportHTML(): string {
    if (!this.complianceReport) return '';

    const report = this.complianceReport;
    const statusTitle = this.getHealthStatusTitle(report.overall_level);
    const statusDescription = this.getHealthStatusDescription(report.overall_level);
    const summaryText = this.getHealthSummaryText(report.overall_level, report.overall_score);

    let html = `
      <div class="header">
        <h1>Policy Compliance Report</h1>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
        <p>Policy Health: ${statusTitle}</p>
      </div>

      <div class="section">
        <h2>Policy Health Overview</h2>
        <div class="card">
          <h3>${statusTitle}</h3>
          <p>${statusDescription}</p>
          <p><strong>What This Means for You:</strong> ${summaryText}</p>
        </div>
      </div>

      <div class="section">
        <h2>Key Information</h2>
        <div class="card">
          <p><strong>What's Working Well:</strong> ${this.getCompliantCount()} important areas are properly covered</p>
        </div>
        <div class="card">
          <p><strong>Areas to Review:</strong> ${this.getPartialCount()} areas need attention or clarification</p>
        </div>
        <div class="card">
          <p><strong>Important Issues:</strong> ${this.getNonCompliantCount()} critical areas need immediate attention</p>
        </div>
      </div>

      <div class="section">
        <h2>Detailed Analysis</h2>
    `;

    report.checks.forEach(check => {
      const friendlyName = this.getFriendlyCheckName(check.check_name);
      const friendlyMessage = this.getFriendlyCheckMessage(check);
      const statusClass = check.level === 'compliant' ? 'status-good' : 
                         check.level === 'partial' ? 'status-warning' : 'status-critical';
      
      html += `
        <div class="card ${statusClass}">
          <div class="insight-title">${friendlyName}</div>
          <div class="insight-description">${friendlyMessage}</div>
      `;

      if (check.evidence && check.evidence.length > 0) {
        html += `<p><strong>What We Found:</strong> ${check.evidence.slice(0, 3).map(e => this.getFriendlyEvidence(e)).join(', ')}</p>`;
      }

      if (check.recommendation) {
        html += `<div class="action-text"><strong>What You Should Do:</strong> ${this.getFriendlyRecommendation(check.recommendation)}</div>`;
      }

      html += `</div>`;
    });

    html += `</div></div>`;
    return html;
  }

  private generateReportCSV(): string {
    if (!this.complianceReport) return '';

    const report = this.complianceReport;
    let csv = 'Policy Compliance Report\n';
    csv += `Generated,${new Date().toLocaleDateString()}\n`;
    csv += `Policy Health,${this.getHealthStatusTitle(report.overall_level)}\n`;
    csv += `Overall Score,${Math.round(report.overall_score * 100)}%\n\n`;
    
    csv += 'Category,Status,Description,Evidence,Recommendation\n';
    
    report.checks.forEach(check => {
      const friendlyName = this.getFriendlyCheckName(check.check_name);
      const friendlyMessage = this.getFriendlyCheckMessage(check);
      const evidence = check.evidence ? check.evidence.slice(0, 3).map(e => this.getFriendlyEvidence(e)).join('; ') : '';
      const recommendation = check.recommendation ? this.getFriendlyRecommendation(check.recommendation) : '';
      
      csv += `"${friendlyName}","${check.level}","${friendlyMessage}","${evidence}","${recommendation}"\n`;
    });

    return csv;
  }

  toggleRecommendation(checkName: string): void {
    this.expandedRecommendations[checkName] = !this.expandedRecommendations[checkName];
  }

  getGaugeColor(score: number): string {
    if (score >= 0.8) return 'var(--color-success)';
    if (score >= 0.6) return 'var(--color-warning)';
    return 'var(--color-danger)';
  }

  getGaugeCircumference(score: number): string {
    const circumference = 2 * Math.PI * 50;
    const offset = circumference - (score * circumference);
    return `${circumference} ${offset}`;
  }

  getScoreBadgeClass(level: ComplianceLevel): string {
    switch (level) {
      case ComplianceLevel.COMPLIANT:
        return 'compliant';
      case ComplianceLevel.PARTIAL:
        return 'partial';
      case ComplianceLevel.NON_COMPLIANT:
        return 'non-compliant';
      default:
        return 'unknown';
    }
  }

  getScoreLabel(level: ComplianceLevel): string {
    switch (level) {
      case ComplianceLevel.COMPLIANT:
        return 'Compliant';
      case ComplianceLevel.PARTIAL:
        return 'Partial';
      case ComplianceLevel.NON_COMPLIANT:
        return 'Non-Compliant';
      default:
        return 'Unknown';
    }
  }

  getScoreMessage(level: ComplianceLevel): string {
    switch (level) {
      case ComplianceLevel.COMPLIANT:
        return 'This policy meets all compliance requirements for the selected regulation framework.';
      case ComplianceLevel.PARTIAL:
        return 'This policy meets some compliance requirements but needs improvement in certain areas.';
      case ComplianceLevel.NON_COMPLIANT:
        return 'This policy does not meet compliance requirements and requires significant updates.';
      default:
        return 'Compliance status could not be determined.';
    }
  }

  getRegulationName(framework: string): string {
    const names: Record<string, string> = {
      'insurance_standards': 'General Insurance Standards',
      'gdpr': 'General Data Protection Regulation (GDPR)',
      'ccpa': 'California Consumer Privacy Act (CCPA)',
      'hipaa': 'Health Insurance Portability and Accountability Act (HIPAA)',
      'sox': 'Sarbanes-Oxley Act (SOX)',
      'pci_dss': 'Payment Card Industry Data Security Standard (PCI DSS)'
    };
    return names[framework] || framework;
  }

  getCompliantCount(): number {
    if (!this.complianceReport) return 0;
    return this.complianceReport.checks.filter(check => check.level === ComplianceLevel.COMPLIANT).length;
  }

  getPartialCount(): number {
    if (!this.complianceReport) return 0;
    return this.complianceReport.checks.filter(check => check.level === ComplianceLevel.PARTIAL).length;
  }

  getNonCompliantCount(): number {
    if (!this.complianceReport) return 0;
    return this.complianceReport.checks.filter(check => check.level === ComplianceLevel.NON_COMPLIANT).length;
  }

  getCompliantPercentage(): number {
    if (!this.complianceReport) return 0;
    return Math.round((this.getCompliantCount() / this.complianceReport.checks.length) * 100);
  }

  getPartialPercentage(): number {
    if (!this.complianceReport) return 0;
    return Math.round((this.getPartialCount() / this.complianceReport.checks.length) * 100);
  }

  getNonCompliantPercentage(): number {
    if (!this.complianceReport) return 0;
    return Math.round((this.getNonCompliantCount() / this.complianceReport.checks.length) * 100);
  }

  getCategoryCardClass(level: ComplianceLevel): string {
    switch (level) {
      case ComplianceLevel.COMPLIANT:
        return 'compliant';
      case ComplianceLevel.PARTIAL:
        return 'partial';
      case ComplianceLevel.NON_COMPLIANT:
        return 'non-compliant';
      default:
        return 'unknown';
    }
  }

  getCheckBadgeClass(level: ComplianceLevel): string {
    switch (level) {
      case ComplianceLevel.COMPLIANT:
        return 'compliant';
      case ComplianceLevel.PARTIAL:
        return 'partial';
      case ComplianceLevel.NON_COMPLIANT:
        return 'non-compliant';
      default:
        return 'unknown';
    }
  }

  getCheckLabel(level: ComplianceLevel): string {
    switch (level) {
      case ComplianceLevel.COMPLIANT:
        return 'Compliant';
      case ComplianceLevel.PARTIAL:
        return 'Partial';
      case ComplianceLevel.NON_COMPLIANT:
        return 'Non-Compliant';
      default:
        return 'Unknown';
    }
  }

  getActionItems(): ComplianceCheck[] {
    if (!this.complianceReport) return [];
    return this.complianceReport.checks.filter(check => 
      check.level === ComplianceLevel.NON_COMPLIANT || 
      check.level === ComplianceLevel.PARTIAL
    );
  }

  getActionItemClass(level: ComplianceLevel): string {
    switch (level) {
      case ComplianceLevel.COMPLIANT:
        return 'compliant';
      case ComplianceLevel.PARTIAL:
        return 'partial';
      case ComplianceLevel.NON_COMPLIANT:
        return 'non-compliant';
      default:
        return 'unknown';
    }
  }

  // User-friendly methods for the new design
  getHealthStatusClass(level: ComplianceLevel): string {
    switch (level) {
      case ComplianceLevel.COMPLIANT:
        return 'health-good';
      case ComplianceLevel.PARTIAL:
        return 'health-warning';
      case ComplianceLevel.NON_COMPLIANT:
        return 'health-critical';
      default:
        return 'health-unknown';
    }
  }

  getHealthStatusTitle(level: ComplianceLevel): string {
    switch (level) {
      case ComplianceLevel.COMPLIANT:
        return 'Your Policy Looks Good!';
      case ComplianceLevel.PARTIAL:
        return 'Your Policy Needs Some Attention';
      case ComplianceLevel.NON_COMPLIANT:
        return 'Your Policy Needs Immediate Review';
      default:
        return 'Unable to Assess Your Policy';
    }
  }

  getHealthStatusDescription(level: ComplianceLevel): string {
    switch (level) {
      case ComplianceLevel.COMPLIANT:
        return 'Most important areas are well covered and clearly explained.';
      case ComplianceLevel.PARTIAL:
        return 'Some areas are well covered, but others need clarification or improvement.';
      case ComplianceLevel.NON_COMPLIANT:
        return 'Several important areas need immediate attention or are missing.';
      default:
        return 'We were unable to properly analyze your policy.';
    }
  }

  getHealthSummaryText(level: ComplianceLevel, score: number): string {
    const percentage = Math.round(score * 100);
    switch (level) {
      case ComplianceLevel.COMPLIANT:
        return `Your policy scored ${percentage}% - this means it covers the important areas well and should be easy to understand. You can feel confident about your coverage.`;
      case ComplianceLevel.PARTIAL:
        return `Your policy scored ${percentage}% - this means it covers most areas well, but there are some parts that could be clearer or more complete. Review the areas marked for attention.`;
      case ComplianceLevel.NON_COMPLIANT:
        return `Your policy scored ${percentage}% - this means there are important areas that need attention. Some key information may be missing or unclear. Consider discussing with your insurance provider.`;
      default:
        return `We couldn't properly analyze your policy. This might be because the text is unclear or incomplete. Consider getting a clearer copy of your policy.`;
    }
  }

  getFriendlyCheckName(checkName: string): string {
    const friendlyNames: { [key: string]: string } = {
      'Policy Clarity': 'How Clear Is Your Policy?',
      'Coverage Details': 'What Does Your Policy Cover?',
      'Exclusions': 'What Is NOT Covered?',
      'Claims Procedures': 'How to Make a Claim',
      'Contact Information': 'How to Get Help',
      'Terms and Conditions': 'Important Rules and Conditions'
    };
    return friendlyNames[checkName] || checkName;
  }

  getFriendlyCheckLabel(level: ComplianceLevel): string {
    switch (level) {
      case ComplianceLevel.COMPLIANT:
        return 'Good';
      case ComplianceLevel.PARTIAL:
        return 'Needs Attention';
      case ComplianceLevel.NON_COMPLIANT:
        return 'Needs Work';
      default:
        return 'Unclear';
    }
  }

  getFriendlyCheckMessage(check: ComplianceCheck): string {
    const friendlyMessages: { [key: string]: { [key: string]: string } } = {
      'Policy Clarity': {
        'compliant': 'Your policy is written in clear, easy-to-understand language.',
        'partial': 'Your policy is mostly clear, but some parts could be easier to understand.',
        'non_compliant': 'Your policy uses complex language that may be hard to understand.'
      },
      'Coverage Details': {
        'compliant': 'Your policy clearly explains what is covered and what benefits you can expect.',
        'partial': 'Your policy covers most important areas, but some details could be clearer.',
        'non_compliant': 'Your policy is missing important details about what is covered.'
      },
      'Exclusions': {
        'compliant': 'Your policy clearly explains what is not covered, so you know what to expect.',
        'partial': 'Your policy mentions some exclusions, but could be clearer about what is not covered.',
        'non_compliant': 'Your policy does not clearly explain what is not covered, which could lead to surprises.'
      },
      'Claims Procedures': {
        'compliant': 'Your policy clearly explains how to file a claim when you need to use your coverage.',
        'partial': 'Your policy has some information about claims, but could be more detailed.',
        'non_compliant': 'Your policy does not clearly explain how to file a claim, which could cause problems when you need help.'
      },
      'Contact Information': {
        'compliant': 'Your policy provides clear contact information so you can get help when needed.',
        'partial': 'Your policy has some contact information, but could be more complete.',
        'non_compliant': 'Your policy is missing important contact information, making it hard to get help.'
      },
      'Terms and Conditions': {
        'compliant': 'Your policy clearly explains the important rules and conditions.',
        'partial': 'Your policy covers most important terms, but some could be clearer.',
        'non_compliant': 'Your policy is missing important terms and conditions that you should know about.'
      }
    };

    const categoryMessages = friendlyMessages[check.check_name];
    if (categoryMessages && categoryMessages[check.level]) {
      return categoryMessages[check.level];
    }
    return check.message;
  }

  getFriendlyEvidence(evidence: string): string {
    // Convert technical evidence to user-friendly language
    const friendlyEvidence: { [key: string]: string } = {
      'coverage': 'Coverage information',
      'benefits': 'Benefits details',
      'limits': 'Coverage limits',
      'deductible': 'Deductible information',
      'coinsurance': 'Coinsurance details',
      'maximum benefit': 'Maximum benefit amount',
      'covered services': 'Services covered',
      'claim': 'How to file claims',
      'how to file': 'Claims filing process',
      'claim form': 'Claim forms available',
      'phone number': 'Phone contact',
      'contact': 'Contact information',
      'customer service': 'Customer service details',
      'terms and conditions': 'Terms and conditions',
      'policyholder': 'Policyholder information',
      'insured': 'Insured person details',
      'premium': 'Premium information',
      'renewal': 'Renewal process',
      'cancellation': 'Cancellation policy'
    };

    return friendlyEvidence[evidence.toLowerCase()] || evidence;
  }

  getFriendlyRecommendation(recommendation: string): string {
    // Convert technical recommendations to user-friendly advice
    if (!recommendation) return '';
    
    const friendlyRecommendations: { [key: string]: string } = {
      'Ensure comprehensive claims procedures with clear steps and contact information': 
        'Ask your insurance provider for a clear guide on how to file claims, including who to contact and what forms to fill out.',
      'Review policy language for clarity and accessibility': 
        'If any part of your policy is hard to understand, ask your insurance provider to explain it in simpler terms.',
      'Verify all contact information is current and accessible': 
        'Make sure you have the correct phone numbers and addresses for your insurance company.',
      'Confirm coverage details are complete and specific': 
        'Ask your insurance provider to clarify exactly what is covered and what is not covered.'
    };

    return friendlyRecommendations[recommendation] || recommendation;
  }

  getInsightCardClass(level: ComplianceLevel): string {
    switch (level) {
      case ComplianceLevel.COMPLIANT:
        return 'insight-good';
      case ComplianceLevel.PARTIAL:
        return 'insight-warning';
      case ComplianceLevel.NON_COMPLIANT:
        return 'insight-critical';
      default:
        return 'insight-unknown';
    }
  }

  getInsightStatusClass(level: ComplianceLevel): string {
    switch (level) {
      case ComplianceLevel.COMPLIANT:
        return 'status-good';
      case ComplianceLevel.PARTIAL:
        return 'status-warning';
      case ComplianceLevel.NON_COMPLIANT:
        return 'status-critical';
      default:
        return 'status-unknown';
    }
  }
}
