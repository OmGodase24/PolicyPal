import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { AuthService } from '@core/services/auth.service';
import { PolicyService } from '@core/services/policy.service';
import { Policy } from '@core/models/policy.model';
import { User } from '@core/models/user.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <div class="dashboard-content">
        <!-- Welcome Section -->
        <div class="welcome-section">
          <div class="welcome-content">
            <h1 class="welcome-title">Welcome back, {{ user?.firstName || 'User' }}! 👋</h1>
            <p class="welcome-subtitle">Here's what's happening with your PolicyPal policies today</p>
          </div>
          <div class="welcome-actions">
            <button (click)="createPolicy()" class="btn-primary btn-sm">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Create Policy
            </button>
            <button (click)="viewAllPolicies()" class="btn-secondary btn-sm">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              View All
            </button>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon published">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ publishedCount }}</div>
              <div class="stat-label">Published Policies</div>
              <div class="stat-percentage">{{ publishedPercentage }}% of total</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon draft">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ draftCount }}</div>
              <div class="stat-label">Draft Policies</div>
              <div class="stat-percentage">{{ draftPercentage }}% of total</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon total">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ totalCount }}</div>
              <div class="stat-label">Total Policies</div>
              <div class="stat-message">Excellent progress!</div>
            </div>
          </div>
        </div>

        <!-- Main Content Grid -->
        <div class="main-grid">
          <!-- Quick Actions -->
          <div class="quick-actions">
            <h2 class="section-title">Quick Actions</h2>
            <div class="actions-grid">
              <button (click)="createPolicy()" class="action-card">
                <div class="action-icon">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                </div>
                <div class="action-content">
                  <h3>Create New Policy</h3>
                  <p>Start drafting a new policy document with our guided wizard</p>
                </div>
              </button>

              <button (click)="viewAllPolicies()" class="action-card">
                <div class="action-icon">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                  </svg>
                </div>
                <div class="action-content">
                  <h3>View All Policies</h3>
                  <p>Browse, search, and manage your existing policy documents</p>
                </div>
              </button>

              <button (click)="openProfile()" class="action-card">
                <div class="action-icon">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                </div>
                <div class="action-content">
                  <h3>Account Settings</h3>
                  <p>Update your profile, preferences, and security settings</p>
                </div>
              </button>

              <button (click)="openAIAssistant()" class="action-card">
                <div class="action-icon">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                  </svg>
                </div>
                <div class="action-content">
                  <h3>AI Assistant</h3>
                  <p>Upload policies and ask AI-powered questions about coverage</p>
                </div>
              </button>
            </div>
          </div>

          <!-- Recent Policies -->
          <div class="recent-policies">
            <div class="section-header">
              <h2 class="section-title">Recent Policies</h2>
              <button (click)="viewAllPolicies()" class="view-all-btn">View all →</button>
            </div>
            
            @if (isLoading) {
              <div class="loading-state">
                <div class="spinner"></div>
                <span>Loading policies...</span>
              </div>
            } @else if (recentPolicies.length === 0) {
              <div class="empty-state">
                <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <h3>No policies yet</h3>
                <p>Create your first policy to get started</p>
                <button (click)="createPolicy()" class="btn-primary btn-sm">Create Policy</button>
              </div>
            } @else {
              <div class="policies-list">
                @for (policy of recentPolicies; track policy._id) {
                  <div class="policy-item" (click)="viewPolicy(policy._id)">
                    <div class="policy-info">
                      <h4 class="policy-title">{{ policy.title }}</h4>
                      <p class="policy-description">{{ policy.description }}</p>
                      <div class="policy-meta">
                        <span class="policy-status" [class]="'status-' + policy.status">{{ policy.status | titlecase }}</span>
                        <span class="policy-date">Updated {{ policy.updatedAt | date:'MMM d, yyyy' }}</span>
                      </div>
                    </div>
                    <div class="policy-actions">
                      @if (policy.status === 'draft') {
                        <button (click)="editPolicy(policy._id); $event.stopPropagation()" class="action-btn">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                          </svg>
                          Edit
                        </button>
                      } @else {
                        <button (click)="viewPolicy(policy._id); $event.stopPropagation()" class="action-btn">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                          </svg>
                          View
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
    </div>
  `,
  styles: [`
    .dashboard-container {
      min-height: 100vh;
      background: var(--color-bg-primary);
      padding: 1.5rem;
    }

    .dashboard-content {
      max-width: 1200px;
      margin: 0 auto;
    }

    /* Welcome Section */
    .welcome-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border-primary);
      border-radius: 12px;
      box-shadow: 0 2px 8px var(--color-shadow);
    }

    .welcome-content {
      flex: 1;
    }

    .welcome-title {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 0 0.5rem 0;
      color: var(--color-text-primary);
    }

    .welcome-subtitle {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      margin: 0;
    }

    .welcome-actions {
      display: flex;
      gap: 0.75rem;
      margin-left: 1rem;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      display: flex;
      align-items: center;
      padding: 1rem;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border-primary);
      border-radius: 8px;
      box-shadow: 0 1px 3px var(--color-shadow);
    }

    .stat-icon {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 0.75rem;
    }

    .stat-icon.published {
      background: #dcfce7;
      color: #16a34a;
    }

    .stat-icon.draft {
      background: #fef3c7;
      color: #d97706;
    }

    .stat-icon.total {
      background: #dbeafe;
      color: #2563eb;
    }

    .stat-content {
      flex: 1;
    }

    .stat-number {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text-primary);
      line-height: 1;
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--color-text-secondary);
      margin: 0.25rem 0;
    }

    .stat-percentage,
    .stat-message {
      font-size: 0.75rem;
      color: var(--color-text-tertiary);
    }

    /* Main Grid */
    .main-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
    }

    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 1rem 0;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .view-all-btn {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      background: none;
      border: none;
      cursor: pointer;
      text-decoration: none;
    }

    .view-all-btn:hover {
      color: var(--color-text-primary);
    }

    /* Quick Actions */
    .quick-actions {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border-primary);
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px var(--color-shadow);
    }

    .actions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .action-card {
      display: flex;
      align-items: flex-start;
      padding: 1rem;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border-primary);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: left;
    }

    .action-card:hover {
      border-color: var(--color-text-secondary);
      box-shadow: 0 2px 8px var(--color-shadow);
    }

    .action-icon {
      width: 2rem;
      height: 2rem;
      background: var(--color-bg-tertiary);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 0.75rem;
      color: var(--color-text-primary);
    }

    .action-content h3 {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 0.25rem 0;
    }

    .action-content p {
      font-size: 0.75rem;
      color: var(--color-text-secondary);
      margin: 0;
      line-height: 1.4;
    }

    /* Recent Policies */
    .recent-policies {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border-primary);
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px var(--color-shadow);
    }

    .policies-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .policy-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border-primary);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .policy-item:hover {
      border-color: var(--color-text-secondary);
      box-shadow: 0 2px 8px var(--color-shadow);
    }

    .policy-info {
      flex: 1;
    }

    .policy-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 0.25rem 0;
    }

    .policy-description {
      font-size: 0.75rem;
      color: var(--color-text-secondary);
      margin: 0 0 0.5rem 0;
      line-height: 1.4;
    }

    .policy-meta {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .policy-status {
      font-size: 0.625rem;
      font-weight: 600;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      text-transform: uppercase;
    }

    .status-publish {
      background: #dcfce7;
      color: #16a34a;
    }

    .status-draft {
      background: #fef3c7;
      color: #d97706;
    }

    .policy-date {
      font-size: 0.625rem;
      color: var(--color-text-tertiary);
    }

    .policy-actions {
      margin-left: 1rem;
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.375rem 0.75rem;
      background: var(--color-bg-tertiary);
      border: 1px solid var(--color-border-primary);
      border-radius: 6px;
      font-size: 0.75rem;
      color: var(--color-text-primary);
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: var(--color-text-secondary);
      color: var(--color-bg-primary);
    }

    /* Loading and Empty States */
    .loading-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      text-align: center;
    }

    .spinner {
      width: 1.5rem;
      height: 1.5rem;
      border: 2px solid var(--color-border-primary);
      border-top: 2px solid var(--color-text-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 0.5rem;
    }

    .empty-state svg {
      color: var(--color-text-tertiary);
      margin-bottom: 0.75rem;
    }

    .empty-state h3 {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 0.25rem 0;
    }

    .empty-state p {
      font-size: 0.75rem;
      color: var(--color-text-secondary);
      margin: 0 0 1rem 0;
    }

    /* Buttons */
    .btn-primary,
    .btn-secondary {
      display: inline-flex;
      align-items: center;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .btn-primary {
      background: #2563eb;
      color: white;
    }

    .btn-primary:hover {
      background: #1d4ed8;
    }

    .btn-secondary {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
      border: 1px solid var(--color-border-primary);
    }

    .btn-secondary:hover {
      background: var(--color-text-secondary);
      color: var(--color-bg-primary);
    }

    .btn-sm {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .dashboard-container {
        padding: 1rem;
      }

      .welcome-section {
        flex-direction: column;
        gap: 1rem;
      }

      .welcome-actions {
        margin-left: 0;
        width: 100%;
        justify-content: stretch;
      }

      .welcome-actions button {
        flex: 1;
      }

      .main-grid {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }

      .actions-grid {
        grid-template-columns: 1fr;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class DashboardComponent implements OnInit {
  user: User | null = null;
  policies: Policy[] = [];
  recentPolicies: Policy[] = [];
  isLoading = false;

  // Stats
  get totalCount(): number {
    return this.policies.length;
  }

  get publishedCount(): number {
    return this.policies.filter(p => p.status === 'publish').length;
  }

  get draftCount(): number {
    return this.policies.filter(p => p.status === 'draft').length;
  }

  get publishedPercentage(): number {
    return this.totalCount > 0 ? Math.round((this.publishedCount / this.totalCount) * 100) : 0;
  }

  get draftPercentage(): number {
    return this.totalCount > 0 ? Math.round((this.draftCount / this.totalCount) * 100) : 0;
  }

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
    this.user = this.authService.getCurrentUser();
  }

  private loadPolicies(): void {
    this.isLoading = true;
    this.policyService.getPolicies().subscribe({
      next: (policies: Policy[]) => {
        this.policies = policies;
        this.recentPolicies = policies.slice(0, 5); // Show only 5 most recent
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading policies:', error);
        this.isLoading = false;
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

  openProfile(): void {
    this.router.navigate(['/profile']);
  }

  openAIAssistant(): void {
    this.router.navigate(['/ai-assistant']);
  }
}
