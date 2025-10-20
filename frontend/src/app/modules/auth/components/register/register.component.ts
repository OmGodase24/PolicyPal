import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';

import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { InviteService, ValidateInviteResponse, UseInviteRequest } from '@core/services/invite.service';
import { environment } from 'src/environments/environment';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { LanguageSelectorComponent } from '@shared/components/language-selector/language-selector.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslatePipe,
    LanguageSelectorComponent
  ],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 py-2 px-4 sm:px-5 lg:px-6">
      <!-- Language Selector -->
      <div class="absolute top-3 right-3 z-10">
        <app-language-selector></app-language-selector>
      </div>
      
      <div class="max-w-md w-full space-y-2">
        <!-- Header -->
        <div class="text-center">
          <div class="mx-auto h-8 w-8 bg-white rounded-xl flex items-center justify-center shadow-lg mb-1">
            <svg class="h-5 w-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
          <h2 class="text-base font-bold text-white mb-0.5">{{ appName }}</h2>
          <p class="text-slate-200 text-[10px]">{{ appTagline }}</p>
        </div>

        <!-- Registration Form -->
        <div class="bg-white rounded-xl shadow-2xl p-3 space-y-2.5 animate-fade-in">
          <div class="text-center">
            <h3 class="text-sm font-semibold text-gray-900 mb-0.5">{{ 'auth.register.title' | translate }}</h3>
            <p class="text-gray-600 text-[10px]">{{ 'auth.register.subtitle' | translate }}</p>
          </div>

          <!-- Invite Information -->
          <div *ngIf="isInviteLoading" class="bg-blue-50 border border-blue-200 rounded-md p-2">
            <div class="flex items-center">
              <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
              <span class="text-blue-800 text-[10px]">Validating invitation...</span>
            </div>
          </div>

          <div *ngIf="isInviteValid && inviteData" class="bg-green-50 border border-green-200 rounded-md p-2">
            <div class="flex items-start">
              <div class="flex-shrink-0">
                <svg class="h-3.5 w-3.5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
              </div>
              <div class="ml-2">
                <h4 class="text-[10px] font-medium text-green-800">You're invited to join PolicyPal!</h4>
                <p class="text-[10px] text-green-700 mt-0.5">
                  Invited by: <strong>{{ inviteData.invite?.invitedBy }}</strong>
                </p>
                <p class="text-[10px] text-green-700">
                  Email: <strong>{{ inviteData.invite?.email }}</strong>
                </p>
                <p *ngIf="inviteData.invite?.message" class="text-[10px] text-green-700 mt-1">
                  <em>"{{ inviteData.invite?.message }}"</em>
                </p>
              </div>
            </div>
          </div>

          <div *ngIf="inviteError" class="bg-red-50 border border-red-200 rounded-md p-2">
            <div class="flex items-start">
              <div class="flex-shrink-0">
                <svg class="h-3.5 w-3.5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                </svg>
              </div>
              <div class="ml-2">
                <h4 class="text-[10px] font-medium text-red-800">Invalid Invitation</h4>
                <p class="text-[10px] text-red-700 mt-0.5">{{ inviteError }}</p>
                <p class="text-[10px] text-red-700 mt-1">
                  You can still register normally using the form below.
                </p>
              </div>
            </div>
          </div>

          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-2.5">
            <!-- Name Fields -->
            <div class="grid grid-cols-2 gap-2">
              <!-- First Name -->
              <div class="form-group">
                <label for="firstName" class="form-label text-[11px]">{{ 'auth.register.firstName' | translate }}</label>
                <div class="relative">
                  <input
                    id="firstName"
                    type="text"
                    formControlName="firstName"
                    class="form-input pl-10 text-xs py-1.5"
                    [class.border-danger-300]="registerForm.get('firstName')?.invalid && registerForm.get('firstName')?.touched"
                    placeholder="John"
                    autocomplete="given-name">
                  <div class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <svg class="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                  </div>
                </div>
                @if (registerForm.get('firstName')?.invalid && registerForm.get('firstName')?.touched) {
                  <div class="form-error text-[10px]">First name is required</div>
                }
              </div>

              <!-- Last Name -->
              <div class="form-group">
                <label for="lastName" class="form-label text-[11px]">{{ 'auth.register.lastName' | translate }}</label>
                <div class="relative">
                  <input
                    id="lastName"
                    type="text"
                    formControlName="lastName"
                    class="form-input pl-10 text-xs py-1.5"
                    [class.border-danger-300]="registerForm.get('lastName')?.invalid && registerForm.get('lastName')?.touched"
                    placeholder="Doe"
                    autocomplete="family-name">
                  <div class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <svg class="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                  </div>
                </div>
                @if (registerForm.get('lastName')?.invalid && registerForm.get('lastName')?.touched) {
                  <div class="form-error text-[10px]">Last name is required</div>
                }
              </div>
            </div>

            <!-- Email Field -->
            <div class="form-group">
              <label for="email" class="form-label text-[11px]">{{ 'auth.register.email' | translate }}</label>
              <div class="relative">
                <input
                  id="email"
                  type="email"
                  formControlName="email"
                  class="form-input pl-10 text-xs py-1.5"
                  [class.border-danger-300]="registerForm.get('email')?.invalid && registerForm.get('email')?.touched"
                  placeholder="john.doe@example.com"
                  autocomplete="email">
                <div class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <svg class="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"></path>
                  </svg>
                </div>
              </div>
              @if (registerForm.get('email')?.invalid && registerForm.get('email')?.touched) {
                <div class="form-error text-[10px]">
                  @if (registerForm.get('email')?.errors?.['required']) {
                    Email is required
                  }
                  @if (registerForm.get('email')?.errors?.['email']) {
                    Please enter a valid email address
                  }
                </div>
              }
            </div>

            <!-- Password Field -->
            <div class="form-group">
              <label for="password" class="form-label text-[11px]">{{ 'auth.register.password' | translate }}</label>
              <div class="relative">
                <input
                  id="password"
                  [type]="hidePassword ? 'password' : 'text'"
                  formControlName="password"
                  class="form-input pl-10 pr-8 text-xs py-1.5"
                  [class.border-danger-300]="registerForm.get('password')?.invalid && registerForm.get('password')?.touched"
                  [placeholder]="'auth.register.passwordPlaceholder' | translate"
                  autocomplete="new-password">
                <div class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <svg class="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                  </svg>
                </div>
                <button
                  type="button"
                  (click)="togglePasswordVisibility()"
                  class="absolute inset-y-0 right-0 pr-2 flex items-center focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded">
                  <svg class="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    @if (hidePassword) {
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                    } @else {
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                    }
                  </svg>
                </button>
              </div>
              @if (registerForm.get('password')?.invalid && registerForm.get('password')?.touched) {
                <div class="form-error text-[10px]">
                  @if (registerForm.get('password')?.errors?.['required']) {
                    {{ 'auth.register.passwordRequired' | translate }}
                  }
                  @if (registerForm.get('password')?.errors?.['minlength']) {
                    {{ 'auth.register.passwordMinLength' | translate }}
                  }
                </div>
              }
              <!-- Password Strength Indicator -->
              @if (registerForm.get('password')?.value) {
                <div class="mt-1">
                  <div class="flex items-center space-x-1.5">
                    <div class="flex space-x-0.5">
                      @for (item of getPasswordStrengthBars(); track $index) {
                        <div class="h-0.5 w-5 rounded" [class]="item"></div>
                      }
                    </div>
                    <span class="text-[10px] text-gray-600">{{ getPasswordStrengthText() }}</span>
                  </div>
                </div>
              }
            </div>

            <!-- Terms and Conditions -->
            <div class="flex items-start">
              <div class="flex items-center h-4">
                <input
                  id="terms"
                  type="checkbox"
                  formControlName="agreeToTerms"
                  class="h-3.5 w-3.5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded">
              </div>
              <div class="ml-2 text-[10px]">
                <label for="terms" class="text-gray-700">
                  {{ 'auth.register.termsAgreement' | translate }}
                </label>
                @if (registerForm.get('agreeToTerms')?.invalid && registerForm.get('agreeToTerms')?.touched) {
                  <div class="form-error mt-0.5 text-[10px]">You must agree to the terms and conditions</div>
                }
              </div>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              [disabled]="registerForm.invalid || isLoading"
              class="btn-primary w-full justify-center text-xs py-2"
              [class.opacity-50]="registerForm.invalid || isLoading"
              [class.cursor-not-allowed]="registerForm.invalid || isLoading">
              @if (isLoading) {
                <div class="spinner spinner-sm mr-2"></div>
                Creating account...
              } @else {
                <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                </svg>
                {{ 'auth.register.createAccount' | translate }}
              }
            </button>

            <!-- Divider -->
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-300"></div>
              </div>
              <div class="relative flex justify-center text-[10px]">
                <span class="px-2 bg-white text-gray-500">{{ 'auth.register.haveAccount' | translate }}</span>
              </div>
            </div>

            <!-- Login Link -->
            <div class="text-center">
              <a routerLink="/auth/login" 
                 class="btn-secondary w-full justify-center text-xs py-2">
                <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                </svg>
                {{ 'auth.register.signIn' | translate }}
              </a>
            </div>
          </form>
        </div>

        <!-- Footer -->
        <div class="text-center text-slate-200 text-[10px]">
          <p>&copy; 2024 {{ appName }}. All rights reserved.</p>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent implements OnInit, OnDestroy {
  registerForm!: FormGroup;
  isLoading = false;
  hidePassword = true;
  appName = environment.appName;
  appTagline = environment.appTagline;

  // Invite-related properties
  inviteToken: string | null = null;
  inviteData: ValidateInviteResponse | null = null;
  isInviteValid = false;
  isInviteLoading = false;
  inviteError = '';

  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private notificationService: NotificationService,
    private inviteService: InviteService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.checkForInviteToken();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private initializeForm(): void {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      agreeToTerms: [false, [Validators.requiredTrue]]
    });
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  getPasswordStrength(): number {
    const password = this.registerForm.get('password')?.value || '';
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/\d/)) strength++;
    if (password.match(/[^a-zA-Z\d]/)) strength++;
    
    return strength;
  }

  getPasswordStrengthBars(): string[] {
    const strength = this.getPasswordStrength();
    const bars = [];
    
    for (let i = 0; i < 4; i++) {
      if (i < strength) {
        if (strength <= 1) bars.push('bg-danger-400');
        else if (strength <= 2) bars.push('bg-warning-400');
        else if (strength <= 3) bars.push('bg-primary-400');
        else bars.push('bg-success-400');
      } else {
        bars.push('bg-gray-200');
      }
    }
    
    return bars;
  }

  getPasswordStrengthText(): string {
    const strength = this.getPasswordStrength();
    const texts = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    return texts[strength] || 'Very Weak';
  }

  private checkForInviteToken(): void {
    this.route.queryParams.subscribe(params => {
      if (params['invite']) {
        this.inviteToken = params['invite'];
        this.validateInvite();
      }
    });
  }

  private validateInvite(): void {
    if (!this.inviteToken) return;

    this.isInviteLoading = true;
    this.inviteError = '';

    this.subscriptions.push(
      this.inviteService.validateInvite(this.inviteToken).subscribe({
        next: (response) => {
          this.isInviteLoading = false;
          if (response.success && response.valid) {
            this.inviteData = response;
            this.isInviteValid = true;
            // Auto-fill email and disable editing
            this.registerForm.patchValue({
              email: response.invite?.email || ''
            });
            this.registerForm.get('email')?.disable();
          } else {
            this.inviteError = response.message || 'Invalid invite token';
            this.isInviteValid = false;
          }
        },
        error: (error) => {
          this.isInviteLoading = false;
          this.inviteError = 'Failed to validate invite token';
          this.isInviteValid = false;
        }
      })
    );
  }

  onSubmit(): void {
    if (this.registerForm.valid && !this.isLoading) {
      this.isLoading = true;
      const formValue = this.registerForm.value;

      // If this is an invite signup, use the invite service
      if (this.isInviteValid && this.inviteToken) {
        const inviteRequest: UseInviteRequest = {
          token: this.inviteToken,
          name: `${formValue.firstName} ${formValue.lastName}`,
          password: formValue.password
        };

        this.subscriptions.push(
          this.inviteService.useInvite(inviteRequest).subscribe({
            next: (response) => {
              this.isLoading = false;
              if (response.success) {
                this.notificationService.showSuccess('Account created successfully! Please log in.');
                this.router.navigate(['/auth/login']);
              } else {
                this.notificationService.showError(response.message || 'Registration failed');
              }
            },
            error: (error) => {
              this.isLoading = false;
              this.notificationService.showError(
                error?.error?.message || 'Registration failed. Please try again.'
              );
            }
          })
        );
      } else {
        // Regular registration
        this.subscriptions.push(
          this.authService.register(formValue).subscribe({
            next: () => {
              this.router.navigate(['/auth/login']);
            },
            error: (error) => {
              this.isLoading = false;
              this.notificationService.showError(
                error?.error?.message || 'Registration failed. Please try again.'
              );
            },
            complete: () => {
              this.isLoading = false;
            }
          })
        );
      }
    }
  }
}