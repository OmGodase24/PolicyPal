import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { PolicyService } from '@core/services/policy.service';
import { NotificationService } from '@core/services/notification.service';
import { AIService } from '@core/services/ai.service';
import { UserPreferencesService } from '@core/services/user-preferences.service';
import { AuthService } from '@core/services/auth.service';
import { RewardService } from '@core/services/reward.service';
import { Policy } from '@core/models/policy.model';
import { SummaryLevel, SummaryLevelResponse, PolicySummaryInfo } from '@core/models/summary-level.model';
import { ComplianceModalComponent } from '../compliance-modal/compliance-modal.component';
import { DLPScanComponent } from '../dlp-scan/dlp-scan.component';
import { ComplianceReport } from '@core/models/compliance.model';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { DLPService } from '@core/services/dlp.service';

@Component({
  selector: 'app-policy-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, ComplianceModalComponent, DLPScanComponent, TranslatePipe],
  template: `
    <div class="policy-detail-container">
      <div class="policy-detail-content">
        @if (isLoading) {
          <div class="loading-state">
            <div class="loading-spinner">
              <div class="spinner"></div>
              <span>{{ 'policies.loading' | translate }}</span>
            </div>
          </div>
        } @else if (policy) {
          <!-- Policy Header -->
          <div class="policy-header">
            <div class="policy-header-main">
              <div class="policy-title-section">
                <h1 class="policy-title">{{ policy.title }}</h1>
                <div class="policy-meta">
                  <span [class]="getStatusBadgeClasses(policy.status)" class="status-badge">
                    {{ policy.status | titlecase }}
                  </span>
                  @if (policy.status === 'publish') {
                    <span [class]="getLifecycleBadgeClasses(policy)" class="lifecycle-badge">
                      {{ getLifecycleInfo(policy).lifecycle | titlecase }}
                    </span>
                  }
                  <span class="policy-date">{{ 'policies.updated' | translate }} {{ policy.updatedAt | date:'MMM d, y' }}</span>
                  @if (policy.expiryDate) {
                    <span class="policy-expiry" [class]="getExpiryDateClass(policy)">
                      {{ 'policies.expires' | translate }} {{ policy.expiryDate | date:'MMM d, y' }}
                    </span>
                  }
                </div>
              </div>
              <div class="policy-actions">
                @if (policy.status === 'draft') {
                  <button (click)="editPolicy()" class="action-btn primary">
                    <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                    {{ 'policies.editPolicy' | translate }}
                  </button>
                }
                
                
                <button (click)="goBack()" class="action-btn secondary">
                  <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                  </svg>
                  {{ 'policies.backToPolicies' | translate }}
                </button>
              </div>
            </div>
          </div>

          <!-- Policy Content -->
          <div class="policy-content">
            <div class="policy-main">
              <!-- Description -->
              @if (policy.description) {
                <div class="policy-section">
                  <h2 class="section-title">{{ 'policies.description' | translate }}</h2>
                  <div class="section-content">
                    <p class="policy-description">{{ policy.description }}</p>
                  </div>
                </div>
              }

              <!-- Content -->
              @if (policy.content) {
                <div class="policy-section">
                  <h2 class="section-title">{{ 'policies.content' | translate }}</h2>
                  <div class="section-content">
                    <div class="policy-content-text">{{ policy.content }}</div>
                  </div>
                </div>
              }


              <!-- PDF Information -->
              @if (policy.hasPDF) {
                <div class="policy-section">
                  <h2 class="section-title">{{ 'policies.pdfDocument' | translate }}</h2>
                  <div class="section-content">
                    <div class="pdf-info-card">
                      <div class="pdf-info">
                        <svg class="pdf-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                        </svg>
                        <div class="pdf-details">
                          <span class="pdf-filename">{{ policy.pdfFilename || 'Unknown file' }}</span>
                          <span class="pdf-size">{{ formatFileSize(policy.pdfSize) }}</span>
                          <span class="pdf-status" [class]="policy.pdfProcessed ? 'processed' : 'processing'">
                            {{ policy.pdfProcessed ? ('policies.processed' | translate) : ('policies.processing' | translate) }}
                          </span>
                        </div>
                      </div>
                  <div class="pdf-actions">
                    @if (checkingPDFAvailability) {
                      <button disabled class="action-btn secondary">
                        <div class="spinner w-4 h-4"></div>
                        Checking PDF...
                      </button>
                      <button disabled class="action-btn primary">
                        <div class="spinner w-4 h-4"></div>
                        Checking PDF...
                      </button>
                    } @else if (pdfPreviewAvailable) {
                      <button (click)="togglePDFPreview()" [disabled]="isLoadingPreview" class="action-btn secondary">
                        @if (isLoadingPreview) {
                          <div class="spinner w-4 h-4"></div>
                        } @else {
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                          </svg>
                        }
                        {{ isLoadingPreview ? ('common.loading' | translate) : (showPDFPreview ? ('policies.hidePreview' | translate) : ('policies.previewPDF' | translate)) }}
                      </button>
                      <button (click)="downloadPDF()" [disabled]="isDownloading" class="action-btn primary">
                        @if (isDownloading) {
                          <div class="spinner w-4 h-4"></div>
                        } @else {
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                          </svg>
                        }
                        {{ isDownloading ? ('policies.downloading' | translate) : ('policies.download' | translate) }}
                      </button>
                    } @else {
                      <button disabled class="action-btn secondary disabled">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                        {{ 'policies.previewNotAvailable' | translate }}
                      </button>
                      <button disabled class="action-btn primary disabled">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        {{ 'policies.downloadNotAvailable' | translate }}
                      </button>
                    }
                  </div>
                    </div>
                    
                    <!-- PDF Preview -->
                    @if (showPDFPreview && pdfUrl) {
                      <div class="pdf-preview-container">
                        <div class="pdf-preview-header">
                          <h3 class="pdf-preview-title">PDF Preview</h3>
                          <button (click)="togglePDFPreview()" class="close-preview-btn">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                          </button>
                        </div>
                        <div class="pdf-preview-content">
                          <div style="padding: 1rem; background: #f0f0f0; margin-bottom: 1rem; border-radius: 4px; font-family: monospace; font-size: 12px;">
                            <strong>Debug Info:</strong><br>
                            showPDFPreview: {{ showPDFPreview }}<br>
                            pdfUrl: {{ pdfUrl }}<br>
                            pdfUrl type: {{ typeof pdfUrl }}<br>
                            pdfUrl length: {{ pdfUrl.length || 'N/A' }}
                          </div>
                          
                          <!-- PDF Preview with Sanitized URL -->
                          <div style="margin-bottom: 1rem;">
                            <h4>PDF Preview (Sanitized Blob URL)</h4>
                            <div style="width: 100%; height: 600px; border: 1px solid #ccc; position: relative;">
                              <iframe 
                                [src]="safePdfUrl" 
                                style="width: 100%; height: 100%; border: none;"
                                title="PDF Preview"
                                (load)="onIframeLoad()"
                                (error)="onIframeError($event)">
                              </iframe>
                            </div>
                          </div>
                          
                          <!-- PDF.js Viewer as Backup -->
                          <div style="margin-bottom: 1rem;">
                            <h4>PDF.js Viewer (Backup)</h4>
                            <div style="width: 100%; height: 600px; border: 1px solid #ccc; position: relative;">
                              <iframe 
                                [src]="getPDFViewerUrl()" 
                                style="width: 100%; height: 100%; border: none;"
                                title="PDF.js Viewer">
                              </iframe>
                            </div>
                          </div>
                          
                          <!-- Alternative: Direct download -->
                          <div style="margin-bottom: 1rem;">
                            <h4>Alternative Methods</h4>
                            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                              <a [href]="getPDFUrl()" target="_blank" 
                                 style="padding: 0.5rem 1rem; background: #007bff; color: white; text-decoration: none; border-radius: 4px;">
                                📄 Open PDF in New Tab
                              </a>
                              <button (click)="downloadPDF()" 
                                      style="padding: 0.5rem 1rem; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                💾 Download PDF
                              </button>
                              <button (click)="debugPDFData()" 
                                      style="padding: 0.5rem 1rem; background: #ffc107; color: black; border: none; border-radius: 4px; cursor: pointer;">
                                🔍 Debug PDF Data
                              </button>
                              <button (click)="testPDFDirectly()" 
                                      style="padding: 0.5rem 1rem; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                🧪 Test PDF Directly
                              </button>
                            </div>
                          </div>
                          
                          <div style="margin-top: 1rem;">
                            <h4>Debug PDF Data</h4>
                            <button (click)="debugPDFData()" style="padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                              Check PDF Data Integrity
                            </button>
                            <div *ngIf="pdfDebugInfo" style="margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 4px; font-family: monospace; font-size: 12px;">
                              <strong>PDF Debug Info:</strong><br>
                              Length: {{ pdfDebugInfo.length }}<br>
                              Is Buffer: {{ pdfDebugInfo.isBuffer }}<br>
                              Header (hex): {{ pdfDebugInfo.header }}<br>
                              First 20 bytes: {{ pdfDebugInfo.firstBytes }}<br>
                              Last 20 bytes: {{ pdfDebugInfo.lastBytes }}<br>
                              Sample (hex): {{ pdfDebugInfo.sample }}
                            </div>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Draft Policy Notice -->
              @if (policy.status === 'draft') {
                <div class="policy-section draft-notice">
                  <div class="draft-notice-content">
                    <div class="draft-notice-icon">
                      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                      </svg>
                    </div>
                    <div class="draft-notice-text">
                      <h3 class="draft-notice-title">{{ 'policies.policyDetail.draftPolicyTitle' | translate }}</h3>
                      <p class="draft-notice-description">{{ 'policies.policyDetail.draftPolicyDescription' | translate }}</p>
                      <div class="draft-notice-features">
                        <div class="feature-item">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          <span>{{ 'policies.policyDetail.aiSummaryAvailable' | translate }}</span>
                        </div>
                        <div class="feature-item">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          <span>{{ 'policies.policyDetail.complianceCheckAvailable' | translate }}</span>
                        </div>
                        <div class="feature-item available-now">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          <span>{{ 'policies.policyDetail.dlpScanAvailableNow' | translate }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              }

              <!-- AI Summary with Level Selector - Only for Published Policies -->
              @if (policy.status === 'publish' && (policy.aiSummary || currentSummary)) {
                <div class="policy-section">
                  <div class="section-header">
                    <h2 class="section-title">{{ 'policies.aiSummary' | translate }}</h2>
                    <div class="summary-controls">
                      <div class="summary-level-selector">
                        <label for="summaryLevel" class="summary-level-label">{{ 'policies.summaryLevel' | translate }}</label>
                        <select 
                          id="summaryLevel" 
                          [(ngModel)]="summaryLevel" 
                          (change)="onSummaryLevelChange()"
                          [disabled]="isRegeneratingSummary"
                          class="summary-level-select">
                          <option [value]="SummaryLevel.BRIEF">{{ 'policies.brief' | translate }}</option>
                          <option [value]="SummaryLevel.STANDARD">{{ 'policies.standard' | translate }}</option>
                          <option [value]="SummaryLevel.DETAILED">{{ 'policies.detailed' | translate }}</option>
                        </select>
                      </div>
                      <button 
                        (click)="regenerateSummary()" 
                        [disabled]="isRegeneratingSummary"
                        class="regenerate-btn">
                        @if (isRegeneratingSummary) {
                          <div class="spinner w-4 h-4"></div>
                          {{ 'policies.regenerating' | translate }}
                        } @else {
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                          </svg>
                          {{ 'policies.regenerate' | translate }}
                        }
                      </button>
                    </div>
                  </div>
                  <div class="section-content">
                    <div class="summary-level-info">
                      <span class="summary-level-badge">{{ getSummaryLevelLabel(summaryLevel) }}</span>
                      <span class="summary-level-description">{{ getSummaryLevelDescription(summaryLevel) }}</span>
                    </div>
                    <div class="ai-summary">
                      @if (isRegeneratingSummary) {
                        <div class="summary-loading">
                          <div class="spinner"></div>
                          <span>Loading {{ getSummaryLevelLabel(summaryLevel) }} summary...</span>
                        </div>
                      } @else {
                        <p>{{ currentSummary || policy.aiSummary }}</p>
                        @if (summaryInfo) {
                          <small class="ai-summary-date">
                            @if (summaryLevel === SummaryLevel.BRIEF && summaryInfo.brief.exists) {
                              Generated {{ summaryInfo.brief.generatedAt | date:'MMM d, y at h:mm a' }}
                            } @else if (summaryLevel === SummaryLevel.STANDARD && summaryInfo.standard.exists) {
                              Generated {{ summaryInfo.standard.generatedAt | date:'MMM d, y at h:mm a' }}
                            } @else if (summaryLevel === SummaryLevel.DETAILED && summaryInfo.detailed.exists) {
                              Generated {{ summaryInfo.detailed.generatedAt | date:'MMM d, y at h:mm a' }}
                            } @else if (policy.aiSummaryGeneratedAt) {
                              Generated {{ policy.aiSummaryGeneratedAt | date:'MMM d, y at h:mm a' }}
                            }
                          </small>
                        }
                      }
                    </div>
                  </div>
                </div>
              }

              <!-- DLP Scan - Only for Draft Policies (Before Publishing) -->
              @if (policy && policy.status === 'draft' && (policy.hasPDF || policy.pdfText || policy.content) && dlpEnabled) {
                <div class="policy-section">
                  <app-dlp-scan
                    [policyText]="policy.content || policy.pdfText || ''"
                    [policyId]="policy._id"
                    [userId]="currentUser?._id || ''"
                    (scanComplete)="onDLPScanComplete($event)">
                  </app-dlp-scan>
                </div>
              }

              <!-- Compliance Checking - Only for Published Policies -->
              @if (policy && policy.status === 'publish' && (policy.hasPDF || policy.pdfText || policy.content)) {
                <div class="policy-section">
                  <div class="section-header">
                    <h2 class="section-title">{{ 'policies.complianceCheck' | translate }}</h2>
                    <button (click)="openComplianceModal()" class="compliance-check-btn">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      {{ 'policies.checkCompliance' | translate }}
                    </button>
                  </div>
                  <div class="section-content">
                    @if (policy.complianceScore !== undefined) {
                      <div class="compliance-overview">
                        <div class="compliance-score-display">
                          <div class="score-circle" [class]="getComplianceScoreClass(policy.complianceLevel)">
                            <span class="score-text">{{ (policy.complianceScore * 100).toFixed(0) }}%</span>
                          </div>
                          <div class="score-info">
                            <h3 class="score-label">{{ getComplianceLevelLabel(policy.complianceLevel) }}</h3>
                            <p class="score-description">{{ getComplianceDescription(policy.complianceLevel) }}</p>
                            <p class="score-date">{{ 'policies.lastChecked' | translate }}: {{ policy.complianceLastChecked | date:'MMM d, y' }}</p>
                          </div>
                        </div>
                      </div>
                    } @else {
                      <div class="compliance-placeholder">
                        <div class="placeholder-icon">📋</div>
                        <h3 class="placeholder-title">{{ 'policies.noComplianceYet' | translate }}</h3>
                        <p class="placeholder-description">{{ 'policies.checkComplianceDescription' | translate }}</p>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Policy Sidebar -->
            <div class="policy-sidebar">
              <div class="sidebar-card">
                <h3 class="sidebar-title">{{ 'policies.policyInformation' | translate }}</h3>
                <div class="sidebar-content">
                  <div class="info-item">
                    <span class="info-label">{{ 'policies.status' | translate }}</span>
                    <span [class]="getStatusBadgeClasses(policy.status)" class="status-badge">
                      {{ policy.status | titlecase }}
                    </span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">{{ 'policies.version' | translate }}</span>
                    <span class="info-value">v1.0</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">{{ 'policies.created' | translate }}</span>
                    <span class="info-value">{{ policy.createdAt | date:'MMM d, y' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">{{ 'policies.updated' | translate }}</span>
                    <span class="info-value">{{ policy.updatedAt | date:'MMM d, y' }}</span>
                  </div>
                  @if (policy.publishedAt) {
                    <div class="info-item">
                      <span class="info-label">{{ 'policies.published' | translate }}</span>
                      <span class="info-value">{{ policy.publishedAt | date:'MMM d, y' }}</span>
                    </div>
                  }
                  <div class="info-item">
                    <span class="info-label">{{ 'policies.pdfStatus' | translate }}</span>
                    <span class="info-value">
                      @if (policy.hasPDF) {
                        {{ policy.pdfProcessed ? ('policies.processed' | translate) : ('policies.processing' | translate) }}
                      } @else {
                        {{ 'policies.noPdf' | translate }}
                      }
                    </span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">{{ 'policies.aiReady' | translate }}</span>
                    <span class="info-value">
                      {{ policy.aiProcessed ? ('policies.yes' | translate) : ('policies.no' | translate) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        } @else {
          <div class="error-state">
            <div class="error-icon">⚠️</div>
            <h3 class="error-title">{{ 'policies.policyNotFound' | translate }}</h3>
            <p class="error-message">{{ 'policies.policyNotFoundMessage' | translate }}</p>
            <button (click)="goBack()" class="action-btn primary">
              <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
              {{ 'policies.backToPolicies' | translate }}
            </button>
          </div>
        }
      </div>
    </div>

    <!-- Compliance Modal -->
    @if (showComplianceModal) {
      <app-compliance-modal
        [policyId]="policyId!"
        [userId]="policy?.createdBy || ''"
        [regulationFramework]="selectedRegulationFramework"
        (close)="closeComplianceModal()"
        (viewFullReport)="navigateToFullReport()"
        (complianceChecked)="onComplianceChecked($event)">
      </app-compliance-modal>
    }
  `,
  styles: [`
    .spinner {
      width: 1.5rem;
      height: 1.5rem;
      border: 2px solid var(--color-border-primary);
      border-top: 2px solid var(--color-text-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* PDF Preview Styles */
    .pdf-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1rem;
    }

    .pdf-preview-container {
      margin-top: 1.5rem;
      border: 1px solid var(--color-border-primary);
      border-radius: 8px;
      background: var(--color-bg-primary);
      overflow: hidden;
    }

    .pdf-preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: var(--color-bg-secondary);
      border-bottom: 1px solid var(--color-border-primary);
    }

    .pdf-preview-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0;
    }

    .close-preview-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      background: none;
      border: none;
      color: var(--color-text-secondary);
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .close-preview-btn:hover {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
    }

    .pdf-preview-content {
      height: 600px;
      position: relative;
    }

    .pdf-iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: var(--color-bg-primary);
    }

    /* Dark mode support */
    .dark .pdf-preview-container {
      background: var(--color-bg-primary);
      border-color: var(--color-border-primary);
    }

    .dark .pdf-preview-header {
      background: var(--color-bg-secondary);
      border-color: var(--color-border-primary);
    }

    /* Disabled button styles */
    .action-btn.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: var(--color-gray-300);
      color: var(--color-gray-500);
    }

    .action-btn.disabled:hover {
      background: var(--color-gray-300);
      transform: none;
    }

    .action-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .action-btn:disabled:hover {
      transform: none;
    }

    /* Summary Level Selector Styles */
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .summary-controls {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .summary-level-selector {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .summary-level-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-secondary);
    }

    .summary-level-select {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--color-border-primary);
      border-radius: 6px;
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      font-size: 0.875rem;
      min-width: 120px;
      transition: all 0.2s ease;
    }

    .summary-level-select:focus {
      outline: none;
      border-color: var(--color-primary-500);
      box-shadow: 0 0 0 3px var(--color-primary-100);
    }

    .summary-level-select:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .regenerate-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: var(--color-primary-500);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .regenerate-btn:hover:not(:disabled) {
      background: var(--color-primary-600);
      transform: translateY(-1px);
    }

    .regenerate-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .summary-level-info {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
      padding: 0.75rem;
      background: var(--color-bg-secondary);
      border-radius: 6px;
      border-left: 4px solid var(--color-primary-500);
    }

    .summary-level-badge {
      padding: 0.25rem 0.75rem;
      background: var(--color-primary-100);
      color: var(--color-primary-700);
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .summary-level-description {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }

    .summary-loading {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      background: var(--color-bg-secondary);
      border-radius: 6px;
      color: var(--color-text-secondary);
    }

    .ai-summary {
      position: relative;
    }

    .ai-summary p {
      line-height: 1.6;
      margin-bottom: 0.75rem;
    }

    .ai-summary-date {
      color: var(--color-text-tertiary);
      font-size: 0.75rem;
    }

    /* Dark mode support for summary controls */
    .dark .summary-level-select {
      background: var(--color-bg-primary);
      border-color: var(--color-border-primary);
      color: var(--color-text-primary);
    }

    .dark .summary-level-info {
      background: var(--color-bg-secondary);
    }

    .dark .summary-level-badge {
      background: var(--color-primary-900);
      color: var(--color-primary-200);
    }

    .dark .summary-loading {
      background: var(--color-bg-secondary);
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .pdf-preview-content {
        height: 400px;
      }
      
      .pdf-actions {
        flex-direction: column;
        gap: 0.5rem;
      }

      .section-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .summary-controls {
        width: 100%;
        justify-content: space-between;
      }

      .summary-level-info {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }
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

    /* Policy Expiry Styles */
    .policy-expiry {
      font-weight: 500;
      margin-left: 0.5rem;
    }

    .policy-expiry.expired {
      color: #dc2626;
    }

    .policy-expiry.expiring-soon {
      color: #d97706;
    }

    .policy-expiry.active {
      color: #059669;
    }

    /* Dark mode for lifecycle badges */
    .dark .lifecycle-active {
      background-color: #065f46;
      color: #a7f3d0;
    }

    .dark .lifecycle-expiring-soon {
      background-color: #92400e;
      color: #fcd34d;
    }

    .dark .lifecycle-expired {
      background-color: #991b1b;
      color: #fecaca;
    }

    /* Compliance Check Styles */
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .compliance-check-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
    }

    .compliance-check-btn:hover {
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
    }

    .compliance-overview {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.5rem;
    }

    .compliance-score-display {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .score-circle {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      font-weight: 700;
      color: white;
    }

    .score-circle.compliant {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }

    .score-circle.partial {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    }

    .score-circle.non-compliant {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }

    .score-circle.unknown {
      background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
    }

    .score-text {
      font-size: 1.5rem;
      font-weight: 700;
    }

    .score-info {
      flex: 1;
    }

    .score-label {
      font-size: 1.25rem;
      font-weight: 600;
      color: #111827;
      margin: 0 0 0.5rem 0;
    }

    .score-description {
      color: #6b7280;
      margin: 0 0 0.5rem 0;
      line-height: 1.5;
    }

    .score-date {
      color: #9ca3af;
      font-size: 0.875rem;
      margin: 0;
    }

    .compliance-placeholder {
      text-align: center;
      padding: 3rem 2rem;
      background: #f8fafc;
      border: 2px dashed #cbd5e1;
      border-radius: 12px;
    }

    .placeholder-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .placeholder-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #374151;
      margin: 0 0 0.5rem 0;
    }

    .placeholder-description {
      color: #6b7280;
      margin: 0;
      line-height: 1.5;
    }

    /* Dark mode support for compliance */
    .dark .compliance-overview {
      background: #1f2937;
      border-color: #374151;
    }

    .dark .score-label {
      color: #f9fafb;
    }

    .dark .score-description {
      color: #d1d5db;
    }

    .dark .score-date {
      color: #9ca3af;
    }

    .dark .compliance-placeholder {
      background: #1f2937;
      border-color: #4b5563;
    }

    .dark .placeholder-title {
      color: #f9fafb;
    }

    .dark .placeholder-description {
      color: #d1d5db;
    }

    /* Draft Policy Notice Styles */
    .draft-notice {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border: 1px solid #f59e0b;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .draft-notice-content {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }

    .draft-notice-icon {
      color: #d97706;
      flex-shrink: 0;
    }

    .draft-notice-text {
      flex: 1;
    }

    .draft-notice-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #92400e;
      margin: 0 0 0.5rem 0;
    }

    .draft-notice-description {
      color: #92400e;
      margin: 0 0 1rem 0;
      line-height: 1.5;
    }

    .draft-notice-features {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #92400e;
      font-size: 0.875rem;
    }

    .feature-item svg {
      color: #10b981;
      flex-shrink: 0;
    }

    /* Dark mode for draft notice */
    .dark .draft-notice {
      background: linear-gradient(135deg, #451a03 0%, #78350f 100%);
      border-color: #d97706;
    }

    .dark .draft-notice-icon {
      color: #fbbf24;
    }

    .dark .draft-notice-title {
      color: #fbbf24;
    }

    .dark .draft-notice-description {
      color: #fbbf24;
    }

    .dark .feature-item {
      color: #fbbf24;
    }

    .dark .feature-item svg {
      color: #10b981;
    }

    .feature-item.available-now {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 6px;
      padding: 0.5rem;
      margin: 0.25rem 0;
    }

    .feature-item.available-now svg {
      color: #10b981;
    }

    .feature-item.available-now span {
      color: #10b981;
      font-weight: 600;
    }

    .dark .feature-item.available-now {
      background: rgba(16, 185, 129, 0.2);
      border-color: rgba(16, 185, 129, 0.4);
    }

    .dark .feature-item.available-now svg {
      color: #10b981;
    }

    .dark .feature-item.available-now span {
      color: #10b981;
    }
  `]
})
export class PolicyDetailComponent implements OnInit, OnDestroy {
  policy: Policy | null = null;
  isLoading = true;
  policyId: string | null = null;
  showPDFPreview = false;
  pdfUrl: string | null = null;
  pdfPreviewAvailable = true;
  isDownloading = false;
  checkingPDFAvailability = false;
  isLoadingPreview = false;
  pdfDebugInfo: any = null;
  safePdfUrl: SafeResourceUrl | null = null;
  
  // Summary level management
  summaryLevel: SummaryLevel = SummaryLevel.STANDARD;
  summaryInfo: PolicySummaryInfo | null = null;
  isRegeneratingSummary = false;
  currentSummary: string = '';
  
  // Expose SummaryLevel enum to template
  SummaryLevel = SummaryLevel;
  
  // Compliance modal properties
  showComplianceModal = false;
  selectedRegulationFramework = 'insurance_standards';

  // DLP scan properties
  currentUser: any = null;
  dlpScanResult: any = null;
  dlpEnabled: boolean = false;

  constructor(
    private policyService: PolicyService,
    private router: Router,
    private route: ActivatedRoute,
    private notificationService: NotificationService,
    private sanitizer: DomSanitizer,
    private aiService: AIService,
    private userPreferencesService: UserPreferencesService,
    private dlpService: DLPService,
    private authService: AuthService,
    private rewardService: RewardService
  ) {}

  ngOnInit(): void {
    // Check if DLP is enabled
    this.dlpEnabled = this.dlpService.isEnabled();
    
    // Get current user
    this.currentUser = this.authService.getCurrentUser();
    
    this.route.params.subscribe(params => {
      this.policyId = params['id'];
      if (this.policyId) {
        this.loadPolicy();
      }
    });
  }

  loadPolicy(): void {
    if (!this.policyId) return;

    this.policyService.getPolicy(this.policyId).subscribe({
      next: (policy: Policy) => {
        this.policy = policy;
        this.isLoading = false;
        
        // Check if PDF preview is available for this policy
        this.checkPDFAvailability();
        
        // Load summary info and set current level
        this.loadSummaryInfo();
      },
      error: (error: any) => {
        console.error('Error loading policy:', error);
        this.notificationService.showError('Failed to load policy');
        this.isLoading = false;
      }
    });
  }

  checkPDFAvailability(): void {
    if (!this.policy?.hasPDF || !this.policyId) {
      this.pdfPreviewAvailable = false;
      this.checkingPDFAvailability = false;
      return;
    }

    this.checkingPDFAvailability = true;

    // Test if PDF data is available by making a test request
    this.policyService.getPolicyPDFBlob(this.policyId).subscribe({
      next: (blob: Blob) => {
        // PDF data is available
        this.pdfPreviewAvailable = true;
        this.checkingPDFAvailability = false;
        // Clean up the test blob
        URL.revokeObjectURL(URL.createObjectURL(blob));
      },
      error: (error: any) => {
        // PDF data is not available
        this.pdfPreviewAvailable = false;
        this.checkingPDFAvailability = false;
        console.log('PDF preview not available for this policy:', error.status);
      }
    });
  }

  editPolicy(): void {
    if (this.policyId) {
      this.router.navigate(['/policies', this.policyId, 'edit']);
    }
  }


  goBack(): void {
    this.router.navigate(['/policies']);
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

  formatFileSize(bytes: number | undefined): string {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  togglePDFPreview(): void {
    if (!this.showPDFPreview) {
      this.loadPDFForPreview();
    } else {
      this.showPDFPreview = false;
    }
  }

  loadPDFForPreview(): void {
    if (!this.policyId) return;
    
    console.log('🔄 Starting PDF preview load for policy:', this.policyId);
    this.isLoadingPreview = true;
    
    this.policyService.getPolicyPDFBlob(this.policyId).subscribe({
      next: (blob: Blob) => {
        console.log('✅ PDF blob received:', {
          size: blob.size,
          type: blob.type,
          blob: blob
        });
        
        // Create object URL from blob
        if (this.pdfUrl) {
          console.log('🗑️ Revoking previous PDF URL:', this.pdfUrl);
          URL.revokeObjectURL(this.pdfUrl);
        }
        
        // Create a new blob with explicit PDF MIME type
        const pdfBlob = new Blob([blob], { type: 'application/pdf' });
        this.pdfUrl = URL.createObjectURL(pdfBlob);
        
        // Create sanitized URL for iframe
        this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfUrl);
        
        console.log('🔗 Created new PDF URL:', this.pdfUrl);
        console.log('🔒 Created sanitized URL:', this.safePdfUrl);
        console.log('📄 Blob details:', {
          originalSize: blob.size,
          originalType: blob.type,
          newSize: pdfBlob.size,
          newType: pdfBlob.type
        });
        
        // Only show preview after PDF is successfully loaded
        this.showPDFPreview = true;
        this.isLoadingPreview = false;
        
        console.log('📄 PDF preview state:', {
          showPDFPreview: this.showPDFPreview,
          pdfUrl: this.pdfUrl,
          isLoadingPreview: this.isLoadingPreview
        });
      },
      error: (error: any) => {
        console.error('❌ Error loading PDF:', error);
        this.isLoadingPreview = false;
        
        // Check if it's a 404 error about missing PDF data
        if (error.status === 404 && error.error?.message?.includes('PDF data is not available')) {
          this.pdfPreviewAvailable = false;
          this.notificationService.showError('This policy was created before PDF storage was implemented. Please re-upload the PDF to enable preview functionality.');
        } else if (error.status === 404) {
          this.pdfPreviewAvailable = false;
          this.notificationService.showError('No PDF document available for this policy');
        } else if (error.status === 401) {
          this.notificationService.showError('Authentication required to access PDF');
        } else {
          this.notificationService.showError('Failed to load PDF preview');
        }
        
        // Hide the preview if there's an error
        this.showPDFPreview = false;
      }
    });
  }

  getPDFUrl(): string {
    if (!this.policyId) return '';
    return this.policyService.getPolicyPDFUrl(this.policyId);
  }

  getPDFViewerUrl(): string {
    if (!this.policyId) return '';
    const pdfUrl = this.policyService.getPolicyPDFUrl(this.policyId);
    // Use PDF.js viewer with the PDF URL
    return `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(pdfUrl)}`;
  }

  testPDFDirectly(): void {
    if (!this.policyId) return;
    
    // Test 1: Open PDF in new tab
    const pdfUrl = this.policyService.getPolicyPDFUrl(this.policyId);
    window.open(pdfUrl, '_blank');
    
    // Test 2: Check if PDF data is valid
    this.policyService.getPolicyPDFBlob(this.policyId).subscribe({
      next: (blob: Blob) => {
        console.log('🧪 Testing PDF blob:', {
          size: blob.size,
          type: blob.type,
          firstBytes: this.getFirstBytes(blob)
        });
        
        // Create a test URL and try to open it
        const testUrl = URL.createObjectURL(blob);
        console.log('🧪 Test URL created:', testUrl);
        
        // Try to open in new tab
        const newWindow = window.open(testUrl, '_blank');
        if (!newWindow) {
          console.error('❌ Popup blocked - PDF cannot be opened');
          this.notificationService.showError('Popup blocked. Please allow popups and try again.');
        }
        
        // Clean up after 5 seconds
        setTimeout(() => {
          URL.revokeObjectURL(testUrl);
        }, 5000);
      },
      error: (error: any) => {
        console.error('❌ Error testing PDF:', error);
        this.notificationService.showError('Failed to test PDF');
      }
    });
  }

  private getFirstBytes(blob: Blob): string {
    // This is a simplified version - in real implementation you'd need to read the blob
    return 'Blob data (size: ' + blob.size + ')';
  }

  getPDFPreviewUrl(): string {
    return this.pdfUrl || '';
  }

  downloadPDF(): void {
    if (!this.policyId || this.isDownloading) return;
    
    this.isDownloading = true;
    this.policyService.getPolicyPDFBlob(this.policyId).subscribe({
      next: (blob: Blob) => {
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = this.policy?.pdfFilename || 'policy.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        this.isDownloading = false;
      },
      error: (error: any) => {
        console.error('Error downloading PDF:', error);
        this.isDownloading = false;
        
        // Check if it's a 404 error about missing PDF data
        if (error.status === 404 && error.error?.message?.includes('PDF data is not available')) {
          this.notificationService.showError('This policy was created before PDF storage was implemented. Please re-upload the PDF to enable download functionality.');
        } else if (error.status === 404) {
          this.notificationService.showError('No PDF document available for this policy');
        } else if (error.status === 401) {
          this.notificationService.showError('Authentication required to download PDF');
        } else {
          this.notificationService.showError('Failed to download PDF');
        }
      }
    });
  }

  onIframeLoad(): void {
    console.log('📄 Iframe loaded successfully');
  }

  onIframeError(event: any): void {
    console.error('❌ Iframe error:', event);
  }

  debugPDFData(): void {
    if (!this.policyId) return;
    
    console.log('🔍 Debugging PDF data for policy:', this.policyId);
    
    this.policyService.getPolicyPDFDebug(this.policyId).subscribe({
      next: (debugInfo: any) => {
        console.log('📊 PDF Debug Info:', debugInfo);
        this.pdfDebugInfo = debugInfo;
      },
      error: (error: any) => {
        console.error('❌ Error getting PDF debug info:', error);
        this.notificationService.showError('Failed to get PDF debug info');
      }
    });
  }

  // Summary level management methods
  loadSummaryInfo(): void {
    if (!this.policyId) return;
    
    this.aiService.getPolicySummaryInfo(this.policyId).subscribe({
      next: (summaryInfo: PolicySummaryInfo) => {
        this.summaryInfo = summaryInfo;
        // Use user's preferred level or policy's current level
        this.summaryLevel = this.userPreferencesService.getDefaultSummaryLevel() || summaryInfo.currentLevel;
        this.loadCurrentSummary();
      },
      error: (error: any) => {
        console.error('Error loading summary info:', error);
        // Fallback to user preference or legacy summary
        this.summaryLevel = this.userPreferencesService.getDefaultSummaryLevel();
        this.currentSummary = this.policy?.aiSummary || '';
      }
    });
  }

  loadCurrentSummary(): void {
    if (!this.policyId) return;
    
    this.aiService.getPolicySummaryByLevel(this.policyId, this.summaryLevel).subscribe({
      next: (response: SummaryLevelResponse) => {
        this.currentSummary = response.summary;
        this.isRegeneratingSummary = false;
      },
      error: (error: any) => {
        console.error('Error loading summary:', error);
        this.isRegeneratingSummary = false;
        // Fallback to legacy summary if available
        this.currentSummary = this.policy?.aiSummary || '';
      }
    });
  }

  onSummaryLevelChange(): void {
    if (!this.policyId) return;
    
    // Save user preference
    this.userPreferencesService.setDefaultSummaryLevel(this.summaryLevel);
    
    this.isRegeneratingSummary = true;
    this.loadCurrentSummary();
  }

  regenerateSummary(): void {
    if (!this.policyId) return;
    
    this.isRegeneratingSummary = true;
    this.aiService.regeneratePolicySummary(this.policyId, this.summaryLevel).subscribe({
      next: (response: SummaryLevelResponse) => {
        this.currentSummary = response.summary;
        this.isRegeneratingSummary = false;
        this.loadSummaryInfo(); // Refresh summary info
      },
      error: (error: any) => {
        console.error('Error regenerating summary:', error);
        this.isRegeneratingSummary = false;
      }
    });
  }

  getSummaryLevelLabel(level: SummaryLevel): string {
    switch (level) {
      case SummaryLevel.BRIEF:
        return 'Brief';
      case SummaryLevel.STANDARD:
        return 'Standard';
      case SummaryLevel.DETAILED:
        return 'Detailed';
      default:
        return 'Standard';
    }
  }

  getSummaryLevelDescription(level: SummaryLevel): string {
    switch (level) {
      case SummaryLevel.BRIEF:
        return 'Key terms, coverage amounts, and deductibles';
      case SummaryLevel.STANDARD:
        return 'Main sections, key terms, and important clauses';
      case SummaryLevel.DETAILED:
        return 'Comprehensive legal summary for detailed review';
      default:
        return 'Standard summary level';
    }
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

  getExpiryDateClass(policy: Policy): string {
    if (!policy.expiryDate) return '';
    
    const lifecycleInfo = this.policyService.calculatePolicyLifecycle(policy);
    
    if (lifecycleInfo.isExpired) {
      return 'policy-expiry expired';
    } else if (lifecycleInfo.isExpiringSoon) {
      return 'policy-expiry expiring-soon';
    } else {
      return 'policy-expiry active';
    }
  }


  ngOnDestroy(): void {
    // Clean up object URL to prevent memory leaks
    if (this.pdfUrl) {
      URL.revokeObjectURL(this.pdfUrl);
    }
    this.safePdfUrl = null;
  }

  // Compliance modal methods
  openComplianceModal(): void {
    this.showComplianceModal = true;
  }

  closeComplianceModal(): void {
    this.showComplianceModal = false;
  }

  navigateToFullReport(): void {
    this.closeComplianceModal();
    
    // Record reward: viewing full compliance report (5 points)
    this.rewardService.recordActivity({
      type: 'compliance_check',
      name: 'Full Compliance Report Viewed',
      points: 5,
      metadata: {
        policyId: this.policyId,
        policyTitle: this.policy?.title || 'Unknown Policy',
        regulationFramework: this.selectedRegulationFramework,
        action: 'full_compliance_report_viewed'
      }
    }).subscribe({
      next: (rewardResponse) => {
        console.log('🎖️ Full compliance report view reward recorded:', rewardResponse);
      },
      error: (error) => {
        console.error('❌ Failed to record full compliance report view reward:', error);
      }
    });
    
    this.router.navigate(['/policies', this.policyId, 'compliance'], {
      queryParams: { userId: this.policy?.createdBy || '' }
    });
  }

  onComplianceChecked(report: ComplianceReport): void {
    // Update the policy with compliance information
    if (this.policy) {
      this.policy.complianceScore = report.overall_score;
      this.policy.complianceLevel = report.overall_level.toLowerCase() as 'compliant' | 'partial' | 'non-compliant' | 'unknown';
      this.policy.complianceLastChecked = new Date();
      this.policy.complianceFramework = report.regulation_framework;
    }
  }

  getComplianceScoreClass(level?: string): string {
    switch (level) {
      case 'compliant':
        return 'compliant';
      case 'partial':
        return 'partial';
      case 'non-compliant':
        return 'non-compliant';
      default:
        return 'unknown';
    }
  }

  // DLP scan event handlers
  onDLPScanComplete(scanResult: any): void {
    this.dlpScanResult = scanResult;
    console.log('DLP scan completed:', scanResult);
    
    // Show notification based on scan results
    if (scanResult.isSafeToPublish) {
      this.notificationService.showSuccess('DLP scan completed - Policy is safe to publish');
    } else {
      this.notificationService.showWarning(`DLP scan completed - ${scanResult.violations.length} violations found. Review before publishing.`);
    }
  }


  getComplianceLevelLabel(level?: string): string {
    switch (level) {
      case 'compliant':
        return 'Compliant';
      case 'partial':
        return 'Partial';
      case 'non-compliant':
        return 'Non-Compliant';
      default:
        return 'Unknown';
    }
  }

  getComplianceDescription(level?: string): string {
    switch (level) {
      case 'compliant':
        return 'This policy meets all compliance requirements.';
      case 'partial':
        return 'This policy meets some compliance requirements but needs improvement.';
      case 'non-compliant':
        return 'This policy does not meet compliance requirements.';
      default:
        return 'Compliance status unknown.';
    }
  }
}
