import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { User } from '@core/models/user.model';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslatePipe
  ],
  template: `
    <div class="profile-container">
      <div class="profile-content">
        <div class="profile-wrapper">
          <!-- Header -->
          <div class="profile-header">
            <h1 class="profile-title">{{ 'profile.title' | translate }}</h1>
            <p class="profile-subtitle">{{ 'profile.subtitle' | translate }}</p>
          </div>

          <!-- Profile Form -->
          <div class="profile-form">
            <div class="form-section-header">
              <h3 class="section-title">{{ 'profile.personalInfo' | translate }}</h3>
            </div>
            <div class="form-section-content">
              @if (isLoading) {
                <div class="loading-state">
                  <div class="loading-spinner">
                    <div class="spinner"></div>
                    <span>{{ 'profile.loading' | translate }}</span>
                  </div>
                </div>
              } @else {
                <form [formGroup]="profileForm" (ngSubmit)="onSubmit()" class="space-y-6">
                  <!-- Name Change Limit Warning -->
                  @if (currentUser?.lastNameChangeAt) {
                    @if (this.canChangeName()) {
                      <div class="info-card">
                        <div class="info-card-header">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          <span class="info-card-title">{{ 'profile.nameChangeAvailable' | translate }}</span>
                        </div>
                        <p class="info-card-text">
                          {{ 'profile.nameChangeAvailableText' | translate }}
                        </p>
                      </div>
                    } @else {
                      <div class="info-card">
                        <div class="info-card-header">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                          </svg>
                          <span class="info-card-title">{{ 'profile.nameChangeLimitReached' | translate }}</span>
                        </div>
                        <p class="info-card-text">
                          {{ 'profile.nameChangeLimitText' | translate: { days: this.getDaysRemaining() } }}
                        </p>
                      </div>
                    }
                  } @else {
                    <div class="info-card">
                      <div class="info-card-header">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span class="info-card-title">{{ 'profile.firstTimeSetup' | translate }}</span>
                      </div>
                      <p class="info-card-text">
                        {{ 'profile.firstTimeSetupText' | translate }}
                      </p>
                    </div>
                  }

                  <!-- Name Fields -->
                  <div class="form-grid">
                    <div class="form-group">
                      <label for="firstName" class="form-label">{{ 'profile.firstName' | translate }}</label>
                      <input
                        id="firstName"
                        type="text"
                        formControlName="firstName"
                        class="form-input"
                        [class.error]="profileForm.get('firstName')?.invalid && profileForm.get('firstName')?.touched"
                        [disabled]="!this.canChangeName()"
                        placeholder="John">
                      @if (profileForm.get('firstName')?.invalid && profileForm.get('firstName')?.touched) {
                        <div class="form-error">{{ 'profile.firstNameRequired' | translate }}</div>
                      }
                    </div>

                    <div class="form-group">
                      <label for="lastName" class="form-label">{{ 'profile.lastName' | translate }}</label>
                      <input
                        id="lastName"
                        type="text"
                        formControlName="lastName"
                        class="form-input"
                        [class.error]="profileForm.get('lastName')?.invalid && profileForm.get('lastName')?.touched"
                        [disabled]="!this.canChangeName()"
                        placeholder="Doe">
                      @if (profileForm.get('lastName')?.invalid && profileForm.get('lastName')?.touched) {
                        <div class="form-error">{{ 'profile.lastNameRequired' | translate }}</div>
                      }
                    </div>
                  </div>

                  <!-- Email -->
                  <div class="form-group">
                    <label for="email" class="form-label">{{ 'profile.email' | translate }}</label>
                    <input
                      id="email"
                      type="email"
                      formControlName="email"
                      class="form-input"
                      [class.error]="profileForm.get('email')?.invalid && profileForm.get('email')?.touched"
                      placeholder="john.doe@example.com"
                      readonly>
                    <div class="form-help">{{ 'profile.emailCannotChange' | translate }}</div>
                  </div>

                  <!-- Account Info -->
                  <div class="account-info">
                    <h4 class="account-info-title">{{ 'profile.accountInformation' | translate }}</h4>
                    <div class="account-info-grid">
                      <div class="account-info-item">
                        <dt class="account-info-label">{{ 'profile.accountStatus' | translate }}</dt>
                        <dd>
                          <span class="badge-success">
                            {{ currentUser?.isActive ? ('profile.active' | translate) : ('profile.inactive' | translate) }}
                          </span>
                        </dd>
                      </div>
                      <div class="account-info-item">
                        <dt class="account-info-label">{{ 'profile.memberSince' | translate }}</dt>
                        <dd class="account-info-value">{{ currentUser?.createdAt | date:'mediumDate' }}</dd>
                      </div>
                      <div class="account-info-item">
                        <dt class="account-info-label">{{ 'profile.lastLogin' | translate }}</dt>
                        <dd class="account-info-value">
                          {{ currentUser?.lastLoginAt ? (currentUser?.lastLoginAt | date:'medium') : ('profile.never' | translate) }}
                        </dd>
                      </div>
                      <div class="account-info-item">
                        <dt class="account-info-label">{{ 'profile.lastNameChange' | translate }}</dt>
                        <dd class="account-info-value">
                          {{ currentUser?.lastNameChangeAt ? (currentUser?.lastNameChangeAt | date:'mediumDate') : ('profile.never' | translate) }}
                        </dd>
                      </div>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="form-actions">
                    <button type="button" (click)="resetForm()" class="btn-secondary">
                      {{ 'profile.reset' | translate }}
                    </button>
                    <button
                      type="submit"
                      [disabled]="profileForm.invalid || isSaving || !profileForm.dirty"
                      class="btn-primary">
                      @if (isSaving) {
                        <div class="spinner"></div>
                        {{ 'profile.saving' | translate }}
                      } @else {
                        {{ 'profile.saveChanges' | translate }}
                      }
                    </button>
                  </div>
                </form>

                <!-- Password Section CTA -->
                <div class="password-section">
                  <div class="form-section-header">
                    <h3 class="section-title">{{ 'profile.changePassword' | translate }}</h3>
                    <p class="section-description">{{ 'profile.passwordChangeDescription' | translate }}</p>
                  </div>
                  <div class="security-actions">
                    <a routerLink="/profile/password" class="btn-primary">{{ 'profile.updatePassword' | translate }}</a>
                  </div>
                </div>

                <!-- Security Settings Section -->
                <div class="security-section">
                  <div class="form-section-header">
                    <h3 class="section-title">{{ 'profile.security.title' | translate }}</h3>
                    <p class="section-description">{{ 'profile.security.description' | translate }}</p>
                  </div>
                  
                  <div class="security-actions">
                    <a routerLink="/profile/security" class="btn btn-primary">
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                      </svg>
                      {{ 'profile.security.mfa.title' | translate }}
                    </a>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-container {
      min-height: 100vh;
      background: var(--color-bg-primary);
      padding: 2rem;
    }

    .profile-content {
      max-width: 800px;
      margin: 0 auto;
    }

    .profile-wrapper {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border-primary);
      border-radius: 12px;
      box-shadow: 0 2px 8px var(--color-shadow);
      overflow: hidden;
    }

    .profile-header {
      background: var(--color-bg-secondary);
      border-bottom: 1px solid var(--color-border-primary);
      color: var(--color-text-primary);
      padding: 2rem;
      text-align: center;
    }

    .profile-title {
      font-size: 2rem;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 0.5rem 0;
    }

    .profile-subtitle {
      font-size: 1rem;
      color: var(--color-text-secondary);
      margin: 0;
    }

    .profile-form {
      padding: 2rem;
    }

    .form-section-header {
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--color-border-primary);
    }

    .section-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 0.5rem 0;
    }

    .section-description {
      color: var(--color-text-secondary);
      font-size: 0.875rem;
      margin: 0;
    }

    .password-section {
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid var(--color-border-primary);
    }

    /* Ensure clear separation from the password section */
    .security-section {
      margin-top: 2.25rem;
      padding-top: 1.75rem;
      border-top: 1px solid var(--color-border-primary);
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-label {
      display: block;
      font-weight: 600;
      color: var(--color-text-primary);
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }

    .form-input {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid var(--color-border-primary);
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.3s ease;
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
    }

    .form-input:focus {
      outline: none;
      border-color: var(--color-primary);
      background: var(--color-bg-primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
    }

    .form-input.error {
      border-color: var(--color-danger);
      background: var(--color-danger-light);
    }

    .form-input:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .password-input-container {
      position: relative;
    }

    .password-toggle {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--color-text-secondary);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: color 0.2s ease;
    }

    .password-toggle:hover {
      color: var(--color-text-primary);
    }

    .password-toggle svg {
      width: 20px;
      height: 20px;
    }

    .form-error {
      color: var(--color-danger);
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }

    .form-help {
      color: var(--color-text-secondary);
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }

    .info-card {
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border-primary);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }

    .info-card-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .info-card-title {
      font-weight: 600;
      color: var(--color-text-primary);
      font-size: 0.875rem;
    }

    .info-card-text {
      color: var(--color-text-secondary);
      font-size: 0.875rem;
      margin: 0 0 1rem 0;
    }

    .info-card-actions {
      margin-top: 1rem;
    }

    .btn-link {
      color: #3b82f6;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .btn-link:hover {
      text-decoration: underline;
    }

    .account-info {
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border-primary);
      border-radius: 8px;
      padding: 1.5rem;
      margin: 1.5rem 0;
    }

    .account-info-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 1rem 0;
    }

    .account-info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .account-info-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .account-info-label {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      font-weight: 500;
    }

    .account-info-value {
      font-size: 0.875rem;
      color: var(--color-text-primary);
      font-weight: 600;
    }

    .badge-success {
      background: #dcfce7;
      color: #166534;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      margin-top: 2rem;
    }

    .btn-primary, .btn-secondary {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.3s ease;
      border: none;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-primary {
      background: #2563eb;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .btn-secondary {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
      border: 1px solid var(--color-border-primary);
    }

    .btn-secondary:hover {
      background: #e5e7eb;
    }

    .loading-state {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem;
    }

    .loading-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid #e5e7eb;
      border-top: 2px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Dark mode - variables handle most colors; keep structural overrides */
    .dark .profile-container { background: var(--color-bg-primary); }
    .dark .profile-wrapper { background: var(--color-bg-secondary); }
    .dark .profile-header { background: var(--color-bg-secondary); }
    .dark .profile-subtitle { color: var(--color-text-secondary); }

    .dark .section-title {
      color: var(--color-text-primary);
    }

    .dark .section-description {
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

    .dark .info-card {
      background: var(--color-bg-secondary);
      border-color: var(--color-border-primary);
    }

    .dark .info-card-title {
      color: var(--color-text-primary);
    }

    .dark .info-card-text {
      color: var(--color-text-secondary);
    }

    .dark .account-info {
      background: var(--color-bg-secondary);
    }

    .dark .account-info-title {
      color: var(--color-text-primary);
    }

    .dark .account-info-label {
      color: var(--color-text-secondary);
    }

    .dark .account-info-value {
      color: var(--color-text-primary);
    }

    .dark .btn-secondary {
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
      border-color: var(--color-border-primary);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .profile-container {
        padding: 1rem;
      }

      .profile-form {
        padding: 1.5rem;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }

      .form-actions {
        flex-direction: column;
      }

      .account-info-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ProfileComponent implements OnInit {
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  currentUser: User | null = null;
  isLoading = true;
  isSaving = false;
  isPasswordSaving = false;
  showCurrentPassword = false;
  showNewPassword = false;
  passwordResetLimitReached = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private notificationService: NotificationService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.initializePasswordForm();
    this.loadProfile();
  }

  private initializeForm(): void {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  private loadProfile(): void {
    // First check if we have user data from auth service
    this.currentUser = this.authService.getCurrentUser();
    
    if (this.currentUser) {
      this.populateForm(this.currentUser);
      this.isLoading = false;
    } else {
      // Fetch from server
      this.authService.getProfile().subscribe({
        next: (user) => {
          this.currentUser = user;
          this.populateForm(user);
          this.isLoading = false;
        },
        error: () => {
          this.notificationService.showError('Failed to load profile');
          this.isLoading = false;
        }
      });
    }
  }

  private populateForm(user: User): void {
    this.profileForm.patchValue({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email
    });
  }

  resetForm(): void {
    if (this.currentUser) {
      this.populateForm(this.currentUser);
    }
  }

  onSubmit(): void {
    if (this.profileForm.valid && !this.isSaving && this.profileForm.dirty) {
      this.isSaving = true;
      const formValue = this.profileForm.value;

      // Check if names have actually changed
      const firstNameChanged = formValue.firstName !== this.currentUser?.firstName;
      const lastNameChanged = formValue.lastName !== this.currentUser?.lastName;

      if (!firstNameChanged && !lastNameChanged) {
        // No actual changes, just mark as pristine
        this.isSaving = false;
        this.profileForm.markAsPristine();
        return;
      }

      // Check monthly limit for name changes
      if (this.currentUser?.lastNameChangeAt) {
        const lastChangeDate = new Date(this.currentUser.lastNameChangeAt);
        const currentDate = new Date();
        const monthsSinceLastChange = this.getMonthsDifference(lastChangeDate, currentDate);
        
        if (monthsSinceLastChange < 1) {
          const daysRemaining = 30 - this.getDaysDifference(lastChangeDate, currentDate);
          this.notificationService.showError(
            `You can only change your name once per month. Please wait ${daysRemaining} more days.`
          );
          this.isSaving = false;
          return;
        }
      }

      // Call the auth service to update the profile
      this.authService.updateProfile({
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        lastNameChangeAt: new Date().toISOString() // Track when name was last changed
      }).subscribe({
        next: (updatedUser) => {
          // Update the local currentUser reference
          this.currentUser = updatedUser;
          
          // Show success message
          this.notificationService.showSuccess('Profile updated successfully');
          
          // Reset form state
          this.isSaving = false;
          this.profileForm.markAsPristine();
        },
        error: (error) => {
          console.error('Profile update failed:', error);
          this.isSaving = false;
          // Form remains dirty so user can retry
        }
      });
    }
  }

  private getMonthsDifference(date1: Date, date2: Date): number {
    return (date2.getFullYear() - date1.getFullYear()) * 12 + 
           (date2.getMonth() - date1.getMonth());
  }

  private getDaysDifference(date1: Date, date2: Date): number {
    const timeDiff = date2.getTime() - date1.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  canChangeName(): boolean {
    if (!this.currentUser?.lastNameChangeAt) {
      return true; // First time setup
    }
    
    const lastChangeDate = new Date(this.currentUser.lastNameChangeAt);
    const currentDate = new Date();
    const monthsSinceLastChange = this.getMonthsDifference(lastChangeDate, currentDate);
    
    return monthsSinceLastChange >= 1;
  }

  getDaysRemaining(): number {
    if (!this.currentUser?.lastNameChangeAt) {
      return 0;
    }
    
    const lastChangeDate = new Date(this.currentUser.lastNameChangeAt);
    const currentDate = new Date();
    const daysSinceLastChange = this.getDaysDifference(lastChangeDate, currentDate);
    
    return Math.max(0, 30 - daysSinceLastChange);
  }

  private initializePasswordForm(): void {
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  toggleCurrentPassword(): void {
    this.showCurrentPassword = !this.showCurrentPassword;
  }

  toggleNewPassword(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  resetPasswordForm(): void {
    this.passwordForm.reset();
    this.showCurrentPassword = false;
    this.showNewPassword = false;
  }

  passwordsDoNotMatch(): boolean {
    const newPassword = this.passwordForm.get('newPassword')?.value;
    const confirmPassword = this.passwordForm.get('confirmPassword')?.value;
    return newPassword && confirmPassword && newPassword !== confirmPassword;
  }

  onPasswordSubmit(): void {
    if (this.passwordForm.valid && !this.isPasswordSaving && !this.passwordsDoNotMatch()) {
      this.isPasswordSaving = true;
      const formValue = this.passwordForm.value;

      this.http.post(`${environment.apiUrl}/auth/change-password`, {
        currentPassword: formValue.currentPassword,
        newPassword: formValue.newPassword
      }).subscribe({
        next: (response: any) => {
          this.isPasswordSaving = false;
          this.notificationService.showSuccess('Password changed successfully!');
          this.resetPasswordForm();
          this.passwordResetLimitReached = true;
        },
        error: (error) => {
          this.isPasswordSaving = false;
          this.notificationService.showError(
            error?.error?.message || 'Failed to change password'
          );
        }
      });
    }
  }

  getPasswordResetDaysRemaining(): number {
    if (!this.currentUser?.lastProfilePasswordChangeAt) {
      return 0;
    }
    
    const lastResetDate = new Date(this.currentUser.lastProfilePasswordChangeAt);
    const currentDate = new Date();
    const daysSinceLastReset = this.getDaysDifference(lastResetDate, currentDate);
    
    return Math.max(0, 30 - daysSinceLastReset);
  }
}