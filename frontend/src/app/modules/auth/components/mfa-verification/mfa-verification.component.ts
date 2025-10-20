import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { MfaVerificationService } from '@core/services/mfa-verification.service';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { LanguageSelectorComponent } from '@shared/components/language-selector/language-selector.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-mfa-verification',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslatePipe, LanguageSelectorComponent],
  template: `
    <div class="mfa-verification-container">
      <!-- Language Selector -->
      <div class="language-selector-container">
        <app-language-selector></app-language-selector>
      </div>
      
      <div class="mfa-verification-card">
        <div class="header">
          <div class="logo">
            <svg class="logo-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>
          <h1 class="title">{{ 'auth.mfa.title' | translate }}</h1>
          <p class="subtitle">{{ 'auth.mfa.subtitle' | translate }}</p>
        </div>

        <div class="verification-tabs">
          <button 
            type="button" 
            class="tab-button" 
            [class.active]="activeTab === 'totp'"
            (click)="setActiveTab('totp')">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
            {{ 'auth.mfa.totp' | translate }}
          </button>
          <button 
            type="button" 
            class="tab-button" 
            [class.active]="activeTab === 'backup'"
            (click)="setActiveTab('backup')">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            {{ 'auth.mfa.backupCode' | translate }}
          </button>
        </div>

        <!-- TOTP Verification -->
        <div *ngIf="activeTab === 'totp'" class="verification-content">
          <form [formGroup]="totpForm" (ngSubmit)="verifyTotp()" class="verification-form">
            <div class="form-group">
              <label for="code" class="form-label">{{ 'auth.mfa.enterCode' | translate }}</label>
              <input
                type="text"
                id="code"
                formControlName="code"
                class="form-input"
                placeholder="000000"
                maxlength="6"
                autocomplete="one-time-code"
                [class.error]="totpForm.get('code')?.invalid && totpForm.get('code')?.touched">
              <div class="form-error" *ngIf="totpForm.get('code')?.invalid && totpForm.get('code')?.touched">
                {{ 'auth.mfa.codeRequired' | translate }}
              </div>
            </div>

            <button
              type="submit"
              class="verify-button"
              [disabled]="totpForm.invalid || isVerifying">
              <span *ngIf="!isVerifying">{{ 'auth.mfa.verify' | translate }}</span>
              <span *ngIf="isVerifying" class="loading-content">
                <svg class="loading-spinner" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                {{ 'common.verifying' | translate }}...
              </span>
            </button>
          </form>

          <div class="help-text">
            <p>{{ 'auth.mfa.totpHelp' | translate }}</p>
          </div>
        </div>

        <!-- Backup Code Verification -->
        <div *ngIf="activeTab === 'backup'" class="verification-content">
          <form [formGroup]="backupForm" (ngSubmit)="verifyBackupCode()" class="verification-form">
            <div class="form-group">
              <label for="backupCode" class="form-label">{{ 'auth.mfa.enterBackupCode' | translate }}</label>
              <input
                type="text"
                id="backupCode"
                formControlName="code"
                class="form-input"
                placeholder="XXXXXXXX"
                maxlength="8"
                autocomplete="one-time-code"
                [class.error]="backupForm.get('code')?.invalid && backupForm.get('code')?.touched">
              <div class="form-error" *ngIf="backupForm.get('code')?.invalid && backupForm.get('code')?.touched">
                {{ 'auth.mfa.backupCodeRequired' | translate }}
              </div>
            </div>

            <button
              type="submit"
              class="verify-button"
              [disabled]="backupForm.invalid || isVerifying">
              <span *ngIf="!isVerifying">{{ 'auth.mfa.verify' | translate }}</span>
              <span *ngIf="isVerifying" class="loading-content">
                <svg class="loading-spinner" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                {{ 'common.verifying' | translate }}...
              </span>
            </button>
          </form>

          <div class="help-text">
            <p>{{ 'auth.mfa.backupHelp' | translate }}</p>
          </div>
        </div>

        <div class="footer">
          <button type="button" class="back-button" (click)="goBack()">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            {{ 'common.backToLogin' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mfa-verification-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1e3a8a 100%);
      padding: 16px;
      position: relative;
    }

    .language-selector-container {
      position: absolute;
      top: 16px;
      right: 16px;
      z-index: 10;
    }

    .mfa-verification-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      padding: 32px;
      width: 100%;
      max-width: 450px;
      position: relative;
      overflow: hidden;
    }

    .mfa-verification-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    }

    .header {
      text-align: center;
      margin-bottom: 24px;
    }

    .logo {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      border-radius: 50%;
      margin-bottom: 16px;
    }

    .logo-icon {
      width: 24px;
      height: 24px;
      color: white;
    }

    .title {
      font-size: 22px;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 8px 0;
    }

    .subtitle {
      color: #6b7280;
      font-size: 14px;
      margin: 0;
      line-height: 1.4;
    }

    .verification-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
      background: #f3f4f6;
      border-radius: 8px;
      padding: 4px;
    }

    .tab-button {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px 16px;
      background: transparent;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      color: #6b7280;
      cursor: pointer;
      transition: all 0.2s;
    }

    .tab-button.active {
      background: white;
      color: #1f2937;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .verification-content {
      margin-bottom: 24px;
    }

    .verification-form {
      margin-bottom: 16px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-label {
      display: block;
      font-weight: 600;
      color: #374151;
      margin-bottom: 6px;
      font-size: 13px;
    }

    .form-input {
      width: 100%;
      padding: 10px 14px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 14px;
      transition: all 0.3s ease;
      background: #f9fafb;
      text-align: center;
      letter-spacing: 2px;
      font-family: monospace;
      color: #111827;
    }

    .form-input:focus {
      outline: none;
      border-color: #3b82f6;
      background: white;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-input.error {
      border-color: #ef4444;
      background: #fef2f2;
    }

    .verify-button {
      width: 100%;
      padding: 12px 20px;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .verify-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
    }

    .verify-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .loading-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .loading-spinner {
      width: 16px;
      height: 16px;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .help-text {
      text-align: center;
    }

    .help-text p {
      color: #6b7280;
      font-size: 13px;
      margin: 0;
      line-height: 1.4;
    }

    .footer {
      text-align: center;
    }

    .back-button {
      display: inline-flex;
      align-items: center;
      padding: 8px 16px;
      background: transparent;
      color: #6b7280;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .back-button:hover {
      background: #f9fafb;
      color: #374151;
    }

    /* Dark mode */
    .dark .mfa-verification-card {
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border-primary);
    }

    .dark .title {
      color: var(--color-text-primary);
    }

    .dark .subtitle {
      color: var(--color-text-secondary);
    }

    .dark .form-label {
      color: var(--color-text-primary);
    }

    .dark .form-input {
      background: var(--color-bg-secondary);
      border-color: var(--color-border-primary);
      color: var(--color-text-primary);
    }

    .dark .form-input:focus {
      background: var(--color-bg-primary);
    }

    .dark .back-button {
      color: var(--color-text-secondary);
      border-color: var(--color-border-primary);
    }

    .dark .back-button:hover {
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
    }

    /* Responsive */
    @media (max-width: 480px) {
      .mfa-verification-container {
        padding: 8px;
      }

      .mfa-verification-card {
        padding: 24px 16px;
      }

      .title {
        font-size: 20px;
      }

      .verification-tabs {
        flex-direction: column;
      }

      .tab-button {
        justify-content: flex-start;
      }
    }
  `]
})
export class MfaVerificationComponent implements OnInit, OnDestroy {
  activeTab: 'totp' | 'backup' = 'totp';
  isVerifying = false;
  mfaToken = '';

  totpForm: FormGroup;
  backupForm: FormGroup;

  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private mfaVerificationService: MfaVerificationService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {
    this.totpForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });

    this.backupForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^[A-Z0-9]{8}$/)]]
    });
  }

  ngOnInit(): void {
    // Get MFA token from query params or state
    const urlParams = new URLSearchParams(window.location.search);
    this.mfaToken = urlParams.get('token') || '';
    
    if (!this.mfaToken) {
      this.router.navigate(['/auth/login']);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  setActiveTab(tab: 'totp' | 'backup'): void {
    this.activeTab = tab;
  }

  verifyTotp(): void {
    if (this.totpForm.valid && this.mfaToken) {
      this.isVerifying = true;

      this.subscriptions.push(
        this.mfaVerificationService.verifyTotp(this.totpForm.value.code, this.mfaToken).subscribe({
          next: (response) => {
            this.authService.setToken(response.accessToken);
            this.authService.setUserData(response.user);
            this.authService.completeLogin(response.user);
            this.router.navigate(['/dashboard']);
            this.notificationService.showSuccess('Login successful');
          },
          error: (error) => {
            this.notificationService.showError('Invalid verification code');
            this.isVerifying = false;
          }
        })
      );
    }
  }

  verifyBackupCode(): void {
    if (this.backupForm.valid && this.mfaToken) {
      this.isVerifying = true;

      this.subscriptions.push(
        this.mfaVerificationService.verifyBackupCode(this.backupForm.value.code, this.mfaToken).subscribe({
          next: (response) => {
            this.authService.setToken(response.accessToken);
            this.authService.setUserData(response.user);
            this.authService.completeLogin(response.user);
            this.router.navigate(['/dashboard']);
            this.notificationService.showSuccess('Login successful');
          },
          error: (error) => {
            this.notificationService.showError('Invalid backup code');
            this.isVerifying = false;
          }
        })
      );
    }
  }

  goBack(): void {
    this.router.navigate(['/auth/login']);
  }
}
