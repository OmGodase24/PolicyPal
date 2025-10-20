import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { environment } from 'src/environments/environment';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { LanguageSelectorComponent } from '@shared/components/language-selector/language-selector.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslatePipe,
    LanguageSelectorComponent
  ],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 py-4 px-4 sm:px-5 lg:px-6">
      <!-- Language Selector -->
      <div class="absolute top-4 right-4 z-10">
        <app-language-selector></app-language-selector>
      </div>
      
      <div class="max-w-md w-full space-y-5">
        <!-- Header -->
        <div class="text-center">
          <div class="mx-auto h-10 w-10 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-2">
            <svg class="h-7 w-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
          <h2 class="text-xl font-bold text-white mb-1">{{ appName }}</h2>
          <p class="text-slate-200 text-xs">{{ appTagline }}</p>
        </div>

        <!-- Login Form -->
        <div class="bg-white rounded-2xl shadow-2xl p-4 space-y-4 animate-fade-in">
          <div class="text-center">
            <h3 class="text-lg font-semibold text-gray-900 mb-1">{{ 'auth.login.title' | translate }}</h3>
            <p class="text-gray-600 text-xs">{{ 'auth.login.subtitle' | translate }}</p>
          </div>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-4">
            <!-- Email Field -->
            <div class="form-group">
              <label for="email" class="form-label">{{ 'auth.login.email' | translate }}</label>
              <div class="relative">
                <input
                  id="email"
                  type="email"
                  formControlName="email"
                  class="form-input pl-10"
                  [class.border-danger-300]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
                  placeholder="{{ 'auth.login.email' | translate }}"
                  autocomplete="email">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"></path>
                  </svg>
                </div>
              </div>
              @if (loginForm.get('email')?.invalid && loginForm.get('email')?.touched) {
                <div class="form-error text-xs">
                  @if (loginForm.get('email')?.errors?.['required']) {
                    {{ 'auth.login.emailRequired' | translate }}
                  }
                  @if (loginForm.get('email')?.errors?.['email']) {
                    {{ 'auth.login.emailInvalid' | translate }}
                  }
                </div>
              }
            </div>

            <!-- Password Field -->
            <div class="form-group">
              <label for="password" class="form-label">{{ 'auth.login.password' | translate }}</label>
              <div class="relative">
                <input
                  id="password"
                  [type]="hidePassword ? 'password' : 'text'"
                  formControlName="password"
                  class="form-input pl-10 pr-10"
                  [class.border-danger-300]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
                  placeholder="{{ 'auth.login.password' | translate }}"
                  autocomplete="current-password">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                  </svg>
                </div>
                <button
                  type="button"
                  (click)="togglePasswordVisibility()"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded">
                  <svg class="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    @if (hidePassword) {
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                    } @else {
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                    }
                  </svg>
                </button>
              </div>
              @if (loginForm.get('password')?.invalid && loginForm.get('password')?.touched) {
                <div class="form-error text-xs">{{ 'auth.login.passwordRequired' | translate }}</div>
              }
            </div>

            <!-- Remember Me & Forgot Password -->
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded">
                <label for="remember-me" class="ml-2 block text-xs text-gray-900">
                  {{ 'auth.login.rememberMe' | translate }}
                </label>
              </div>
              <div class="text-xs">
                <a routerLink="/auth/forgot-password" class="font-medium text-primary-600 hover:text-primary-500 transition-colors duration-200">
                  {{ 'auth.login.forgotPassword' | translate }}
                </a>
              </div>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              [disabled]="loginForm.invalid || isLoading"
              class="btn-primary w-full justify-center"
              [class.opacity-50]="loginForm.invalid || isLoading"
              [class.cursor-not-allowed]="loginForm.invalid || isLoading">
              @if (isLoading) {
                <div class="spinner spinner-sm mr-2"></div>
                {{ 'common.loading' | translate }}...
              } @else {
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                </svg>
                {{ 'auth.login.signIn' | translate }}
              }
            </button>

            <!-- Divider -->
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-300"></div>
              </div>
              <div class="relative flex justify-center text-xs">
                <span class="px-2 bg-white text-gray-500 text-xs">{{ 'auth.login.noAccount' | translate }}</span>
              </div>
            </div>

            <!-- Register Link -->
            <div class="text-center">
              <a routerLink="/auth/register" 
                 class="btn-secondary w-full justify-center">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                </svg>
                {{ 'auth.login.signUp' | translate }}
              </a>
            </div>
          </form>
        </div>

        <!-- Footer -->
        <div class="text-center text-slate-200 text-xs">
          <p>&copy; 2024 {{ appName }}. All rights reserved.</p>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  hidePassword = true;
  appName = environment.appName;
  appTagline = environment.appTagline;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  onSubmit(): void {
    if (this.loginForm.valid && !this.isLoading) {
      this.isLoading = true;
      const formValue = this.loginForm.value;

      this.authService.login(formValue).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          
          // Check if MFA is required
          if (response.mfaRequired && response.mfaToken) {
            // Redirect to MFA verification page
            this.router.navigate(['/auth/mfa-verification'], {
              queryParams: { token: response.mfaToken }
            });
          } else {
            // Normal login flow
            this.router.navigate(['/dashboard']);
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.notificationService.showError(
            error?.error?.message || 'Login failed. Please check your credentials.'
          );
        }
      });
    }
  }
}