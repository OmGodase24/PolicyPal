import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { NotificationService } from '@core/services/notification.service';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  template: `
    <div class="cp-container">
      <div class="cp-card">
        <div class="cp-header">
          <h2 class="cp-title">{{ 'profile.changePassword' | translate }}</h2>
          <p class="cp-subtitle">{{ 'profile.passwordChangeDescription' | translate }}</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="cp-form">
          <div class="form-group">
            <label for="currentPassword" class="form-label">{{ 'profile.currentPassword' | translate }}</label>
            <input
              [type]="showCurrent ? 'text' : 'password'"
              id="currentPassword"
              formControlName="currentPassword"
              class="form-input"
              placeholder="{{ 'profile.currentPasswordPlaceholder' | translate }}">
            <div class="form-error" *ngIf="form.get('currentPassword')?.invalid && form.get('currentPassword')?.touched">
              {{ 'profile.currentPasswordRequired' | translate }}
            </div>
          </div>

          <div class="form-group">
            <label for="newPassword" class="form-label">{{ 'profile.newPassword' | translate }}</label>
            <input
              [type]="showNew ? 'text' : 'password'"
              id="newPassword"
              formControlName="newPassword"
              class="form-input"
              placeholder="{{ 'profile.newPasswordPlaceholder' | translate }}">
            <div class="form-error" *ngIf="form.get('newPassword')?.invalid && form.get('newPassword')?.touched">
              {{ 'profile.newPasswordRequired' | translate }}
            </div>
            <div class="form-help">{{ 'profile.passwordRequirements' | translate }}</div>
          </div>

          <div class="form-group">
            <label for="confirmPassword" class="form-label">{{ 'profile.confirmPassword' | translate }}</label>
            <input
              type="password"
              id="confirmPassword"
              formControlName="confirmPassword"
              class="form-input"
              placeholder="{{ 'profile.confirmPasswordPlaceholder' | translate }}">
            <div class="form-error" *ngIf="form.get('confirmPassword')?.invalid && form.get('confirmPassword')?.touched">
              {{ 'profile.confirmPasswordRequired' | translate }}
            </div>
            <div class="form-error" *ngIf="passwordsDoNotMatch()">
              {{ 'profile.passwordsDoNotMatch' | translate }}
            </div>
          </div>

          <div class="cp-actions">
            <button type="button" class="btn-secondary" (click)="onReset()">{{ 'profile.reset' | translate }}</button>
            <button type="submit" class="btn-primary" [disabled]="form.invalid || isSaving || passwordsDoNotMatch()">
              <span *ngIf="!isSaving">{{ 'profile.updatePassword' | translate }}</span>
              <span *ngIf="isSaving">{{ 'profile.updatingPassword' | translate }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .cp-container { min-height: 100vh; background: var(--color-bg-primary); padding: 24px; display: flex; align-items: flex-start; justify-content: center; }
    .cp-card { background: var(--color-bg-secondary); border: 1px solid var(--color-border-primary); border-radius: 12px; width: 100%; max-width: 720px; box-shadow: 0 2px 8px var(--color-shadow); }
    .cp-header { padding: 24px; border-bottom: 1px solid var(--color-border-primary); }
    .cp-title { margin: 0 0 8px 0; color: var(--color-text-primary); font-size: 22px; font-weight: 700; }
    .cp-subtitle { margin: 0; color: var(--color-text-secondary); }
    .cp-form { padding: 24px; }
    .form-group { margin-bottom: 16px; }
    .form-label { display: block; margin-bottom: 6px; color: var(--color-text-primary); font-weight: 600; font-size: 14px; }
    .form-input { width: 100%; padding: 10px 14px; border: 1px solid var(--color-border-primary); border-radius: 8px; background: var(--color-bg-primary); color: var(--color-text-primary); }
    .form-error { margin-top: 6px; color: var(--color-danger); font-size: 12px; }
    .form-help { margin-top: 6px; color: var(--color-text-secondary); font-size: 12px; }
    .cp-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; }
    .btn-primary, .btn-secondary { padding: 10px 16px; border-radius: 8px; font-weight: 600; font-size: 14px; border: none; cursor: pointer; }
    .btn-primary { background: #2563eb; color: white; }
    .btn-secondary { background: var(--color-bg-tertiary); color: var(--color-text-primary); border: 1px solid var(--color-border-primary); }
    @media (max-width: 640px) { .cp-container { padding: 16px; } .cp-form, .cp-header { padding: 16px; } }
  `]
})
export class ChangePasswordComponent {
  form: FormGroup;
  isSaving = false;
  showCurrent = false;
  showNew = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private notificationService: NotificationService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    });
  }

  passwordsDoNotMatch(): boolean {
    const np = this.form.get('newPassword')?.value;
    const cp = this.form.get('confirmPassword')?.value;
    return !!np && !!cp && np !== cp;
  }

  onReset(): void {
    this.form.reset();
    this.showCurrent = false;
    this.showNew = false;
  }

  onSubmit(): void {
    if (this.form.invalid || this.passwordsDoNotMatch() || this.isSaving) return;
    this.isSaving = true;
    const { currentPassword, newPassword } = this.form.value;

    this.http.post(`${environment.apiUrl}/auth/change-password`, { currentPassword, newPassword }).subscribe({
      next: () => {
        this.isSaving = false;
        this.notificationService.showSuccess('Password changed successfully!');
        this.router.navigate(['/profile']);
      },
      error: (err) => {
        this.isSaving = false;
        this.notificationService.showError(err?.error?.message || 'Failed to change password');
      }
    });
  }
}


