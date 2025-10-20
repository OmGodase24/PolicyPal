import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

import { PolicyService } from '@core/services/policy.service';
import { RewardService } from '@core/services/reward.service';
import { NotificationService } from '@core/services/notification.service';
import { LanguageService } from '@core/services/language.service';
import { Policy, PolicyStatus, CreatePolicyRequest, UpdatePolicyRequest } from '@core/models/policy.model';
import { TranslatePipe } from '@core/pipes/translate.pipe';

@Component({
  selector: 'app-policy-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './policy-form.component.html',
  styleUrls: ['./policy-form.component.scss']
})
export class PolicyFormComponent implements OnInit {
  policyForm: FormGroup;
  isEditMode = false;
  policyId: string | null = null;
  isSubmitting = false;
  selectedFile: File | null = null;
  fileName = '';
  currentPolicy: Policy | null = null;
  showPublishWarning = false;
  canEditExpiryDate = true;
  isExpired = false;

  // Removed policy types as they're not in the backend model

  policyStatuses: { value: PolicyStatus; label: string }[] = [
    { value: 'draft', label: 'policies.draft' },
    { value: 'publish', label: 'policies.publish' }
  ];

  constructor(
    private fb: FormBuilder,
    private policyService: PolicyService,
    private router: Router,
    private route: ActivatedRoute,
    private notificationService: NotificationService,
    private rewardService: RewardService,
    private languageService: LanguageService
  ) {
    this.policyForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''], // Truly optional - no character limits
      content: [''], // Truly optional - no character limits
      status: ['draft', Validators.required],
      expiryDate: [''] // Optional expiry date
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.policyId = params['id'];
      this.isEditMode = !!this.policyId;
      
      if (this.isEditMode) {
        this.loadPolicy();
      }
    });
  }

  loadPolicy(): void {
    if (!this.policyId) return;

    this.policyService.getPolicy(this.policyId).subscribe({
      next: (policy: Policy) => {
        this.currentPolicy = policy;
        
        // Check if policy is expired
        const lifecycleInfo = this.policyService.calculatePolicyLifecycle(policy);
        this.isExpired = lifecycleInfo.isExpired;
        
        // Check if expiry date can be edited
        this.canEditExpiryDate = !policy.expiryDateEdited && policy.status === 'draft' && !this.isExpired;
        
        this.policyForm.patchValue({
          title: policy.title,
          description: policy.description,
          content: policy.content,
          status: policy.status,
          expiryDate: policy.expiryDate ? new Date(policy.expiryDate).toISOString().split('T')[0] : ''
        });

        // Enable/disable expiry date control based on edit permissions
        if (this.isEditMode && !this.canEditExpiryDate) {
          this.policyForm.get('expiryDate')?.disable();
        } else {
          this.policyForm.get('expiryDate')?.enable();
        }
      },
      error: (error: any) => {
        console.error('Error loading policy:', error);
        this.notificationService.showError('Failed to load policy');
        this.router.navigate(['/policies']);
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        this.notificationService.showError('Please select a PDF file');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        this.notificationService.showError('File size must be less than 10MB');
        return;
      }
      
      this.selectedFile = file;
      this.fileName = file.name;
    }
  }

  removeFile(): void {
    this.selectedFile = null;
    this.fileName = '';
    // Reset file input
    const fileInput = document.getElementById('pdfFile') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  onSubmit(): void {
    if (this.policyForm.invalid || this.isSubmitting) {
      return;
    }

    // Check if trying to edit an expired policy
    if (this.isEditMode && this.isExpired) {
      this.notificationService.showError('Cannot edit expired policies. Only viewing and deletion are allowed.');
      return;
    }

    this.isSubmitting = true;
    const formData = this.policyForm.value;

    if (this.isEditMode) {
      this.updatePolicy(formData);
    } else {
      this.createPolicy(formData);
    }
  }

  createPolicy(formData: any): void {
    if (this.selectedFile) {
      // Create with PDF
      const formDataWithFile = new FormData();
      formDataWithFile.append('title', formData.title);
      formDataWithFile.append('description', formData.description || '');
      formDataWithFile.append('content', formData.content || '');
      formDataWithFile.append('status', formData.status);
      // Always send expiry date, even if empty, so backend knows if user provided it
      formDataWithFile.append('expiryDate', formData.expiryDate || '');
      if (formData.tags) {
        const tagsArray = formData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag);
        if (tagsArray.length > 0) {
          formDataWithFile.append('tags', JSON.stringify(tagsArray));
        }
      }
      formDataWithFile.append('pdf', this.selectedFile);

      this.policyService.createPolicyWithPDF(formDataWithFile).subscribe({
      next: (response: any) => {
          this.notificationService.showPolicyCreated(formData.title);
    if (this.selectedFile) {
            this.notificationService.showPolicyPDFUploaded(formData.title);
            this.notificationService.showPolicyAIProcessing(formData.title);
          }

          // Record reward: policy created
          this.rewardService.recordActivity({
            type: 'policy_created',
            name: 'create_policy',
            points: 20,
            metadata: { policyId: response?._id || response?.id, title: formData.title }
          }).subscribe({ next: () => {}, error: () => {} });

          // Record reward: policy published (if published on create)
          if (formData.status === 'publish') {
            this.rewardService.recordActivity({
              type: 'policy_published',
              name: 'publish_policy',
              points: 50,
              metadata: { policyId: response?._id || response?.id, title: formData.title }
            }).subscribe({ next: () => {}, error: () => {} });
          }
          this.router.navigate(['/policies']);
        },
        error: (error: any) => {
          console.error('Error creating policy:', error);
          this.notificationService.showError('Failed to create policy');
        this.isSubmitting = false;
        }
      });
    } else {
      // Create without PDF
      const createRequest: CreatePolicyRequest = {
        title: formData.title,
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : undefined,
        description: formData.description || '',
        content: formData.content || '',
        status: formData.status
      };

      this.policyService.createPolicy(createRequest).subscribe({
      next: (response: any) => {
        this.notificationService.showPolicyCreated(formData.title);

        // Record reward: policy created
        this.rewardService.recordActivity({
          type: 'policy_created',
          name: 'create_policy',
          points: 20,
          metadata: { policyId: response?._id || response?.id, title: formData.title }
        }).subscribe({ next: () => {}, error: () => {} });

        // Record reward: policy published (if published on create)
        if (formData.status === 'publish') {
          this.rewardService.recordActivity({
            type: 'policy_published',
            name: 'publish_policy',
            points: 50,
            metadata: { policyId: response?._id || response?.id, title: formData.title }
          }).subscribe({ next: () => {}, error: () => {} });
        }
        this.router.navigate(['/policies']);
      },
      error: (error: any) => {
        console.error('Error creating policy:', error);
        this.notificationService.showError('Failed to create policy');
          this.isSubmitting = false;
      }
    });
    }
  }

  updatePolicy(formData: any): void {
    if (!this.policyId) return;

    // If there's a new PDF file, update it first
    if (this.selectedFile) {
      this.policyService.updatePolicyPDF(this.policyId, this.selectedFile).subscribe({
        next: (policy: Policy) => {
          this.currentPolicy = policy;
          this.notificationService.showPolicyPDFReplaced(formData.title);
          this.notificationService.showPolicyAIProcessing(formData.title);
          // Then update the policy data
          this.updatePolicyData(formData);
        },
        error: (error: any) => {
          console.error('Error updating PDF:', error);
          this.notificationService.showError('Failed to update PDF');
          this.isSubmitting = false;
        }
      });
    } else {
      // Just update the policy data
      this.updatePolicyData(formData);
    }
  }

  private updatePolicyData(formData: any): void {
    if (!this.policyId) return;

    const updateData: UpdatePolicyRequest = {
      title: formData.title,
      description: formData.description || '',
      content: formData.content || '',
      status: formData.status,
      expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : undefined
    };

    this.policyService.updatePolicy(this.policyId, updateData).subscribe({
      next: (response: any) => {
        this.notificationService.showPolicyUpdated(formData.title);

        // If status is publish, record reward
        if (formData.status === 'publish') {
          this.rewardService.recordActivity({
            type: 'policy_published',
            name: 'publish_policy',
            points: 50,
            metadata: { policyId: this.policyId, title: formData.title }
          }).subscribe({ next: () => {}, error: () => {} });
        }
        this.router.navigate(['/policies']);
      },
      error: (error: any) => {
        console.error('Error updating policy:', error);
        this.notificationService.showError('Failed to update policy');
        this.isSubmitting = false;
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/policies']);
  }

  getFieldError(fieldName: string): string {
    const field = this.policyForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors['minlength']) {
        const requiredLength = field.errors['minlength'].requiredLength;
        return `${this.getFieldLabel(fieldName)} must be at least ${requiredLength} characters`;
      }
    }
    return '';
  }

  getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      title: 'Title',
      description: 'Description (Optional)',
      content: 'Content (Optional)',
      status: 'Status'
    };
    return labels[fieldName] || fieldName;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.policyForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  onStatusChange(event: any): void {
    const status = event.target.value;
    this.showPublishWarning = status === 'publish';
  }

  getSubmitButtonText(): string {
    if (this.isEditMode) {
      return this.languageService.translate('policies.policyForm.updatePolicy');
    } else {
      const status = this.policyForm.get('status')?.value;
      if (status === 'publish') {
        return this.languageService.translate('policies.policyForm.publishPolicy');
      } else {
        return this.languageService.translate('policies.policyForm.saveDraft');
      }
    }
  }

  getSubmittingText(): string {
    if (this.isEditMode) {
      return this.languageService.translate('policies.policyForm.updating');
    } else {
      const status = this.policyForm.get('status')?.value;
      if (status === 'publish') {
        return this.languageService.translate('policies.policyForm.publishing');
      } else {
        return this.languageService.translate('policies.policyForm.creating');
      }
    }
  }

  formatFileSize(bytes: number | undefined): string {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  removeCurrentPDF(): void {
    if (!this.policyId) return;
    
    if (confirm('Are you sure you want to remove the current PDF?')) {
      this.policyService.removePolicyPDF(this.policyId).subscribe({
        next: (policy: Policy) => {
          this.currentPolicy = policy;
          this.notificationService.showSuccess('PDF removed successfully');
        },
        error: (error: any) => {
          console.error('Error removing PDF:', error);
          this.notificationService.showError('Failed to remove PDF');
        }
      });
    }
  }
}
