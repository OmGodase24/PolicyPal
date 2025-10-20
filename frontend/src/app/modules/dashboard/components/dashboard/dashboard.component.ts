import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';

import { AuthService } from '@core/services/auth.service';
import { PolicyService } from '@core/services/policy.service';
import { User } from '@core/models/user.model';
import { Policy, PolicyLifecycleInfo } from '@core/models/policy.model';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { InviteManagementComponent } from '../../../users/components/invite-management/invite-management.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe, InviteManagementComponent],
  template: `
    <div class="dashboard-container">
      <div class="dashboard-content">
        <!-- Welcome Section -->
        <div class="dashboard-welcome">
          <div class="dashboard-welcome-header">
            <h1 class="dashboard-welcome-title">
              {{ 'dashboard.welcome' | translate }}, {{ user?.firstName || 'User' }}! 👋
            </h1>
            <p class="dashboard-welcome-subtitle">
              {{ 'dashboard.overview' | translate }}
            </p>
          </div>
          <div class="dashboard-actions">
            <button (click)="createPolicy()" class="action-button primary">
              <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              {{ 'policies.createPolicy' | translate }}
            </button>
            <button (click)="viewAllPolicies()" class="action-button secondary">
              <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012 2h2a2 2 0 012 2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              {{ 'policies.viewAllPolicies' | translate }}
            </button>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="dashboard-stats">
          <div class="stat-card">
            <div class="stat-header">
              <h3 class="stat-title">{{ 'dashboard.totalPolicies' | translate }}</h3>
              <div class="stat-icon primary">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
            </div>
            <div class="stat-value">{{ totalPolicies }}</div>
            <div class="stat-change positive">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
              </svg>
              +12% from last month
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-header">
              <h3 class="stat-title">{{ 'dashboard.activePolicies' | translate }}</h3>
              <div class="stat-icon success">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
            <div class="stat-value">{{ activePolicies }}</div>
            <div class="stat-change positive">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
              </svg>
              Current active policies
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-header">
              <h3 class="stat-title">{{ 'dashboard.expiringSoon' | translate }}</h3>
              <div class="stat-icon warning">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
              </div>
            </div>
            <div class="stat-value">{{ expiringSoonPolicies }}</div>
            <div class="stat-change warning">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Need attention
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-header">
              <h3 class="stat-title">{{ 'dashboard.expiredPolicies' | translate }}</h3>
              <div class="stat-icon danger">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
            </div>
            <div class="stat-value">{{ expiredPolicies }}</div>
            <div class="stat-change danger">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Require renewal
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-header">
              <h3 class="stat-title">{{ 'dashboard.draftPolicies' | translate }}</h3>
              <div class="stat-icon info">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </div>
            </div>
            <div class="stat-value">{{ draftPolicies }}</div>
            <div class="stat-change neutral">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
              </svg>
              In progress
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-header">
              <h3 class="stat-title">{{ 'dashboard.aiChats' | translate }}</h3>
              <div class="stat-icon info">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
              </div>
            </div>
            <div class="stat-value">{{ aiChats }}</div>
            <div class="stat-change positive">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
              </svg>
              +25% from last month
            </div>
          </div>
        </div>

        
        <!-- User Management Section -->
        <div class="dashboard-section">
          <div class="section-header">
            <h2 class="section-title">{{ 'rewards.userManagement.title' | translate }}</h2>
          </div>
          <app-invite-management></app-invite-management>
        </div>

        <!-- Recent Policies Section -->
        <div class="dashboard-section">
          <div class="section-header">
            <h2 class="section-title">{{ 'dashboard.recentPolicies' | translate }}</h2>
            <a routerLink="/policies" class="section-action">
              {{ 'dashboard.viewAll' | translate }}
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </a>
          </div>

          @if (recentPolicies.length === 0) {
            <div class="text-center py-12">
              <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <h3 class="text-lg font-medium text-gray-900 mb-2">{{ 'dashboard.noPoliciesYet' | translate }}</h3>
              <p class="text-gray-500 mb-4">{{ 'dashboard.getStarted' | translate }}</p>
              <button (click)="createPolicy()" class="action-button primary">
                <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                {{ 'dashboard.createFirstPolicy' | translate }}
              </button>
            </div>
          } @else {
            <div class="policies-grid">
              @for (policy of recentPolicies; track policy._id) {
                <div class="policy-card" (click)="viewPolicy(policy._id)">
                  <div class="policy-card-header">
                    <h3 class="policy-title">{{ policy.title }}</h3>
                    <div class="policy-status">
                      <span [class]="getStatusBadgeClasses(policy.status)" class="status-badge">
                        {{ policy.status | titlecase }}
                      </span>
                      @if (policy.status === 'publish') {
                        <span [class]="getLifecycleBadgeClasses(getLifecycleInfo(policy))" class="lifecycle-badge">
                          {{ getLifecycleInfo(policy).lifecycle | titlecase }}
                        </span>
                      }
                    </div>
                  </div>
                  <p class="policy-description">{{ policy.description }}</p>
                  <div class="policy-meta">
                    <span>{{ 'policies.updated' | translate }} {{ policy.updatedAt | date:'MMM d, y' }}</span>
                    <span>v1.0</span>
                  </div>
                  <div class="policy-actions">
                    @if (policy.status === 'draft') {
                      <button (click)="editPolicy(policy._id); $event.stopPropagation()" 
                              class="action-button secondary">
                        <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                        {{ 'policies.edit' | translate }}
                      </button>
                    } @else {
                      <button (click)="viewPolicy(policy._id); $event.stopPropagation()" 
                              class="action-button secondary">
                        <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                        {{ 'policies.view' | translate }}
                      </button>
                    }
                    
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Dashboard Section Styles */
    .dashboard-section {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border-primary);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--color-border-primary);
    }

    .section-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0;
    }

    .section-action {
      color: var(--color-primary);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s ease;
    }

    .section-action:hover {
      color: var(--color-primary-hover);
      transform: translateX(2px);
    }

    /* Lifecycle Badge Styles */
    .lifecycle-badge {
      font-size: 0.75rem;
      font-weight: 500;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-left: 0.5rem;
    }

    .lifecycle-active {
      background-color: var(--color-success-light);
      color: var(--color-success);
    }

    .lifecycle-expiring-soon {
      background-color: var(--color-warning-light);
      color: var(--color-warning);
    }

    .lifecycle-expired {
      background-color: var(--color-danger-light);
      color: var(--color-danger);
    }

    /* Stat Card Icon Colors */
    .stat-icon.danger {
      color: var(--color-danger);
    }

    .stat-change.danger {
      color: var(--color-danger);
    }

    .stat-change.warning {
      color: var(--color-warning);
    }

    /* Policy Status Container */
    .policy-status {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }

    /* Dark mode support - using CSS variables automatically handles dark mode */
    .dark .lifecycle-active {
      background-color: var(--color-success-light);
      color: var(--color-success);
    }

    .dark .lifecycle-expiring-soon {
      background-color: var(--color-warning-light);
      color: var(--color-warning);
    }

    .dark .lifecycle-expired {
      background-color: var(--color-danger-light);
      color: var(--color-danger);
    }
  `]
})
export class DashboardComponent implements OnInit {
  user: User | null = null;
  recentPolicies: Policy[] = [];
  totalPolicies = 0;
  publishedPolicies = 0;
  draftPolicies = 0;
  activePolicies = 0;
  expiringSoonPolicies = 0;
  expiredPolicies = 0;
  aiChats = 0;

  constructor(
    private authService: AuthService,
    private policyService: PolicyService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUser();
    this.loadPolicies();
  }

  private loadUser(): void {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });
  }

  private loadPolicies(): void {
    // Load basic policy data
    this.policyService.getMyPolicies().subscribe({
      next: (policies: Policy[]) => {
        this.recentPolicies = policies.slice(0, 6);
        this.totalPolicies = policies.length;
        this.publishedPolicies = policies.filter((p: Policy) => p.status === 'publish').length;
        this.draftPolicies = policies.filter((p: Policy) => p.status === 'draft').length;
        this.aiChats = Math.floor(Math.random() * 50) + 10; // Mock data
      },
      error: (error: any) => {
        console.error('Error loading policies:', error);
      }
    });

    // Load lifecycle statistics
    this.policyService.getLifecycleStats().subscribe({
      next: (stats) => {
        this.activePolicies = stats.active;
        this.expiringSoonPolicies = stats.expiringSoon;
        this.expiredPolicies = stats.expired;
      },
      error: (error: any) => {
        console.error('Error loading lifecycle stats:', error);
      }
    });
  }

  createPolicy(): void {
    this.router.navigate(['/policies/create']);
  }

  viewAllPolicies(): void {
    this.router.navigate(['/policies']);
  }

  viewPolicy(id: string): void {
    this.router.navigate(['/policies', id]);
  }

  editPolicy(id: string): void {
    this.router.navigate(['/policies', id, 'edit']);
  }


  getStatusBadgeClasses(status: string): string {
    switch (status) {
      case 'publish':
        return 'status-publish';
      case 'draft':
        return 'status-draft';
      default:
        return 'status-draft';
    }
  }

  getLifecycleInfo(policy: Policy): PolicyLifecycleInfo {
    return this.policyService.calculatePolicyLifecycle(policy);
  }

  getLifecycleBadgeClasses(lifecycleInfo: PolicyLifecycleInfo): string {
    switch (lifecycleInfo.lifecycle) {
      case 'active':
        return 'lifecycle-active';
      case 'expiring-soon':
        return 'lifecycle-expiring-soon';
      case 'expired':
        return 'lifecycle-expired';
      default:
        return 'lifecycle-active';
    }
  }

}