import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { MfaService, MfaSetupResponse, MfaVerifySetupResponse, MfaStatusResponse } from '@core/services/mfa.service';
import { NotificationService } from '@core/services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-security-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, TranslatePipe],
  template: `
    <div class="security-settings">
      <div class="security-header">
        <h2 class="security-title">{{ 'profile.security.title' | translate }}</h2>
        <p class="security-description">{{ 'profile.security.description' | translate }}</p>
      </div>

      <!-- MFA Section -->
      <div class="mfa-section">
        <div class="mfa-header">
          <div class="mfa-info">
            <h3 class="mfa-title">{{ 'profile.security.mfa.title' | translate }}</h3>
            <p class="mfa-description">{{ 'profile.security.mfa.description' | translate }}</p>
          </div>
          <div class="mfa-status" [class.enabled]="mfaEnabled">
            <span class="status-indicator"></span>
            <span class="status-text">
              {{ mfaEnabled ? ('profile.security.mfa.enabled' | translate) : ('profile.security.mfa.disabled' | translate) }}
            </span>
          </div>
        </div>

        <!-- MFA Setup Flow -->
        <div *ngIf="!mfaEnabled && !isSettingUp" class="mfa-actions">
          <button type="button" class="btn btn-primary" (click)="startMfaSetup()">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
            {{ 'profile.security.mfa.enable' | translate }}
          </button>
        </div>

        <!-- MFA Setup Process -->
        <div *ngIf="isSettingUp" class="mfa-setup">
          <div class="setup-step" *ngIf="setupStep === 1">
            <h4 class="step-title">{{ 'profile.security.mfa.setup.step1.title' | translate }}</h4>
            <p class="step-description">{{ 'profile.security.mfa.setup.step1.description' | translate }}</p>
            
            <div class="qr-container">
              <img [src]="qrDataUrl" alt="QR Code" class="qr-code" *ngIf="qrDataUrl">
            </div>
            
            <div class="manual-entry">
              <label class="manual-label">{{ 'profile.security.mfa.setup.step1.manualKey' | translate }}</label>
              <div class="manual-key-container">
                <input 
                  type="text" 
                  [value]="manualEntryKey" 
                  readonly 
                  class="manual-key-input"
                  #manualKeyInput>
                <button type="button" class="copy-btn" (click)="copyToClipboard(manualKeyInput.value)">
                  {{ 'common.copy' | translate }}
                </button>
              </div>
            </div>

            <div class="setup-actions">
              <button type="button" class="btn btn-secondary" (click)="cancelMfaSetup()">
                {{ 'common.cancel' | translate }}
              </button>
              <button type="button" class="btn btn-primary" (click)="nextStep()">
                {{ 'common.next' | translate }}
              </button>
            </div>
          </div>

          <div class="setup-step" *ngIf="setupStep === 2">
            <h4 class="step-title">{{ 'profile.security.mfa.setup.step2.title' | translate }}</h4>
            <p class="step-description">{{ 'profile.security.mfa.setup.step2.description' | translate }}</p>
            
            <form [formGroup]="verifyForm" (ngSubmit)="verifyMfaSetup()" class="verify-form">
              <div class="form-group">
                <label for="code" class="form-label">{{ 'profile.security.mfa.setup.step2.codeLabel' | translate }}</label>
                <input
                  type="text"
                  id="code"
                  formControlName="code"
                  class="form-input"
                  placeholder="000000"
                  maxlength="6"
                  autocomplete="one-time-code">
                <div class="form-error" *ngIf="verifyForm.get('code')?.invalid && verifyForm.get('code')?.touched">
                  {{ 'profile.security.mfa.setup.step2.codeRequired' | translate }}
                </div>
              </div>

              <div class="setup-actions">
                <button type="button" class="btn btn-secondary" (click)="prevStep()">
                  {{ 'common.back' | translate }}
                </button>
                <button type="submit" class="btn btn-primary" [disabled]="verifyForm.invalid || isVerifying">
                  <span *ngIf="!isVerifying">{{ 'profile.security.mfa.setup.step2.verify' | translate }}</span>
                  <span *ngIf="isVerifying">{{ 'common.verifying' | translate }}...</span>
                </button>
              </div>
            </form>
          </div>

          <div class="setup-step" *ngIf="setupStep === 3">
            <h4 class="step-title">{{ 'profile.security.mfa.setup.step3.title' | translate }}</h4>
            <p class="step-description">{{ 'profile.security.mfa.setup.step3.description' | translate }}</p>
            
            <div class="backup-codes">
              <div class="backup-codes-header">
                <h5>{{ 'profile.security.mfa.setup.step3.backupCodes' | translate }}</h5>
                <button type="button" class="download-btn" (click)="downloadBackupCodes()">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  {{ 'common.download' | translate }}
                </button>
              </div>
              
              <div class="backup-codes-list">
                <div class="backup-code" *ngFor="let code of backupCodes; let i = index">
                  {{ i + 1 }}. {{ code }}
                </div>
              </div>
              
              <div class="backup-warning">
                <svg class="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                </svg>
                <p>{{ 'profile.security.mfa.setup.step3.warning' | translate }}</p>
              </div>
            </div>

            <div class="setup-actions">
              <button type="button" class="btn btn-primary" (click)="completeMfaSetup()">
                {{ 'common.complete' | translate }}
              </button>
            </div>
          </div>
        </div>

        <!-- MFA Management -->
        <div *ngIf="mfaEnabled" class="mfa-management">
          <div class="management-actions">
            <button type="button" class="btn btn-secondary" (click)="regenerateBackupCodes()" [disabled]="isRegenerating">
              <span *ngIf="!isRegenerating">{{ 'profile.security.mfa.regenerateCodes' | translate }}</span>
              <span *ngIf="isRegenerating">{{ 'common.regenerating' | translate }}...</span>
            </button>
            <button type="button" class="btn btn-danger" (click)="startMfaDisable()">
              {{ 'profile.security.mfa.disable.confirm' | translate }}
            </button>
          </div>
        </div>
      </div>

      <!-- MFA Disable Modal -->
      <div *ngIf="showDisableModal" class="modal-overlay" (click)="closeDisableModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">{{ 'profile.security.mfa.disable.title' | translate }}</h3>
            <button type="button" class="modal-close" (click)="closeDisableModal()">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <div class="modal-body">
            <p class="modal-description">{{ 'profile.security.mfa.disable.description' | translate }}</p>
            
            <form [formGroup]="disableForm" (ngSubmit)="confirmMfaDisable()" class="disable-form">
              <div class="form-group">
                <label for="password" class="form-label">{{ 'profile.security.mfa.disable.password' | translate }}</label>
                <input
                  type="password"
                  id="password"
                  formControlName="password"
                  class="form-input"
                  placeholder="{{ 'profile.security.mfa.disable.passwordPlaceholder' | translate }}">
                <div class="form-error" *ngIf="disableForm.get('password')?.invalid && disableForm.get('password')?.touched">
                  {{ 'profile.security.mfa.disable.passwordRequired' | translate }}
                </div>
              </div>

              <div class="form-group">
                <label for="code" class="form-label">{{ 'profile.security.mfa.disable.code' | translate }}</label>
                <input
                  type="text"
                  id="code"
                  formControlName="code"
                  class="form-input"
                  placeholder="000000"
                  maxlength="6">
                <div class="form-error" *ngIf="disableForm.get('code')?.invalid && disableForm.get('code')?.touched">
                  {{ 'profile.security.mfa.disable.codeRequired' | translate }}
                </div>
              </div>

              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" (click)="closeDisableModal()">
                  {{ 'common.cancel' | translate }}
                </button>
                <button type="submit" class="btn btn-danger" [disabled]="disableForm.invalid || isDisabling">
                  <span *ngIf="!isDisabling">{{ 'profile.security.mfa.disable.confirm' | translate }}</span>
                  <span *ngIf="isDisabling">{{ 'common.disabling' | translate }}...</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .security-settings {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
    }

    .security-header {
      margin-bottom: 32px;
    }

    .security-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 8px 0;
    }

    .security-description {
      color: var(--color-text-secondary);
      margin: 0;
    }

    .mfa-section {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border-primary);
      border-radius: 12px;
      padding: 24px;
    }

    .mfa-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }

    .mfa-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 4px 0;
    }

    .mfa-description {
      color: var(--color-text-secondary);
      margin: 0;
      font-size: 14px;
    }

    .mfa-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 6px;
      background: #fef2f2;
      border: 1px solid #fecaca;
    }

    .mfa-status.enabled {
      background: #f0fdf4;
      border-color: #bbf7d0;
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
    }

    .mfa-status.enabled .status-indicator {
      background: #10b981;
    }

    .status-text {
      font-size: 14px;
      font-weight: 500;
      color: #dc2626;
    }

    .mfa-status.enabled .status-text {
      color: #059669;
    }

    .mfa-actions {
      display: flex;
      gap: 12px;
    }

    .mfa-setup {
      margin-top: 24px;
    }

    .setup-step {
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border-primary);
      border-radius: 8px;
      padding: 24px;
    }

    .step-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 8px 0;
    }

    .step-description {
      color: var(--color-text-secondary);
      margin: 0 0 24px 0;
    }

    .qr-container {
      text-align: center;
      margin-bottom: 24px;
    }

    .qr-code {
      width: 200px;
      height: 200px;
      border: 1px solid var(--color-border-primary);
      border-radius: 8px;
    }

    .manual-entry {
      margin-bottom: 24px;
    }

    .manual-label {
      display: block;
      font-weight: 500;
      color: var(--color-text-primary);
      margin-bottom: 8px;
    }

    .manual-key-container {
      display: flex;
      gap: 8px;
    }

    .manual-key-input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid var(--color-border-primary);
      border-radius: 6px;
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
      font-family: monospace;
      font-size: 14px;
    }

    .copy-btn {
      padding: 8px 16px;
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
    }

    .backup-codes {
      margin-bottom: 24px;
    }

    .backup-codes-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .backup-codes-header h5 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .download-btn {
      display: flex;
      align-items: center;
      padding: 6px 12px;
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
    }

    .backup-codes-list {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 16px;
      padding: 16px;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border-primary);
      border-radius: 6px;
    }

    .backup-code {
      font-family: monospace;
      font-size: 14px;
      color: var(--color-text-primary);
      padding: 4px 0;
    }

    .backup-warning {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 12px;
      background: #fef3c7;
      border: 1px solid #fde68a;
      border-radius: 6px;
    }

    .backup-warning p {
      margin: 0;
      font-size: 14px;
      color: #92400e;
    }

    .setup-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .management-actions {
      display: flex;
      gap: 12px;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--color-primary);
      color: white;
    }

    .btn-secondary {
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
      border: 1px solid var(--color-border-primary);
    }

    .btn-danger {
      background: #dc2626;
      color: white;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-label {
      display: block;
      font-weight: 500;
      color: var(--color-text-primary);
      margin-bottom: 6px;
    }

    .form-input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--color-border-primary);
      border-radius: 6px;
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
    }

    .form-error {
      color: #dc2626;
      font-size: 12px;
      margin-top: 4px;
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border-primary);
      border-radius: 12px;
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid var(--color-border-primary);
    }

    .modal-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .modal-close {
      background: none;
      border: none;
      color: var(--color-text-secondary);
      cursor: pointer;
    }

    .modal-body {
      padding: 24px;
    }

    .modal-description {
      color: var(--color-text-secondary);
      margin: 0 0 20px 0;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    @media (max-width: 640px) {
      .security-settings {
        padding: 16px;
      }

      .mfa-header {
        flex-direction: column;
        gap: 16px;
      }

      .backup-codes-list {
        grid-template-columns: 1fr;
      }

      .setup-actions,
      .management-actions,
      .modal-actions {
        flex-direction: column;
      }
    }
  `]
})
export class SecuritySettingsComponent implements OnInit, OnDestroy {
  mfaEnabled = false;
  isSettingUp = false;
  setupStep = 1;
  qrDataUrl = '';
  manualEntryKey = '';
  backupCodes: string[] = [];
  showDisableModal = false;
  isVerifying = false;
  isRegenerating = false;
  isDisabling = false;

  verifyForm: FormGroup;
  disableForm: FormGroup;

  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private mfaService: MfaService,
    private notificationService: NotificationService
  ) {
    this.verifyForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });

    this.disableForm = this.fb.group({
      password: ['', Validators.required],
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });
  }

  ngOnInit(): void {
    this.checkMfaStatus();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  checkMfaStatus(): void {
    this.subscriptions.push(
      this.mfaService.getStatus().subscribe({
        next: (response: MfaStatusResponse) => {
          this.mfaEnabled = response.enabled;
        },
        error: (error) => {
          console.error('Error checking MFA status:', error);
        }
      })
    );
  }

  startMfaSetup(): void {
    this.isSettingUp = true;
    this.setupStep = 1;

    this.subscriptions.push(
      this.mfaService.setup().subscribe({
        next: (response: MfaSetupResponse) => {
          this.qrDataUrl = response.qrDataUrl;
          this.manualEntryKey = response.manualEntryKey;
        },
        error: (error) => {
          this.notificationService.showError('Failed to start MFA setup');
          this.isSettingUp = false;
        }
      })
    );
  }

  nextStep(): void {
    this.setupStep = 2;
  }

  prevStep(): void {
    this.setupStep = 1;
  }

  verifyMfaSetup(): void {
    if (this.verifyForm.valid) {
      this.isVerifying = true;

      this.subscriptions.push(
        this.mfaService.verifySetup(this.verifyForm.value.code).subscribe({
          next: (response: MfaVerifySetupResponse) => {
            this.backupCodes = response.backupCodes;
            this.setupStep = 3;
            this.isVerifying = false;
          },
          error: (error) => {
            this.notificationService.showError('Invalid verification code');
            this.isVerifying = false;
          }
        })
      );
    }
  }

  completeMfaSetup(): void {
    this.mfaEnabled = true;
    this.isSettingUp = false;
    this.setupStep = 1;
    this.qrDataUrl = '';
    this.manualEntryKey = '';
    this.backupCodes = [];
    this.notificationService.showSuccess('MFA has been enabled successfully');
  }

  cancelMfaSetup(): void {
    this.isSettingUp = false;
    this.setupStep = 1;
    this.qrDataUrl = '';
    this.manualEntryKey = '';
  }

  regenerateBackupCodes(): void {
    this.isRegenerating = true;

    this.subscriptions.push(
      this.mfaService.regenerateBackupCodes().subscribe({
        next: (response) => {
          this.backupCodes = response.backupCodes;
          this.isRegenerating = false;
          this.notificationService.showSuccess('Backup codes regenerated successfully');
        },
        error: (error) => {
          this.notificationService.showError('Failed to regenerate backup codes');
          this.isRegenerating = false;
        }
      })
    );
  }

  startMfaDisable(): void {
    this.showDisableModal = true;
    this.disableForm.reset();
  }

  closeDisableModal(): void {
    this.showDisableModal = false;
    this.disableForm.reset();
  }

  confirmMfaDisable(): void {
    if (this.disableForm.valid) {
      this.isDisabling = true;

      this.subscriptions.push(
        this.mfaService.disable(
          this.disableForm.value.password,
          this.disableForm.value.code
        ).subscribe({
          next: (response) => {
            this.mfaEnabled = false;
            this.isDisabling = false;
            this.showDisableModal = false;
            this.notificationService.showSuccess('MFA has been disabled successfully');
          },
          error: (error) => {
            this.notificationService.showError('Failed to disable MFA. Please check your credentials.');
            this.isDisabling = false;
          }
        })
      );
    }
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.notificationService.showSuccess('Copied to clipboard');
    }).catch(() => {
      this.notificationService.showError('Failed to copy to clipboard');
    });
  }

  downloadBackupCodes(): void {
    const content = `PolicyPal - Backup Codes\n\n${this.backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n')}\n\nImportant: Store these codes in a secure location. Each code can only be used once.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'policypal-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  }
}
