import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { LanguageService } from '@core/services/language.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="reset-password-container">
      <div class="reset-password-card">
        <div class="header">
          <div class="logo">
            <svg class="logo-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>
          <h1 class="title">{{ 'auth.resetPassword.title' | translate }}</h1>
          <p class="subtitle">{{ 'auth.resetPassword.subtitle' | translate }}</p>
        </div>

        <form (ngSubmit)="onSubmit()" #resetForm="ngForm" class="form" *ngIf="!isSuccess">
          <div class="form-group">
            <label for="newPassword" class="form-label">
              {{ 'auth.resetPassword.newPasswordLabel' | translate }}
            </label>
            <div class="password-input-container">
              <input
                [type]="showPassword ? 'text' : 'password'"
                id="newPassword"
                name="newPassword"
                [(ngModel)]="newPassword"
                required
                minlength="8"
                class="form-input"
                [class.error]="passwordError"
                [placeholder]="'auth.resetPassword.newPasswordPlaceholder' | translate"
                [disabled]="isLoading">
              <button
                type="button"
                class="password-toggle"
                (click)="togglePassword()"
                [disabled]="isLoading">
                <svg *ngIf="!showPassword" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
                <svg *ngIf="showPassword" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                </svg>
              </button>
            </div>
            <div class="error-message" *ngIf="passwordError">
              {{ passwordError }}
            </div>
            <div class="password-requirements" *ngIf="newPassword && !passwordError">
              <div class="requirement" [class.valid]="hasMinLength">
                <svg class="requirement-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                {{ 'auth.resetPassword.requirements.minLength' | translate }}
              </div>
              <div class="requirement" [class.valid]="hasUppercase">
                <svg class="requirement-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                {{ 'auth.resetPassword.requirements.uppercase' | translate }}
              </div>
              <div class="requirement" [class.valid]="hasLowercase">
                <svg class="requirement-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                {{ 'auth.resetPassword.requirements.lowercase' | translate }}
              </div>
              <div class="requirement" [class.valid]="hasNumber">
                <svg class="requirement-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                {{ 'auth.resetPassword.requirements.number' | translate }}
              </div>
              <div class="requirement" [class.valid]="hasSpecial">
                <svg class="requirement-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                {{ 'auth.resetPassword.requirements.special' | translate }}
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="confirmPassword" class="form-label">
              {{ 'auth.resetPassword.confirmPasswordLabel' | translate }}
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              [(ngModel)]="confirmPassword"
              required
              class="form-input"
              [class.error]="confirmPasswordError"
              [placeholder]="'auth.resetPassword.confirmPasswordPlaceholder' | translate"
              [disabled]="isLoading">
            <div class="error-message" *ngIf="confirmPasswordError">
              {{ confirmPasswordError }}
            </div>
          </div>

          <button
            type="submit"
            class="submit-button"
            [disabled]="!resetForm.valid || !isPasswordValid || isLoading"
            [class.loading]="isLoading">
            <span *ngIf="!isLoading">{{ 'auth.resetPassword.submitButton' | translate }}</span>
            <span *ngIf="isLoading" class="loading-content">
              <svg class="loading-spinner" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              {{ 'auth.resetPassword.resetting' | translate }}
            </span>
          </button>
        </form>

        <div class="success-message" *ngIf="isSuccess">
          <div class="success-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h3>{{ 'auth.resetPassword.successTitle' | translate }}</h3>
          <p>{{ 'auth.resetPassword.successMessage' | translate }}</p>
          <button class="login-button" (click)="goToLogin()">
            {{ 'auth.resetPassword.goToLogin' | translate }}
          </button>
        </div>

        <div class="error-message" *ngIf="tokenError">
          <div class="error-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <h3>{{ 'auth.resetPassword.errorTitle' | translate }}</h3>
          <p>{{ 'auth.resetPassword.errorMessage' | translate }}</p>
          <button class="forgot-password-button" (click)="goToForgotPassword()">
            {{ 'auth.resetPassword.requestNewLink' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .reset-password-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .reset-password-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      padding: 40px;
      width: 100%;
      max-width: 500px;
      position: relative;
      overflow: hidden;
    }

    .reset-password-card::before {
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
      margin-bottom: 30px;
    }

    .logo {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      border-radius: 50%;
      margin-bottom: 20px;
    }

    .logo-icon {
      width: 30px;
      height: 30px;
      color: white;
    }

    .title {
      font-size: 28px;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 10px 0;
    }

    .subtitle {
      color: #6b7280;
      font-size: 16px;
      margin: 0;
      line-height: 1.5;
    }

    .form {
      margin-bottom: 30px;
    }

    .form-group {
      margin-bottom: 24px;
    }

    .form-label {
      display: block;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
      font-size: 14px;
    }

    .password-input-container {
      position: relative;
    }

    .form-input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 16px;
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

    .password-toggle {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #6b7280;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: color 0.2s ease;
    }

    .password-toggle:hover {
      color: #374151;
    }

    .password-toggle:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .password-toggle svg {
      width: 20px;
      height: 20px;
    }

    .error-message {
      color: #ef4444;
      font-size: 14px;
      margin-top: 6px;
    }

    .password-requirements {
      margin-top: 12px;
      padding: 16px;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }

    .requirement {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 8px;
    }

    .requirement:last-child {
      margin-bottom: 0;
    }

    .requirement.valid {
      color: #059669;
    }

    .requirement-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .requirement:not(.valid) .requirement-icon {
      display: none;
    }

    .submit-button {
      width: 100%;
      padding: 14px 24px;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
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
      width: 20px;
      height: 20px;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .success-message, .error-message {
      text-align: center;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .success-message {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
    }

    .error-message {
      background: #fef2f2;
      border: 1px solid #fecaca;
    }

    .success-icon, .error-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      margin-bottom: 16px;
    }

    .success-icon {
      background: #10b981;
    }

    .error-icon {
      background: #ef4444;
    }

    .success-icon svg, .error-icon svg {
      width: 24px;
      height: 24px;
      color: white;
    }

    .success-message h3 {
      color: #065f46;
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 8px 0;
    }

    .error-message h3 {
      color: #991b1b;
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 8px 0;
    }

    .success-message p, .error-message p {
      margin: 0 0 20px 0;
      font-size: 14px;
    }

    .success-message p {
      color: #047857;
    }

    .error-message p {
      color: #dc2626;
    }

    .login-button, .forgot-password-button {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .login-button:hover, .forgot-password-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }

    /* Dark mode */
    .dark .reset-password-card {
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

    .dark .password-requirements {
      background: var(--color-bg-secondary);
      border-color: var(--color-border-primary);
    }

    .dark .requirement {
      color: var(--color-text-secondary);
    }

    /* Responsive */
    @media (max-width: 480px) {
      .reset-password-container {
        padding: 10px;
      }

      .reset-password-card {
        padding: 30px 20px;
      }

      .title {
        font-size: 24px;
      }
    }
  `]
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  newPassword = '';
  confirmPassword = '';
  showPassword = false;
  isLoading = false;
  isSuccess = false;
  tokenError = false;
  passwordError = '';
  confirmPasswordError = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    // Get token from URL
    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      if (!this.token) {
        this.tokenError = true;
      }
    });

    // Check if user is already authenticated
    const authToken = localStorage.getItem('auth_token');
    if (authToken) {
      this.router.navigate(['/dashboard']);
    }
  }

  get hasMinLength(): boolean {
    return this.newPassword.length >= 8;
  }

  get hasUppercase(): boolean {
    return /[A-Z]/.test(this.newPassword);
  }

  get hasLowercase(): boolean {
    return /[a-z]/.test(this.newPassword);
  }

  get hasNumber(): boolean {
    return /\d/.test(this.newPassword);
  }

  get hasSpecial(): boolean {
    return /[@$!%*?&]/.test(this.newPassword);
  }

  get isPasswordValid(): boolean {
    return this.hasMinLength && this.hasUppercase && this.hasLowercase && this.hasNumber && this.hasSpecial;
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.isLoading) return;

    this.passwordError = '';
    this.confirmPasswordError = '';

    // Validate passwords match
    if (this.newPassword !== this.confirmPassword) {
      this.confirmPasswordError = this.languageService.translate('auth.resetPassword.passwordsDoNotMatch');
      return;
    }

    this.isLoading = true;

    this.http.post(`${environment.apiUrl}/auth/reset-password`, {
      token: this.token,
      newPassword: this.newPassword
    }).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        this.isSuccess = true;
      },
      error: (error) => {
        this.isLoading = false;
        if (error.error?.message) {
          this.passwordError = error.error.message;
        } else {
          this.passwordError = this.languageService.translate('auth.resetPassword.error');
        }
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  goToForgotPassword(): void {
    this.router.navigate(['/auth/forgot-password']);
  }
}
