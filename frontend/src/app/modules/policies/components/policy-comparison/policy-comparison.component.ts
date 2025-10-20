import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { PolicyService } from '@core/services/policy.service';
import { PolicyComparisonService } from '@core/services/policy-comparison.service';
import { NotificationService } from '@core/services/notification.service';
import { RewardService } from '@core/services/reward.service';
import { AiHtmlRenderService } from '@core/services/ai-html-render.service';
import { Policy } from '@core/models/policy.model';
import { PolicyComparison, CreatePolicyComparisonRequest } from '@core/models/policy-comparison.model';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { LanguageService } from '@core/services/language.service';

@Component({
  selector: 'app-policy-comparison',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="comparison-container">
      <div class="comparison-content">
        <!-- Header -->
        <div class="comparison-header">
          <div class="header-main">
            <div class="header-info">
              <h1 class="header-title">{{ 'policyComparison.title' | translate }}</h1>
              <p class="header-subtitle">{{ 'policyComparison.subtitle' | translate }}</p>
            </div>
            <div class="header-actions">
              <button (click)="goBack()" class="back-btn">
                <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
                {{ 'policyComparison.backToPolicies' | translate }}
              </button>
            </div>
          </div>
        </div>

        <!-- Policy Selection -->
        <div class="policy-selection" *ngIf="!comparison">
          <div class="selection-content">
            <h2 class="selection-title">{{ 'policyComparison.selectPolicies' | translate }}</h2>
            <p class="selection-subtitle">{{ 'policyComparison.chooseExactly2' | translate }}</p>

            <!-- Policy Selection Cards -->
            <div class="policies-grid">
              <div class="ai-policy-card" 
                   *ngFor="let policy of availablePolicies; trackBy: trackByPolicyId"
                   [class.selected]="isPolicySelected(policy._id)"
                   (click)="togglePolicySelection(policy._id)">
                <div class="ai-card-header">
                  <div class="policy-title-section">
                    <h3 class="ai-policy-title">{{ policy.title }}</h3>
                    <div class="policy-status">
                      <span [class]="getStatusBadgeClasses(policy.status)" class="status-badge">
                        {{ policy.status | titlecase }}
                      </span>
                      @if (policy.status === 'publish') {
                        <span [class]="getLifecycleBadgeClasses(policy)" class="lifecycle-badge">
                          {{ getLifecycleInfo(policy).lifecycle | titlecase }}
                        </span>
                      }
                    </div>
                  </div>
                </div>
                
                <div class="ai-card-body">
                  <p class="ai-policy-description">{{ policy.description }}</p>
                  
                  <div class="policy-details">
                    <div class="detail-item">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      <span class="detail-text">{{ policy.hasPDF ? ('policyComparison.pdfAvailable' | translate) : ('policyComparison.textOnly' | translate) }}</span>
                    </div>
                    
                    <div class="detail-item">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      <span class="detail-text">{{ policy.updatedAt | date:'MMM d, yyyy' }}</span>
                    </div>
                  </div>
                </div>
                <div class="selection-indicator">
                  <svg *ngIf="isPolicySelected(policy._id)" class="check-icon" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                </div>
              </div>
            </div>

            <!-- Selection Summary -->
            <div class="selection-summary" *ngIf="selectedPolicyIds.length > 0">
              <h3>{{ 'policyComparison.selectedPolicies' | translate }} ({{ selectedPolicyIds.length }}/2)</h3>
              <div class="selected-policies">
                <div class="selected-policy" *ngFor="let policyId of selectedPolicyIds">
                  {{ getPolicyTitle(policyId) }}
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="selection-actions">
              <button (click)="clearSelection()" 
                      class="action-btn secondary"
                      [disabled]="selectedPolicyIds.length === 0">
                {{ 'policyComparison.clearSelection' | translate }}
              </button>
              <button (click)="startComparison()" 
                      class="action-btn primary"
                      [disabled]="selectedPolicyIds.length !== 2 || isComparing">
                <svg *ngIf="isComparing" class="btn-icon spinning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                <svg *ngIf="!isComparing" class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
                {{ isComparing ? ('policyComparison.comparing' | translate) : ('policyComparison.comparePolicies' | translate) }}
              </button>
            </div>
          </div>
        </div>

        <!-- Comparison Results -->
        <div class="comparison-results" *ngIf="comparison">
          <div class="results-header">
            <div class="results-title">
              <h2>{{ comparison.comparisonName }}</h2>
              <p class="results-subtitle">{{ 'policyComparison.created' | translate }} {{ comparison.createdAt | date:'MMM d, y at h:mm a' }}</p>
            </div>
            <div class="results-actions">
              <button (click)="regenerateInsights()" 
                      class="action-btn secondary"
                      [disabled]="isRegeneratingInsights">
                <svg *ngIf="isRegeneratingInsights" class="btn-icon spinning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                <svg *ngIf="!isRegeneratingInsights" class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                {{ isRegeneratingInsights ? ('policyComparison.regenerating' | translate) : ('policyComparison.regenerateAIInsights' | translate) }}
              </button>
              <button (click)="exportComparison('pdf')" class="action-btn secondary">
                <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                {{ 'policyComparison.exportPDF' | translate }}
              </button>
              <button (click)="exportComparison('json')" class="action-btn secondary">
                <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                {{ 'policyComparison.exportJSON' | translate }}
              </button>
              <button (click)="startNewComparison()" class="action-btn primary">
                <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                {{ 'policyComparison.newComparison' | translate }}
              </button>
            </div>
          </div>

          <!-- Side-by-Side Comparison -->
          <div class="comparison-grid">
            <!-- Policy 1 -->
            <div class="comparison-column">
              <div class="policy-header">
                <h3>{{ comparison.comparisonData.policy1.title }}</h3>
                <span [class]="getStatusBadgeClasses(comparison.comparisonData.policy1.status)" class="status-badge">
                  {{ comparison.comparisonData.policy1.status | titlecase }}
                </span>
              </div>
              
              <div class="policy-section">
                <h4>{{ 'policyComparison.description' | translate }}</h4>
                <p>{{ comparison.comparisonData.policy1.description }}</p>
              </div>

              <div class="policy-section">
                <h4>{{ 'policyComparison.content' | translate }}</h4>
                <div class="content-preview">{{ comparison.comparisonData.policy1.content | slice:0:500 }}{{ comparison.comparisonData.policy1.content.length > 500 ? '...' : '' }}</div>
              </div>

              <div class="policy-section">
                <h4>{{ 'policyComparison.metadata' | translate }}</h4>
                <div class="metadata-grid">
                  <div class="metadata-item">
                    <span class="label">{{ 'policyComparison.created' | translate }}:</span>
                    <span class="value">{{ comparison.comparisonData.policy1.createdAt | date:'MMM d, y' }}</span>
                  </div>
                  <div class="metadata-item">
                    <span class="label">{{ 'policyComparison.updated' | translate }}:</span>
                    <span class="value">{{ comparison.comparisonData.policy1.updatedAt | date:'MMM d, y' }}</span>
                  </div>
                  <div class="metadata-item">
                    <span class="label">{{ 'policyComparison.pdf' | translate }}:</span>
                    <span class="value">{{ comparison.comparisonData.policy1.hasPDF ? ('policyComparison.available' | translate) : ('policyComparison.notAvailable' | translate) }}</span>
                  </div>
                  <div class="metadata-item">
                    <span class="label">{{ 'policyComparison.aiReady' | translate }}:</span>
                    <span class="value">{{ comparison.comparisonData.policy1.pdfProcessed ? ('policyComparison.yes' | translate) : ('policyComparison.no' | translate) }}</span>
                  </div>
                </div>
              </div>

              <div class="policy-section" *ngIf="getPolicySummary(comparison.comparisonData.policy1)">
                <h4>{{ 'policyComparison.aiSummary' | translate }}</h4>
                <div class="ai-summary">{{ getPolicySummary(comparison.comparisonData.policy1) }}</div>
              </div>
            </div>

            <!-- Policy 2 -->
            <div class="comparison-column">
              <div class="policy-header">
                <h3>{{ comparison.comparisonData.policy2.title }}</h3>
                <span [class]="getStatusBadgeClasses(comparison.comparisonData.policy2.status)" class="status-badge">
                  {{ comparison.comparisonData.policy2.status | titlecase }}
                </span>
              </div>
              
              <div class="policy-section">
                <h4>{{ 'policyComparison.description' | translate }}</h4>
                <p>{{ comparison.comparisonData.policy2.description }}</p>
              </div>

              <div class="policy-section">
                <h4>{{ 'policyComparison.content' | translate }}</h4>
                <div class="content-preview">{{ comparison.comparisonData.policy2.content | slice:0:500 }}{{ comparison.comparisonData.policy2.content.length > 500 ? '...' : '' }}</div>
              </div>

              <div class="policy-section">
                <h4>{{ 'policyComparison.metadata' | translate }}</h4>
                <div class="metadata-grid">
                  <div class="metadata-item">
                    <span class="label">{{ 'policyComparison.created' | translate }}:</span>
                    <span class="value">{{ comparison.comparisonData.policy2.createdAt | date:'MMM d, y' }}</span>
                  </div>
                  <div class="metadata-item">
                    <span class="label">{{ 'policyComparison.updated' | translate }}:</span>
                    <span class="value">{{ comparison.comparisonData.policy2.updatedAt | date:'MMM d, y' }}</span>
                  </div>
                  <div class="metadata-item">
                    <span class="label">{{ 'policyComparison.pdf' | translate }}:</span>
                    <span class="value">{{ comparison.comparisonData.policy2.hasPDF ? ('policyComparison.available' | translate) : ('policyComparison.notAvailable' | translate) }}</span>
                  </div>
                  <div class="metadata-item">
                    <span class="label">{{ 'policyComparison.aiReady' | translate }}:</span>
                    <span class="value">{{ comparison.comparisonData.policy2.pdfProcessed ? ('policyComparison.yes' | translate) : ('policyComparison.no' | translate) }}</span>
                  </div>
                </div>
              </div>

              <div class="policy-section" *ngIf="getPolicySummary(comparison.comparisonData.policy2)">
                <h4>{{ 'policyComparison.aiSummary' | translate }}</h4>
                <div class="ai-summary">{{ getPolicySummary(comparison.comparisonData.policy2) }}</div>
              </div>
            </div>
          </div>

          <!-- AI Insights -->
          <div class="ai-insights" *ngIf="comparison.aiInsights">
            <div class="insights-header">
              <h3>🤖 {{ 'policyComparison.aiInsights' | translate }}</h3>
              <p class="insights-subtitle">{{ 'policyComparison.aiInsightsSubtitle' | translate }}</p>
            </div>

            <!-- Relevance Warning -->
            <div class="relevance-warning" *ngIf="comparison.aiInsights.isRelevant === false">
              <div class="warning-content">
                <svg class="warning-icon" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L1 21h22L12 2zm-1 8h2v6h-2v-6zm1 9.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                </svg>
                <div class="warning-text">
                  <h4>⚠️ {{ 'policyComparison.limitedComparisonValue' | translate }}</h4>
                  <p>{{ 'policyComparison.limitedComparisonDescription' | translate }}</p>
                </div>
              </div>
            </div>

            <!-- Structured AI Insights -->
            <div class="structured-insights" [innerHTML]="getFormattedAiInsights()"></div>
          </div>
        </div>

        <!-- Loading State -->
        <div class="loading-state" *ngIf="isLoading">
          <div class="loading-spinner">
            <div class="spinner"></div>
            <span>{{ 'policyComparison.loading' | translate }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Base Container Styles */
    .comparison-container {
      min-height: 100vh;
      background-color: var(--color-bg-secondary);
      /* Clear fixed topbar */
      padding: calc(64px + 1rem) 1rem 1rem 1rem;
      transition: background-color 0.3s ease;
    }

    .comparison-content {
      max-width: 1200px;
      margin: 0 auto;
      background-color: var(--color-bg-primary);
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px var(--color-shadow);
      overflow: hidden;
      border: 1px solid var(--color-border-primary);
      transition: all 0.3s ease;
    }

    /* Header Styles */
    .comparison-header {
      background-color: var(--color-bg-primary);
      border-bottom: 1px solid var(--color-border-primary);
      padding: 1rem 1.25rem;
      transition: all 0.3s ease;
    }

    .header-main {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header-title {
      font-size: 1.875rem;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0;
      transition: color 0.3s ease;
    }

    .header-subtitle {
      color: var(--color-text-secondary);
      margin: 0.5rem 0 0 0;
      font-size: 1rem;
      transition: color 0.3s ease;
    }

    .back-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background-color: var(--color-bg-secondary);
      color: var(--color-text-primary);
      border: 1px solid var(--color-border-primary);
      border-radius: 0.375rem;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .back-btn:hover {
      background-color: var(--color-bg-tertiary);
      border-color: var(--color-border-secondary);
      transform: translateY(-1px);
      box-shadow: 0 2px 4px var(--color-shadow);
    }

    .btn-icon {
      width: 1rem;
      height: 1rem;
    }

    /* Policy Selection Styles */
    .policy-selection {
      padding: 2rem;
    }

    .selection-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #111827;
      margin: 0 0 0.5rem 0;
    }

    .selection-subtitle {
      color: #6b7280;
      margin: 0 0 2rem 0;
      font-size: 1rem;
    }

    .policies-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
      gap: 2rem;
      margin-bottom: 2rem;
    }

    .policy-selection-card {
      border: 2px solid #e5e7eb;
      border-radius: 0.75rem;
      padding: 2rem;
      cursor: pointer;
      transition: all 0.2s ease;
      background-color: white;
      position: relative;
      min-height: 200px;
      display: flex;
      flex-direction: column;
    }

    .policy-selection-card:hover {
      border-color: #3b82f6;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
    }

    .policy-selection-card.selected {
      border-color: #3b82f6;
      background-color: #eff6ff;
      box-shadow: 0 4px 6px rgba(59, 130, 246, 0.15);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }

    .policy-title {
      font-size: 1.2rem;
      font-weight: 700;
      color: #111827;
      margin: 0;
      line-height: 1.3;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .status-badge {
      font-size: 0.75rem;
      font-weight: 500;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .status-publish {
      background-color: #d1fae5;
      color: #065f46;
    }

    .status-draft {
      background-color: #fef3c7;
      color: #92400e;
    }

    /* Lifecycle Badge Styles */
    .lifecycle-badge {
      font-size: 0.75rem;
      font-weight: 500;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-left: 0.5rem;
    }

    .lifecycle-active {
      background-color: #d1fae5;
      color: #065f46;
    }

    .lifecycle-expiring-soon {
      background-color: #fef3c7;
      color: #92400e;
    }

    .lifecycle-expired {
      background-color: #fee2e2;
      color: #991b1b;
    }

    /* Policy Status Container */
    .policy-status {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }

    .policy-description {
      color: #6b7280;
      font-size: 0.95rem;
      line-height: 1.5;
      margin: 0 0 1.5rem 0;
      flex: 1;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .policy-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .pdf-status.has-pdf {
      color: #059669;
      font-weight: 500;
    }

    .selection-indicator {
      position: absolute;
      top: 1rem;
      right: 1rem;
    }

    .check-icon {
      width: 1.25rem;
      height: 1.25rem;
      color: #3b82f6;
    }

    /* Selection Summary */
    .selection-summary {
      background-color: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }

    .selection-summary h3 {
      margin: 0 0 0.75rem 0;
      font-size: 1rem;
      font-weight: 600;
      color: #374151;
    }

    .selected-policies {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .selected-policy {
      background-color: #3b82f6;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
    }

    /* Action Buttons */
    .selection-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border: 1px solid transparent;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .action-btn.primary {
      background-color: #3b82f6;
      color: white;
    }

    .action-btn.primary:hover:not(:disabled) {
      background-color: #2563eb;
    }

    .action-btn.secondary {
      background-color: white;
      color: #374151;
      border-color: #d1d5db;
    }

    .action-btn.secondary:hover:not(:disabled) {
      background-color: #f9fafb;
      border-color: #9ca3af;
    }

    /* Comparison Results */
    .comparison-results {
      padding: 2rem;
    }

    .results-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .results-title h2 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #111827;
      margin: 0;
    }

    .results-subtitle {
      color: #6b7280;
      margin: 0.5rem 0 0 0;
      font-size: 0.875rem;
    }

    .results-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    /* Comparison Grid */
    .comparison-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin-bottom: 2rem;
      overflow: visible;
    }

    .comparison-column {
      background-color: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      padding: 1.5rem;
      min-width: 0; /* Allow content to shrink */
      overflow-wrap: break-word;
      word-wrap: break-word;
      word-break: break-word;
    }

    .policy-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .policy-header h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #111827;
      margin: 0;
    }

    .policy-section {
      margin-bottom: 1.5rem;
    }

    .policy-section h4 {
      font-size: 1rem;
      font-weight: 600;
      color: #374151;
      margin: 0 0 0.75rem 0;
    }

    .content-preview {
      background-color: white;
      padding: 1rem;
      border-radius: 0.375rem;
      border: 1px solid #e5e7eb;
      font-size: 0.875rem;
      line-height: 1.5;
      color: #6b7280;
      max-height: 200px;
      overflow-y: auto;
      word-wrap: break-word;
      word-break: break-word;
      white-space: pre-wrap;
    }

    .metadata-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      min-width: 0;
    }

    .metadata-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .metadata-item .label {
      font-size: 0.75rem;
      font-weight: 500;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .metadata-item .value {
      font-size: 0.875rem;
      color: #374151;
      font-weight: 500;
    }

    .ai-summary {
      background-color: white;
      padding: 1rem;
      border-radius: 0.375rem;
      border: 1px solid #e5e7eb;
      font-size: 0.875rem;
      line-height: 1.6;
      color: #374151;
      max-height: 250px;
      overflow-y: auto;
      word-wrap: break-word;
      word-break: break-word;
      white-space: pre-wrap;
    }

    /* AI Insights */
    .ai-insights {
      background-color: #fefffe;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      padding: 1.5rem;
      margin-top: 2rem;
    }

    .insights-header {
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .insights-header h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #111827;
      margin: 0;
    }

    .insights-subtitle {
      color: #6b7280;
      margin: 0.5rem 0 0 0;
      font-size: 0.875rem;
    }

    .insight-section {
      margin-bottom: 1.5rem;
    }

    .insight-section h4 {
      font-size: 1rem;
      font-weight: 600;
      color: #374151;
      margin: 0 0 0.75rem 0;
    }

    .differences-list,
    .recommendations-list {
      list-style: none;
      padding: 0;
      margin: 0;
      space-y: 0.5rem;
    }

    .differences-list li,
    .recommendations-list li {
      padding: 0.75rem;
      background-color: #f8fafc;
      border-radius: 0.375rem;
      border-left: 4px solid #3b82f6;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .recommendations-list li {
      border-left-color: #10b981;
      background-color: #f0fdf4;
    }

    /* Loading State */
    .loading-state {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 4rem 2rem;
    }

    .loading-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .loading-spinner span {
      font-size: 1rem;
      color: #6b7280;
    }

     /* Mobile Responsive Design */
    @media (max-width: 768px) {
      .comparison-container {
        padding: calc(56px + 0.5rem) 0.5rem 0.75rem 0.5rem; /* below mobile topbar */
      }

      .comparison-content {
        border-radius: 0;
        margin: 0;
        box-shadow: none;
        border: none;
      }

      .comparison-header {
        padding: 1rem 0.75rem;
        border-bottom: 1px solid var(--color-border-primary);
      }

      .header-main {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }

      .header-title {
        font-size: 1.5rem;
        line-height: 1.3;
      }

      .header-subtitle {
        font-size: 0.9rem;
      }

      .back-btn {
        width: 100%;
        justify-content: center;
        padding: 0.75rem 1rem;
        font-size: 0.9rem;
      }

      /* Policy Selection Mobile */
      .policy-selection {
        padding: 1rem;
      }

      .selection-title {
        font-size: 1.25rem;
        margin-bottom: 0.5rem;
      }

      .selection-subtitle {
        font-size: 0.9rem;
        margin-bottom: 1.5rem;
      }

      .policies-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .ai-policy-card {
        padding: 1rem;
        min-height: auto;
        border-radius: 0.75rem;
        border: 2px solid var(--color-border-primary);
        transition: all 0.3s ease;
      }

      .ai-policy-card:hover {
        border-color: var(--color-primary);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
      }

      .ai-policy-card.selected {
        border-color: var(--color-primary);
        background-color: var(--color-bg-secondary);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
      }

      .ai-policy-title {
        font-size: 1rem;
        line-height: 1.4;
        margin-bottom: 0.5rem;
        -webkit-line-clamp: 2;
      }

      .ai-policy-description {
        font-size: 0.875rem;
        line-height: 1.5;
        margin-bottom: 1rem;
        -webkit-line-clamp: 3;
      }

      .policy-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .detail-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8rem;
        color: var(--color-text-secondary);
      }

      .detail-item svg {
        width: 0.875rem;
        height: 0.875rem;
        flex-shrink: 0;
      }

      .selection-indicator {
        top: 0.75rem;
        right: 0.75rem;
        width: 1.5rem;
        height: 1.5rem;
      }

      .check-icon {
        width: 1rem;
        height: 1rem;
      }

      /* Selection Summary Mobile */
      .selection-summary {
        padding: 0.75rem;
        margin-bottom: 1rem;
        border-radius: 0.5rem;
      }

      .selection-summary h3 {
        font-size: 0.9rem;
        margin-bottom: 0.5rem;
      }

      .selected-policies {
        flex-direction: column;
        gap: 0.25rem;
      }

      .selected-policy {
        font-size: 0.8rem;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
      }

      /* Action Buttons Mobile */
      .selection-actions {
        flex-direction: column;
        gap: 0.75rem;
      }

      .action-btn {
        width: 100%;
        justify-content: center;
        padding: 0.875rem 1rem;
        font-size: 0.9rem;
        border-radius: 0.5rem;
      }

      .action-btn.primary {
        background: linear-gradient(135deg, var(--color-primary) 0%, #2563eb 100%);
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
      }

      .action-btn.secondary {
        background-color: var(--color-bg-secondary);
        border-color: var(--color-border-primary);
        color: var(--color-text-primary);
      }

      /* Comparison Results Mobile */
      .comparison-results {
        padding: 1rem;
      }

      .results-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .results-title h2 {
        font-size: 1.25rem;
        line-height: 1.3;
      }

      .results-subtitle {
        font-size: 0.8rem;
      }

      .results-actions {
        width: 100%;
        flex-direction: column;
        gap: 0.75rem;
      }

      .results-actions .action-btn {
        width: 100%;
        justify-content: center;
        padding: 0.75rem 1rem;
        font-size: 0.85rem;
      }

      /* Comparison Grid Mobile */
      .comparison-grid {
        grid-template-columns: 1fr;
        gap: 1.5rem;
        margin-bottom: 1.5rem;
      }

      .comparison-column {
        padding: 1rem;
        border-radius: 0.5rem;
      }

      .policy-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
        margin-bottom: 1rem;
        padding-bottom: 0.75rem;
      }

      .policy-header h3 {
        font-size: 1.1rem;
        line-height: 1.3;
      }

      .policy-section {
        margin-bottom: 1rem;
      }

      .policy-section h4 {
        font-size: 0.9rem;
        margin-bottom: 0.5rem;
      }

      .content-preview {
        font-size: 0.8rem;
        padding: 0.75rem;
        max-height: 150px;
        border-radius: 0.375rem;
      }

      .metadata-grid {
        grid-template-columns: 1fr;
        gap: 0.5rem;
      }

      .metadata-item {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
        border-bottom: 1px solid var(--color-border-primary);
        gap: 0.5rem;
      }

      .metadata-item:last-child {
        border-bottom: none;
      }

      .metadata-item .label {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--color-text-secondary) !important;
        opacity: 0.9;
        white-space: nowrap;
      }

      .metadata-item .value {
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--color-text-primary) !important;
        text-align: right;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 60%;
      }

      .ai-summary {
        font-size: 0.8rem;
        padding: 0.75rem;
        max-height: 200px;
        border-radius: 0.375rem;
      }

      /* AI Insights Mobile */
      .ai-insights {
        padding: 1rem;
        margin-top: 1.5rem;
        border-radius: 0.5rem;
      }

      .insights-header h3 {
        font-size: 1.1rem;
        margin-bottom: 0.5rem;
      }

      .insights-subtitle {
        font-size: 0.8rem;
      }

      .relevance-warning {
        padding: 0.75rem;
        margin: 1rem 0;
        border-radius: 0.5rem;
      }

      .warning-content {
        flex-direction: column;
        gap: 0.5rem;
      }

      .warning-icon {
        width: 1.25rem;
        height: 1.25rem;
      }

      .warning-text h4 {
        font-size: 0.9rem;
        margin-bottom: 0.25rem;
      }

      .warning-text p {
        font-size: 0.8rem;
      }

      /* Loading State Mobile */
      .loading-state {
        padding: 2rem 1rem;
      }

      .loading-spinner span {
        font-size: 0.9rem;
      }

      .spinner {
        width: 1.25rem;
        height: 1.25rem;
      }
    }

    /* Tablet Responsive Design */
    @media (min-width: 769px) and (max-width: 1024px) {
      .comparison-container {
        padding: 1rem;
      }

      .policies-grid {
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
      }

      .comparison-grid {
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
      }

      .results-actions {
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .results-actions .action-btn {
        flex: 1;
        min-width: 120px;
        font-size: 0.8rem;
        padding: 0.75rem 1rem;
      }

      .metadata-grid {
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
      }
    }

    /* Animation Styles */
    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .spinner {
      width: 1.5rem;
      height: 1.5rem;
      border: 2px solid #e5e7eb;
      border-top: 2px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    /* Relevance Indicator Styles */
    .relevance-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.75rem;
      padding: 0.5rem;
      background-color: #f8f9fa;
      border-radius: 0.375rem;
      font-size: 0.875rem;
    }

    .relevance-label {
      font-weight: 500;
      color: #374151;
    }

    .relevance-bar {
      flex: 1;
      height: 0.5rem;
      background-color: #e5e7eb;
      border-radius: 0.25rem;
      overflow: hidden;
    }

    .relevance-fill {
      height: 100%;
      transition: width 0.3s ease;
    }

    .relevance-fill.low {
      background-color: #ef4444;
    }

    .relevance-fill.medium {
      background-color: #f59e0b;
    }

    .relevance-fill.high {
      background-color: #10b981;
    }

    .relevance-value {
      font-weight: 600;
      color: #374151;
    }

    /* Warning Styles */
    .relevance-warning {
      margin: 1rem 0;
      padding: 1rem;
      background-color: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 0.5rem;
    }

    .warning-content {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .warning-icon {
      width: 1.5rem;
      height: 1.5rem;
      color: #f59e0b;
      flex-shrink: 0;
      margin-top: 0.125rem;
    }

    .warning-text h4 {
      margin: 0 0 0.5rem 0;
      color: #92400e;
      font-size: 1rem;
      font-weight: 600;
    }

    .warning-text p {
      margin: 0;
      color: #92400e;
      font-size: 0.875rem;
    }

    /* Coverage Grid Styles */
    .coverage-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 0.75rem;
    }

    .coverage-column {
      padding: 1rem;
      background-color: #f8f9fa;
      border-radius: 0.375rem;
      border: 1px solid #e5e7eb;
    }

    .coverage-column h5 {
      margin: 0 0 0.75rem 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
    }

    .coverage-list {
      margin: 0;
      padding-left: 1.25rem;
      list-style-type: disc;
    }

    .coverage-list li {
      margin-bottom: 0.25rem;
      font-size: 0.875rem;
      color: #6b7280;
    }


    /* Summary Content Styles */
    .summary-content {
      line-height: 1.6;
    }

    .summary-content strong {
      font-weight: 600;
      color: #374151;
    }

    .summary-content em {
      font-style: italic;
      color: #6b7280;
    }

    .summary-content code {
      background-color: #f3f4f6;
      padding: 0.125rem 0.25rem;
      border-radius: 0.25rem;
      font-family: 'Fira Code', 'Courier New', monospace;
      font-size: 0.875em;
    }

    /* Clear black text for AI insights in light mode */
    .insights-content p,
    .insights-content div,
    .summary-content,
    .differences-list,
    .recommendations-list,
    .coverage-analysis {
      color: var(--color-text-primary);
    }

    .insights-content ul,
    .insights-content li {
      color: var(--color-text-primary);
    }

    /* Selection indicator for AI policy cards */
    .selection-indicator {
      position: absolute;
      top: 1rem;
      right: 1rem;
      width: 2rem;
      height: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-primary);
      border-radius: 50%;
      color: white;
      opacity: 0;
      transform: scale(0.8);
      transition: all 0.3s ease;
    }

    .ai-policy-card {
      position: relative;
    }

    .ai-policy-card.selected .selection-indicator {
      opacity: 1;
      transform: scale(1);
    }

    .check-icon {
      width: 1.25rem;
      height: 1.25rem;
    }

    /* Dark Mode Styles */
    .dark .policy-selection {
      background-color: var(--color-bg-primary);
      color: var(--color-text-primary);
    }

    .dark .selection-title,
    .dark .selection-subtitle {
      color: var(--color-text-primary);
    }

    /* AI policy cards are already styled globally, just ensure selection indicator works */
    .dark .selection-indicator {
      color: var(--color-primary);
    }

    .dark .comparison-column {
      background-color: var(--color-bg-secondary);
      border-color: var(--color-border-primary);
    }

    /* Dark mode metadata section background */
    .dark .metadata-grid {
      background-color: var(--color-bg-secondary);
      border: 1px solid var(--color-border-primary);
      border-radius: 6px;
      padding: 0.5rem;
    }

    .dark .policy-header h3,
    .dark .section-title {
      color: var(--color-text-primary);
    }

    /* Ensure metadata colors are readable in dark mode */
    .dark .metadata-item .label {
      color: var(--color-text-secondary) !important;
      opacity: 0.9;
    }

    .dark .metadata-item .value {
      color: var(--color-text-primary) !important;
      font-weight: 600;
    }

    /* Enhanced dark mode metadata visibility */
    .dark .metadata-item {
      background-color: var(--color-bg-secondary);
      border-bottom: 1px solid var(--color-border-primary);
      padding: 0.5rem 0;
      border-radius: 4px;
      margin-bottom: 0.25rem;
    }

    .dark .metadata-item:last-child {
      border-bottom: none;
      margin-bottom: 0;
    }

    /* Mobile dark mode metadata fixes */
    @media (max-width: 768px) {
      /* Use white background with black text for metadata in mobile dark mode */
      .dark .metadata-grid {
        background-color: #ffffff !important; /* White background */
        border: 1px solid #e5e7eb !important;
        border-radius: 6px !important;
        padding: 0.5rem !important;
      }

      .dark .metadata-item {
        background-color: #ffffff !important; /* White background */
        border-bottom: 1px solid #e5e7eb !important;
        border-radius: 0 !important;
        padding: 0.5rem 0 !important;
        margin-bottom: 0 !important;
      }

      .dark .metadata-item:last-child {
        border-bottom: none !important;
      }

      .dark .metadata-item .label {
        color: #374151 !important; /* Dark gray for labels */
        font-weight: 600 !important;
        font-size: 0.75rem !important;
        opacity: 1 !important;
      }

      .dark .metadata-item .value {
        color: #111827 !important; /* Pure black for values */
        font-weight: 700 !important;
        font-size: 0.8rem !important;
      }
    }

    .dark .policy-meta,
    .dark .section-content {
      color: var(--color-text-secondary);
    }

    /* Dark mode section headers */
    .dark .policy-section h4 {
      color: var(--color-text-primary) !important;
      font-weight: 600;
      margin-bottom: 0.75rem;
    }

    /* Note: avoid non-standard selectors like :contains; generic header rule above suffices */

    .dark .content-preview,
    .dark .ai-summary {
      background-color: var(--color-bg-tertiary);
      border-color: var(--color-border-primary);
      color: var(--color-text-primary);
    }

    .dark .ai-insights {
      background-color: var(--color-bg-secondary);
      border-color: var(--color-border-primary);
    }

    .dark .insights-header h3 {
      color: var(--color-text-primary);
    }

    .dark .insights-subtitle {
      color: var(--color-text-secondary);
    }

    .dark .relevance-score {
      background-color: var(--color-bg-tertiary);
      border-color: var(--color-border-primary);
    }

    .dark .score-value {
      color: var(--color-text-primary);
    }

    .dark .score-label {
      color: var(--color-text-secondary);
    }

    .dark .insights-content h4 {
      color: var(--color-text-primary);
    }

    .dark .insights-content p,
    .dark .insights-content div,
    .dark .summary-content,
    .dark .differences-list,
    .dark .recommendations-list,
    .dark .coverage-analysis {
      color: #d1d5db !important;
    }

    .dark .insights-content {
      color: #d1d5db;
    }

    .dark .insights-content ul,
    .dark .insights-content li {
      color: #d1d5db;
    }

    .dark .summary-content pre,
    .dark .summary-content code {
      background-color: var(--color-bg-tertiary);
      color: var(--color-text-primary);
      border: 1px solid var(--color-border-primary);
    }

    .dark .action-btn.primary {
      background: linear-gradient(135deg, var(--color-primary) 0%, #2563eb 100%);
      color: white;
      border-color: var(--color-primary);
    }

    .dark .action-btn.secondary {
      background-color: var(--color-bg-secondary);
      color: var(--color-text-primary);
      border-color: var(--color-border-primary);
    }

    .dark .action-btn:hover {
      box-shadow: 0 4px 8px var(--color-shadow);
    }

    .dark .status-badge.status-publish {
      background-color: #065f46;
      color: #a7f3d0;
    }

    .dark .status-badge.status-draft {
      background-color: #92400e;
      color: #fcd34d;
    }

    .dark .results-title h2,
    .dark .results-subtitle {
      color: var(--color-text-primary);
    }

    .dark .selection-summary h3 {
      color: var(--color-text-primary);
    }

    .dark .selected-policy {
      background-color: var(--color-bg-tertiary);
      color: var(--color-text-primary);
      border-color: var(--color-border-primary);
    }

    /* Loading and spinner states in dark mode */
    .dark .spinning {
      border-color: var(--color-border-primary);
      border-top-color: var(--color-text-primary);
    }

    /* Enhanced hover effects in dark mode */
    .dark .back-btn:hover,
    .dark .action-btn:hover {
      box-shadow: 0 4px 12px var(--color-shadow);
    }

    /* Dark mode transitions */
    .dark * {
      transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
    }

    /* AI Content Styling */
    .structured-insights {
      width: 100%;
    }

    /* AI Insights Sections */
    ::ng-deep .ai-insights-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    ::ng-deep .ai-insights-section {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border-primary);
      border-radius: 0.5rem;
      padding: 1.25rem;
      transition: all 0.3s ease;
    }

    ::ng-deep .ai-insights-section:hover {
      box-shadow: 0 2px 8px var(--color-shadow);
    }

    ::ng-deep .insights-header {
      color: var(--color-primary);
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 0.75rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* Relevance Score Styling */
    ::ng-deep .relevance-section .relevance-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    ::ng-deep .relevance-label {
      font-weight: 500;
      color: var(--color-text-secondary);
      white-space: nowrap;
    }

    ::ng-deep .relevance-bar {
      flex: 1;
      min-width: 100px;
      height: 0.5rem;
      background-color: var(--color-bg-tertiary);
      border-radius: 0.25rem;
      overflow: hidden;
    }

    ::ng-deep .relevance-fill {
      height: 100%;
      transition: width 0.3s ease;
      border-radius: 0.25rem;
    }

    ::ng-deep .relevance-fill.score-excellent {
      background: linear-gradient(90deg, #10b981, #059669);
    }

    ::ng-deep .relevance-fill.score-good {
      background: linear-gradient(90deg, #3b82f6, #2563eb);
    }

    ::ng-deep .relevance-fill.score-moderate {
      background: linear-gradient(90deg, #f59e0b, #d97706);
    }

    ::ng-deep .relevance-fill.score-low {
      background: linear-gradient(90deg, #ef4444, #dc2626);
    }

    ::ng-deep .relevance-value {
      font-weight: 600;
      color: var(--color-text-primary);
      white-space: nowrap;
    }

    /* AI Content Typography */
    ::ng-deep .ai-content {
      line-height: 1.6;
      color: var(--color-text-primary);
    }

    ::ng-deep .ai-header-1,
    ::ng-deep .ai-header-2,
    ::ng-deep .ai-header-3 {
      color: var(--color-text-primary);
      font-weight: 600;
      margin: 1rem 0 0.5rem 0;
    }

    ::ng-deep .ai-header-1 {
      font-size: 1.5rem;
    }

    ::ng-deep .ai-header-2 {
      font-size: 1.25rem;
    }

    ::ng-deep .ai-header-3 {
      font-size: 1.125rem;
    }

    ::ng-deep .ai-paragraph {
      margin: 0.75rem 0;
      color: var(--color-text-primary);
    }

    ::ng-deep .ai-list {
      margin: 0.75rem 0;
      padding-left: 1.5rem;
      list-style-type: disc;
    }

    ::ng-deep .ai-list-item {
      margin: 0.5rem 0;
      color: var(--color-text-primary);
      line-height: 1.5;
    }

    ::ng-deep .inline-code {
      background-color: var(--color-bg-tertiary);
      color: var(--color-primary);
      padding: 0.125rem 0.25rem;
      border-radius: 0.25rem;
      font-family: 'Fira Code', 'Courier New', monospace;
      font-size: 0.875em;
    }

    /* Specific Insight Sections */
    ::ng-deep .summary-section {
      border-left: 4px solid var(--color-primary);
    }

    ::ng-deep .differences-section {
      border-left: 4px solid #f59e0b;
    }

    ::ng-deep .recommendations-section {
      border-left: 4px solid #10b981;
    }

    ::ng-deep .coverage-section {
      border-left: 4px solid #8b5cf6;
    }

    /* Coverage Comparison Grid */
    ::ng-deep .coverage-comparison {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 0.75rem;
    }

    ::ng-deep .coverage-column {
      background: var(--color-bg-tertiary);
      border-radius: 0.375rem;
      padding: 1rem;
      border: 1px solid var(--color-border-primary);
    }

    ::ng-deep .coverage-policy-title {
      color: var(--color-text-primary);
      font-size: 0.875rem;
      font-weight: 600;
      margin: 0 0 0.75rem 0;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--color-border-primary);
    }

    ::ng-deep .coverage-list {
      margin: 0;
      padding-left: 1.25rem;
      list-style-type: disc;
    }

    ::ng-deep .coverage-item {
      margin: 0.25rem 0;
      color: var(--color-text-secondary);
      font-size: 0.875rem;
      line-height: 1.5;
    }

    /* Chat Message Styling */
    ::ng-deep .chat-message {
      margin: 1rem 0;
      border-radius: 0.5rem;
      overflow: hidden;
    }

    ::ng-deep .user-message {
      background: var(--color-primary);
      color: white;
      margin-left: 2rem;
      text-align: right;
    }

    ::ng-deep .ai-message {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border-primary);
      margin-right: 2rem;
    }

    ::ng-deep .message-content {
      padding: 1rem;
    }

    ::ng-deep .message-timestamp {
      font-size: 0.75rem;
      color: var(--color-text-secondary);
      margin-top: 0.5rem;
      text-align: right;
    }

    /* Enhanced Mobile AI Content */
    @media (max-width: 768px) {
      ::ng-deep .coverage-comparison {
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }

      ::ng-deep .coverage-column {
        padding: 0.75rem;
        border-radius: 0.5rem;
      }

      ::ng-deep .coverage-policy-title {
        font-size: 0.8rem;
        margin-bottom: 0.5rem;
      }

      ::ng-deep .coverage-item {
        font-size: 0.75rem;
        margin: 0.2rem 0;
      }

      ::ng-deep .relevance-section .relevance-header {
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
      }

      ::ng-deep .relevance-bar {
        min-width: auto;
        height: 0.375rem;
      }

      ::ng-deep .user-message,
      ::ng-deep .ai-message {
        margin-left: 0;
        margin-right: 0;
        border-radius: 0.5rem;
      }

      ::ng-deep .message-content {
        padding: 0.75rem;
        font-size: 0.85rem;
      }

      ::ng-deep .message-timestamp {
        font-size: 0.7rem;
        margin-top: 0.25rem;
      }

      /* AI Insights Mobile Typography */
      ::ng-deep .ai-content {
        font-size: 0.85rem;
        line-height: 1.5;
      }

      ::ng-deep .ai-header-1 {
        font-size: 1.25rem;
        margin: 0.75rem 0 0.5rem 0;
      }

      ::ng-deep .ai-header-2 {
        font-size: 1.1rem;
        margin: 0.75rem 0 0.5rem 0;
      }

      ::ng-deep .ai-header-3 {
        font-size: 1rem;
        margin: 0.5rem 0 0.25rem 0;
      }

      ::ng-deep .ai-paragraph {
        margin: 0.5rem 0;
        font-size: 0.85rem;
      }

      ::ng-deep .ai-list {
        margin: 0.5rem 0;
        padding-left: 1.25rem;
      }

      ::ng-deep .ai-list-item {
        margin: 0.25rem 0;
        font-size: 0.85rem;
        line-height: 1.4;
      }

      ::ng-deep .inline-code {
        font-size: 0.8em;
        padding: 0.1rem 0.2rem;
      }

      /* AI Insights Sections Mobile */
      ::ng-deep .ai-insights-section {
        padding: 0.75rem;
        margin-bottom: 1rem;
        border-radius: 0.5rem;
      }

      ::ng-deep .insights-header {
        font-size: 0.9rem;
        margin-bottom: 0.5rem;
      }

      /* Structured Insights Mobile */
      ::ng-deep .structured-insights {
        font-size: 0.85rem;
        line-height: 1.5;
      }

      ::ng-deep .structured-insights h1,
      ::ng-deep .structured-insights h2,
      ::ng-deep .structured-insights h3,
      ::ng-deep .structured-insights h4 {
        font-size: 0.95rem;
        margin: 0.75rem 0 0.5rem 0;
        line-height: 1.3;
      }

      ::ng-deep .structured-insights p {
        font-size: 0.85rem;
        margin: 0.5rem 0;
        line-height: 1.5;
      }

      ::ng-deep .structured-insights ul,
      ::ng-deep .structured-insights ol {
        margin: 0.5rem 0;
        padding-left: 1.25rem;
      }

      ::ng-deep .structured-insights li {
        font-size: 0.85rem;
        margin: 0.25rem 0;
        line-height: 1.4;
      }

      ::ng-deep .structured-insights strong {
        font-weight: 600;
      }

      ::ng-deep .structured-insights em {
        font-style: italic;
      }

      ::ng-deep .structured-insights code {
        font-size: 0.8em;
        padding: 0.1rem 0.2rem;
        border-radius: 0.2rem;
      }

      ::ng-deep .structured-insights blockquote {
        margin: 0.75rem 0;
        padding: 0.5rem 0.75rem;
        border-left: 3px solid var(--color-primary);
        background-color: var(--color-bg-tertiary);
        border-radius: 0 0.25rem 0.25rem 0;
        font-style: italic;
      }
    }
  `]
})
export class PolicyComparisonComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Component state
  availablePolicies: Policy[] = [];
  selectedPolicyIds: string[] = [];
  comparison: PolicyComparison | null = null;
  isLoading = false;
  isComparing = false;
  isRegeneratingInsights = false;

  constructor(
    private policyService: PolicyService,
    private comparisonService: PolicyComparisonService,
    private notificationService: NotificationService,
    private rewardService: RewardService,
    private router: Router,
    private aiHtmlRenderService: AiHtmlRenderService,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.loadPolicies();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPolicies(): void {
    this.isLoading = true;
    this.policyService.getMyPolicies()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (policies) => {
          // Filter published policies and exclude expired ones
          const publishedPolicies = policies.filter(p => p.status === 'publish');
          this.availablePolicies = this.policyService.getValidPoliciesForAI(publishedPolicies);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Failed to load policies:', error);
          this.notificationService.showError('Failed to load policies');
          this.isLoading = false;
        }
      });
  }

  togglePolicySelection(policyId: string): void {
    if (this.selectedPolicyIds.includes(policyId)) {
      this.selectedPolicyIds = this.selectedPolicyIds.filter(id => id !== policyId);
    } else if (this.selectedPolicyIds.length < 2) {
      this.selectedPolicyIds.push(policyId);
    } else {
      this.notificationService.showWarning('You can only select 2 policies for comparison');
    }
  }

  isPolicySelected(policyId: string): boolean {
    return this.selectedPolicyIds.includes(policyId);
  }

  clearSelection(): void {
    this.selectedPolicyIds = [];
  }

  startComparison(): void {
    if (this.selectedPolicyIds.length !== 2) {
      this.notificationService.showError('Please select exactly 2 policies');
      return;
    }

    this.isComparing = true;
    const request: CreatePolicyComparisonRequest = {
      policyIds: [this.selectedPolicyIds[0], this.selectedPolicyIds[1]],
      generateAIInsights: true
    };

    this.comparisonService.createComparison(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (comparison) => {
          this.comparison = comparison;
          this.isComparing = false;
          this.notificationService.showSuccess('Policy comparison created successfully');
          
          // Record reward: policy comparison created
          this.rewardService.recordActivity({
            type: 'policy_comparison',
            name: 'Policy Comparison Created',
            points: 15,
            metadata: {
              policy1Id: this.selectedPolicyIds[0],
              policy2Id: this.selectedPolicyIds[1],
              policy1Title: this.getPolicyTitle(this.selectedPolicyIds[0]),
              policy2Title: this.getPolicyTitle(this.selectedPolicyIds[1]),
              comparisonId: comparison._id,
              action: 'comparison_created'
            }
          }).subscribe({
            next: (response) => {
              console.log('🎖️ Policy comparison reward recorded:', response);
            },
            error: (error) => {
              console.error('❌ Failed to record policy comparison reward:', error);
            }
          });
        },
        error: (error) => {
          console.error('Failed to create comparison:', error);
          this.notificationService.showError('Failed to create policy comparison');
          this.isComparing = false;
        }
      });
  }

  regenerateInsights(): void {
    if (!this.comparison) return;

    this.isRegeneratingInsights = true;
    this.comparisonService.regenerateAIInsights(this.comparison._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedComparison) => {
          this.comparison = updatedComparison;
          this.isRegeneratingInsights = false;
          this.notificationService.showSuccess('AI insights regenerated successfully');
        },
        error: (error) => {
          console.error('Failed to regenerate insights:', error);
          this.notificationService.showError('Failed to regenerate AI insights');
          this.isRegeneratingInsights = false;
        }
      });
  }

  exportComparison(format: 'pdf' | 'json'): void {
    if (!this.comparison) return;

    this.comparisonService.downloadComparison(this.comparison, format);
  }

  startNewComparison(): void {
    this.comparison = null;
    this.selectedPolicyIds = [];
  }

  goBack(): void {
    this.router.navigate(['/policies']);
  }

  // Helper methods
  getPolicyTitle(policyId: string): string {
    const policy = this.availablePolicies.find(p => p._id === policyId);
    return policy ? policy.title : 'Unknown Policy';
  }

  trackByPolicyId(index: number, policy: Policy): string {
    return policy._id;
  }

  getStatusBadgeClasses(status: string): string {
    switch (status) {
      case 'publish':
        return 'status-badge status-publish';
      case 'draft':
        return 'status-badge status-draft';
      default:
        return 'status-badge status-draft';
    }
  }

  formatSummaryText(summary: string): string {
    if (!summary) return '';
    
    // Convert markdown-style formatting to HTML
    return summary
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
      .replace(/_(.*?)_/g, '<em>$1</em>') // Italic text
      .replace(/`(.*?)`/g, '<code>$1</code>') // Code snippets
      .replace(/\n/g, '<br>'); // Line breaks
  }

  getFormattedAiInsights(): any {
    if (!this.comparison?.aiInsights) {
      return null;
    }
    
    return this.aiHtmlRenderService.formatPolicyInsights(this.comparison.aiInsights);
  }

  getLifecycleInfo(policy: Policy): any {
    return this.policyService.calculatePolicyLifecycle(policy);
  }

  getLifecycleBadgeClasses(policy: Policy): string {
    const lifecycleInfo = this.getLifecycleInfo(policy);
    switch (lifecycleInfo.lifecycle) {
      case 'active':
        return 'lifecycle-badge lifecycle-active';
      case 'expiring-soon':
        return 'lifecycle-badge lifecycle-expiring-soon';
      case 'expired':
        return 'lifecycle-badge lifecycle-expired';
      default:
        return 'lifecycle-badge lifecycle-active';
    }
  }

  getPolicySummary(policy: any): string {
    // Check for any available summary in order of preference
    return policy.aiSummary || 
           policy.aiSummaryStandard || 
           policy.aiSummaryDetailed || 
           policy.aiSummaryBrief || 
           '';
  }
}
