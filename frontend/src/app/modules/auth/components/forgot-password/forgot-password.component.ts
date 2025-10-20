import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { LanguageService } from '@core/services/language.service';
import { LanguageSelectorComponent } from '@shared/components/language-selector/language-selector.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe, LanguageSelectorComponent],
  template: `
    <div class="forgot-password-container">
      <!-- Language Selector -->
      <div class="language-selector-container">
        <app-language-selector></app-language-selector>
      </div>
      
      <div class="forgot-password-card">
        <div class="header">
          <div class="logo">
            <svg class="logo-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>
          <h1 class="title">{{ 'auth.forgotPassword.title' | translate }}</h1>
          <p class="subtitle">{{ 'auth.forgotPassword.subtitle' | translate }}</p>
        </div>

        <form (ngSubmit)="onSubmit()" #forgotForm="ngForm" class="form">
          <div class="form-group">
            <label for="email" class="form-label">
              {{ 'auth.forgotPassword.emailLabel' | translate }}
            </label>
            <input
              type="email"
              id="email"
              name="email"
              [(ngModel)]="email"
              required
              email
              class="form-input"
              [class.error]="emailError"
              [placeholder]="'auth.forgotPassword.emailPlaceholder' | translate"
              [disabled]="isLoading">
            <div class="error-message" *ngIf="emailError">
              {{ emailError }}
            </div>
          </div>

          <button
            type="submit"
            class="submit-button"
            [disabled]="!forgotForm.valid || isLoading"
            [class.loading]="isLoading">
            <span *ngIf="!isLoading">{{ 'auth.forgotPassword.submitButton' | translate }}</span>
            <span *ngIf="isLoading" class="loading-content">
              <svg class="loading-spinner" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              {{ 'auth.forgotPassword.sending' | translate }}
            </span>
          </button>
        </form>

        <div class="success-message" *ngIf="isSuccess">
          <div class="success-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h3>{{ 'auth.forgotPassword.successTitle' | translate }}</h3>
          <p>{{ 'auth.forgotPassword.successMessage' | translate }}</p>
        </div>

        <div class="footer">
          <p class="back-to-login">
            {{ 'auth.forgotPassword.rememberPassword' | translate }}
            <a routerLink="/auth/login" class="login-link">
              {{ 'auth.forgotPassword.backToLogin' | translate }}
            </a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .forgot-password-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      /* Match login background */
      background: linear-gradient(135deg, #0b1220 0%, #0f172a 50%, #172554 100%);
      padding: 12px;
      position: relative;
    }

    .language-selector-container {
      position: absolute;
      top: 16px;
      right: 16px;
      z-index: 10;
    }

    .forgot-password-card {
      background: white;
      border-radius: 14px;
      box-shadow: 0 16px 32px rgba(0, 0, 0, 0.12);
      padding: 24px;
      width: 100%;
      max-width: 420px;
      position: relative;
      overflow: hidden;
    }

    .forgot-password-card::before {
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
      width: 42px;
      height: 42px;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      border-radius: 50%;
      margin-bottom: 12px;
    }

    .logo-icon {
      width: 20px;
      height: 20px;
      color: white;
    }

    .title {
      font-size: 20px;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 6px 0;
    }

    .subtitle {
      color: #6b7280;
      font-size: 13px;
      margin: 0;
      line-height: 1.4;
    }

    .form {
      margin-bottom: 24px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-label {
      display: block;
      font-weight: 600;
      color: #374151;
      margin-bottom: 6px;
      font-size: 12px;
    }

    .form-input {
      width: 100%;
      padding: 9px 12px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 13px;
      transition: all 0.3s ease;
      background: #f9fafb;
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

    .form-input:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .error-message {
      color: #ef4444;
      font-size: 12px;
      margin-top: 4px;
    }

    .submit-button {
      width: 100%;
      padding: 11px 16px;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .submit-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
    }

    .submit-button:disabled {
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

    .success-message {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      margin-bottom: 16px;
    }

    .success-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: #10b981;
      border-radius: 50%;
      margin-bottom: 12px;
    }

    .success-icon svg {
      width: 20px;
      height: 20px;
      color: white;
    }

    .success-message h3 {
      color: #065f46;
      font-size: 15px;
      font-weight: 600;
      margin: 0 0 6px 0;
    }

    .success-message p {
      color: #047857;
      margin: 0;
      font-size: 12px;
    }

    .footer {
      text-align: center;
    }

    .back-to-login {
      color: #6b7280;
      font-size: 12px;
      margin: 0;
    }

    .login-link {
      color: #3b82f6;
      text-decoration: none;
      font-weight: 600;
      margin-left: 4px;
    }

    .login-link:hover {
      text-decoration: underline;
    }

    /* Dark mode */
    .dark .forgot-password-card {
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

    .dark .back-to-login {
      color: var(--color-text-secondary);
    }

    /* Responsive */
    @media (max-width: 480px) {
      .forgot-password-container {
        padding: 8px;
      }

      .forgot-password-card {
        padding: 24px 16px;
      }

      .title {
        font-size: 20px;
      }
    }
  `]
})
export class ForgotPasswordComponent implements OnInit {
  email = '';
  isLoading = false;
  isSuccess = false;
  emailError = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    // Check if user is already authenticated
    const token = localStorage.getItem('auth_token');
    if (token) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit(): void {
    if (this.isLoading) return;

    this.emailError = '';
    this.isLoading = true;

    this.http.post(`${environment.apiUrl}/auth/forgot-password`, {
      email: this.email
    }).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        this.isSuccess = true;
      },
      error: (error) => {
        this.isLoading = false;
        if (error.error?.message) {
          this.emailError = error.error.message;
        } else {
          this.emailError = this.languageService.translate('auth.forgotPassword.error');
        }
      }
    });
  }
}
