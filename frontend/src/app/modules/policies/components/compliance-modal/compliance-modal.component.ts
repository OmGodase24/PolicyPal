import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AIService } from '@core/services/ai.service';
import { NotificationService } from '@core/services/notification.service';
import { RewardService } from '@core/services/reward.service';
import { ComplianceReport, ComplianceLevel } from '@core/models/compliance.model';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { LanguageService } from '@core/services/language.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-compliance-modal',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  styleUrls: ['./compliance-modal.component.scss'],
  template: `
    <div class="modal-overlay" (click)="closeModal()">
      <div class="modal-container" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2 class="modal-title">{{ 'compliance.modal.title' | translate }}</h2>
          <button (click)="closeModal()" class="close-btn">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div class="modal-content">
          @if (isLoading) {
            <div class="loading-state">
              <div class="loading-spinner">
                <div class="spinner"></div>
              </div>
              <p>{{ 'compliance.modal.analyzing' | translate }}</p>
            </div>
          } @else if (complianceReport) {
            <!-- Gauge Chart -->
            <div class="gauge-section">
              <div class="gauge-container">
                <div class="gauge-circle">
                  <svg class="gauge-svg" viewBox="0 0 120 120">
                    <!-- Background circle -->
                    <circle cx="60" cy="60" r="50" 
                            fill="none" 
                            stroke="#e5e7eb" 
                            stroke-width="8"/>
                    <!-- Progress circle -->
                    <circle cx="60" cy="60" r="50" 
                            fill="none" 
                            [attr.stroke]="getGaugeColor(complianceReport.overall_score)"
                            stroke-width="8"
                            stroke-linecap="round"
                            [attr.stroke-dasharray]="getGaugeCircumference(complianceReport.overall_score)"
                            transform="rotate(-90 60 60)"/>
                  </svg>
                  <div class="gauge-text">
                    <div class="gauge-score">{{ (complianceReport.overall_score * 100).toFixed(0) }}%</div>
                    <div class="gauge-label">{{ getScoreLabel(complianceReport.overall_level) }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- High-level Stats -->
            <div class="stats-section">
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-icon compliant">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <div class="stat-content">
                    <div class="stat-value">{{ getCompliantCount() }}</div>
                    <div class="stat-label">{{ 'compliance.modal.compliant' | translate }}</div>
                  </div>
                </div>

                <div class="stat-card">
                  <div class="stat-icon partial">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                  </div>
                  <div class="stat-content">
                    <div class="stat-value">{{ getPartialCount() }}</div>
                    <div class="stat-label">{{ 'compliance.modal.partial' | translate }}</div>
                  </div>
                </div>

                <div class="stat-card">
                  <div class="stat-icon non-compliant">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <div class="stat-content">
                    <div class="stat-value">{{ getNonCompliantCount() }}</div>
                    <div class="stat-label">{{ 'compliance.modal.nonCompliant' | translate }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Quick Summary -->
            <div class="summary-section">
              <h3 class="summary-title">{{ 'compliance.modal.quickSummary' | translate }}</h3>
              <p class="summary-text">{{ getScoreMessage(complianceReport.overall_level) }}</p>
              <div class="summary-details">
                <span class="summary-framework">{{ getRegulationName(complianceReport.regulation_framework) }}</span>
                <span class="summary-date">{{ 'compliance.modal.checked' | translate }} {{ complianceReport.generated_at | date:'MMM d, y' }}</span>
              </div>
            </div>

            <!-- Actions -->
            <div class="modal-actions">
              <button (click)="onViewFullReport()" class="action-btn primary">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                {{ 'compliance.modal.viewFullReport' | translate }}
              </button>
              <button (click)="refreshAnalysis()" class="action-btn secondary" [disabled]="isLoading">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                {{ getRefreshButtonText() }}
              </button>
              <button (click)="closeModal()" class="action-btn secondary">
                {{ 'compliance.modal.close' | translate }}
              </button>
            </div>
          } @else if (errorMessage) {
            <div class="error-state">
              <div class="error-icon">⚠️</div>
              <h3 class="error-title">{{ 'compliance.modal.errorTitle' | translate }}</h3>
              <p class="error-message">{{ errorMessage }}</p>
              <button (click)="retryCheck()" class="retry-btn">
                {{ 'compliance.modal.retry' | translate }}
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class ComplianceModalComponent implements OnInit, OnDestroy {
  @Input() policyId!: string;
  @Input() userId!: string;
  @Input() regulationFramework: string = 'insurance_standards';
  @Output() close = new EventEmitter<void>();
  @Output() viewFullReport = new EventEmitter<void>();
  @Output() complianceChecked = new EventEmitter<ComplianceReport>();

  complianceReport: ComplianceReport | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  private languageSubscription?: Subscription;
  refreshButtonText: string = 'Refresh Analysis'; // Default fallback text

  // Expose enums to template
  ComplianceLevel = ComplianceLevel;

  constructor(
    private aiService: AIService,
    private notificationService: NotificationService,
    private rewardService: RewardService,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.checkCompliance();
    
    // Subscribe to language changes to trigger change detection
    this.languageSubscription = this.languageService.currentLanguage$.subscribe((lang) => {
      console.log('🌍 Language changed to:', lang);
      this.updateRefreshButtonTextForLanguage(lang);
    });
    
    // Subscribe to translation changes to update when translations are loaded
    this.languageSubscription.add(
      this.languageService.translations$.subscribe((translations) => {
        console.log('📚 Translations loaded:', Object.keys(translations).length, 'keys');
        this.updateRefreshButtonText();
      })
    );
    
    // Also update after a delay to handle cases where translations load later
    setTimeout(() => {
      this.updateRefreshButtonText();
    }, 500);
    
    // Additional delay for French translations
    setTimeout(() => {
      this.updateRefreshButtonText();
    }, 1000);
    
    // Force refresh after 2 seconds to handle any caching issues
    setTimeout(() => {
      this.updateRefreshButtonText();
    }, 2000);
  }

  ngOnDestroy(): void {
    if (this.languageSubscription) {
      this.languageSubscription.unsubscribe();
    }
  }

  checkCompliance(): void {
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
        // Emit the compliance checked event
        if (this.complianceReport) {
          this.complianceChecked.emit(this.complianceReport);
          
          // Record reward: initial compliance check (5 points)
          this.rewardService.recordActivity({
            type: 'compliance_check',
            name: 'Compliance Check Initiated',
            points: 5,
            metadata: {
              policyId: this.policyId,
              regulationFramework: this.regulationFramework,
              overallScore: this.complianceReport.overall_score,
              overallLevel: this.complianceReport.overall_level,
              checksCount: this.complianceReport.checks.length,
              action: 'compliance_check_initiated'
            }
          }).subscribe({
            next: (rewardResponse) => {
              console.log('🎖️ Compliance check reward recorded:', rewardResponse);
            },
            error: (error) => {
              console.error('❌ Failed to record compliance check reward:', error);
            }
          });
        }
      },
      error: (error) => {
        console.error('Compliance check error:', error);
        this.errorMessage = error.message || 'Failed to check compliance';
        this.isLoading = false;
        this.notificationService.showError('Failed to check compliance');
      }
    });
  }

  retryCheck(): void {
    this.checkCompliance();
  }

  refreshAnalysis(): void {
    this.isLoading = true;
    this.errorMessage = null;

    const request = {
      policy_id: this.policyId,
      user_id: this.userId,
      regulation_framework: this.regulationFramework
    };

    // Call the refresh endpoint to force AI analysis
    this.aiService.refreshCompliance(request).subscribe({
      next: (response) => {
        this.complianceReport = response.report || null;
        this.isLoading = false;
        // Emit the compliance checked event
        if (this.complianceReport) {
          this.complianceChecked.emit(this.complianceReport);
        }
        this.notificationService.showSuccess('Compliance analysis refreshed successfully');
      },
      error: (error) => {
        console.error('Compliance refresh error:', error);
        this.errorMessage = error.message || 'Failed to refresh compliance analysis';
        this.isLoading = false;
        this.notificationService.showError('Failed to refresh compliance analysis');
      }
    });
  }

  closeModal(): void {
    this.close.emit();
  }

  onViewFullReport(): void {
    this.viewFullReport.emit();
  }

  getGaugeColor(score: number): string {
    if (score >= 0.8) return '#10b981';
    if (score >= 0.6) return '#f59e0b';
    return '#ef4444';
  }

  getGaugeCircumference(score: number): string {
    const circumference = 2 * Math.PI * 50;
    const offset = circumference - (score * circumference);
    return `${circumference} ${offset}`;
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
        return this.languageService.translate('compliance.modal.scoreMessage.compliant');
      case ComplianceLevel.PARTIAL:
        return this.languageService.translate('compliance.modal.scoreMessage.partial');
      case ComplianceLevel.NON_COMPLIANT:
        return this.languageService.translate('compliance.modal.scoreMessage.nonCompliant');
      default:
        return this.languageService.translate('compliance.modal.scoreMessage.unknown');
    }
  }

  getRegulationName(framework: string): string {
    const key = `compliance.modal.regulationNames.${framework}`;
    const translated = this.languageService.translate(key);
    // If translation key doesn't exist, return the framework name
    return translated !== key ? translated : framework;
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

  private updateRefreshButtonText(): void {
    try {
      const translation = this.languageService.translate('compliance.modal.refreshAnalysis');
      console.log('🔍 Debug - Translation result:', translation);
      console.log('🔍 Debug - Translation key:', 'compliance.modal.refreshAnalysis');
      console.log('🔍 Debug - Has translation:', this.languageService.hasTranslation('compliance.modal.refreshAnalysis'));
      
      // If translation returns the key itself, it means translation is not loaded yet
      if (translation === 'compliance.modal.refreshAnalysis' || !translation) {
        console.log('⚠️ Using fallback text - translation not found');
        this.refreshButtonText = 'Refresh Analysis'; // Fallback text
      } else {
        console.log('✅ Using translated text:', translation);
        this.refreshButtonText = translation;
      }
    } catch (error) {
      console.warn('❌ Translation error:', error);
      this.refreshButtonText = 'Refresh Analysis'; // Fallback text
    }
  }

  private updateRefreshButtonTextForLanguage(lang: string): void {
    console.log('🔄 Updating button text for language:', lang);
    
    // Hardcoded fallbacks based on language
    const fallbacks: { [key: string]: string } = {
      'en': 'Refresh Analysis',
      'fr': 'Actualiser l\'analyse',
      'es': 'Actualizar Análisis'
    };
    
    try {
      const translation = this.languageService.translate('compliance.modal.refreshAnalysis');
      console.log('🔍 Language-specific translation result:', translation);
      
      if (translation === 'compliance.modal.refreshAnalysis' || !translation) {
        console.log('⚠️ Using language-specific fallback for:', lang);
        this.refreshButtonText = fallbacks[lang] || fallbacks['en'];
      } else {
        console.log('✅ Using translated text:', translation);
        this.refreshButtonText = translation;
      }
    } catch (error) {
      console.warn('❌ Language-specific translation error:', error);
      this.refreshButtonText = fallbacks[lang] || fallbacks['en'];
    }
  }

  getRefreshButtonText(): string {
    return this.refreshButtonText;
  }

}
