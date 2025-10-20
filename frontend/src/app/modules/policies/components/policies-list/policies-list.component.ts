import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { PolicyService } from '@core/services/policy.service';
import { NotificationService } from '@core/services/notification.service';
import { Policy, PolicyLifecycleInfo } from '@core/models/policy.model';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { LanguageService } from '@core/services/language.service';

@Component({
  selector: 'app-policies-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="policies-container">
      <div class="policies-content">
        <div class="policies-header">
          <div class="header-main">
            <div class="header-info">
              <h1 class="header-title">{{ 'policies.title' | translate }}</h1>
              <p class="header-subtitle">{{ 'policies.management' | translate }}</p>
            </div>
            <div class="header-actions">
              <button (click)="comparePolicies()" class="compare-policies-btn">
                <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
                {{ 'policies.comparePolicies' | translate }}
              </button>
              <button (click)="createPolicy()" class="create-policy-btn">
                <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                {{ 'policies.createPolicy' | translate }}
              </button>
            </div>
          </div>
        </div>

        <!-- Enhanced Search and Filters -->
        <div class="policies-filters">
          <div class="filters-content">
            <!-- Search Bar -->
            <div class="search-container">
              <div class="search-input-wrapper">
                <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <input type="text" 
                       placeholder="{{ 'policies.search' | translate }}" 
                       class="search-input"
                       [(ngModel)]="searchTerm"
                       (input)="filterPolicies()">
                @if (searchTerm) {
                  <button (click)="clearSearch()" class="clear-search-btn">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                }
              </div>
            </div>

            <!-- Filter Toggle -->
            <div class="filter-toggle-container">
              <button (click)="toggleAdvancedFilters()" class="filter-toggle-btn">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z"></path>
                </svg>
                {{ 'policies.advancedFilters' | translate }}
                @if (hasActiveFilters()) {
                  <span class="filter-count">{{ getActiveFilterCount() }}</span>
                }
              </button>
              @if (hasActiveFilters()) {
                <button (click)="clearAllFilters()" class="clear-filters-btn">
                  {{ 'policies.clearAll' | translate }}
                </button>
              }
            </div>

            <!-- Status Filters -->
            <div class="filters-row">
              <button [class]="getFilterButtonClass('all')" 
                      (click)="setStatusFilter('all')"
                      class="filter-btn">
                {{ 'policies.all' | translate }} ({{ getTotalCount() }})
              </button>
              <button [class]="getFilterButtonClass('publish')" 
                      (click)="setStatusFilter('publish')"
                      class="filter-btn">
                {{ 'policies.publish' | translate }} ({{ getPublishedCount() }})
              </button>
              <button [class]="getFilterButtonClass('draft')" 
                      (click)="setStatusFilter('draft')"
                      class="filter-btn">
                {{ 'policies.draft' | translate }} ({{ getDraftCount() }})
              </button>
            </div>

            <!-- Advanced Filters Panel -->
            @if (showAdvancedFilters) {
              <div class="advanced-filters-panel">
                <div class="filters-grid">
                  <!-- Date Range Filters -->
                  <div class="filter-group">
                    <label class="filter-label">{{ 'policies.createdDate' | translate }}</label>
                    <div class="date-range-container">
                      <input type="date" 
                             [(ngModel)]="filters.createdDateFrom"
                             (change)="filterPolicies()"
                             class="date-input"
                             [placeholder]="'policies.from' | translate">
                      <span class="date-separator">{{ 'policies.to' | translate }}</span>
                      <input type="date" 
                             [(ngModel)]="filters.createdDateTo"
                             (change)="filterPolicies()"
                             class="date-input"
                             [placeholder]="'policies.to' | translate">
                    </div>
                  </div>

                  <div class="filter-group">
                    <label class="filter-label">{{ 'policies.updatedDate' | translate }}</label>
                    <div class="date-range-container">
                      <input type="date" 
                             [(ngModel)]="filters.updatedDateFrom"
                             (change)="filterPolicies()"
                             class="date-input"
                             [placeholder]="'policies.from' | translate">
                      <span class="date-separator">{{ 'policies.to' | translate }}</span>
                      <input type="date" 
                             [(ngModel)]="filters.updatedDateTo"
                             (change)="filterPolicies()"
                             class="date-input"
                             [placeholder]="'policies.to' | translate">
                    </div>
                  </div>

                  <!-- PDF Status Filters -->
                  <div class="filter-group">
                    <label class="filter-label">{{ 'policies.pdfStatus' | translate }}</label>
                    <div class="checkbox-group">
                      <label class="checkbox-label">
                        <input type="checkbox" 
                               [(ngModel)]="filters.hasPDF"
                               (change)="filterPolicies()"
                               class="checkbox-input">
                        <span class="checkbox-text">{{ 'policies.hasPDF' | translate }}</span>
                      </label>
                      <label class="checkbox-label">
                        <input type="checkbox" 
                               [(ngModel)]="filters.pdfProcessed"
                               (change)="filterPolicies()"
                               class="checkbox-input">
                        <span class="checkbox-text">{{ 'policies.pdfProcessed' | translate }}</span>
                      </label>
                      <label class="checkbox-label">
                        <input type="checkbox" 
                               [(ngModel)]="filters.aiReady"
                               (change)="filterPolicies()"
                               class="checkbox-input">
                        <span class="checkbox-text">{{ 'policies.aiReady' | translate }}</span>
                      </label>
                    </div>
                  </div>

                  <!-- Sort Options -->
                  <div class="filter-group">
                    <label class="filter-label">{{ 'policies.sortBy' | translate }}</label>
                    <select [(ngModel)]="sortBy" 
                            (change)="filterPolicies()"
                            class="sort-select">
                      <option value="updatedAt-desc">{{ 'policies.updatedNewest' | translate }}</option>
                      <option value="updatedAt-asc">{{ 'policies.updatedOldest' | translate }}</option>
                      <option value="createdAt-desc">{{ 'policies.createdNewest' | translate }}</option>
                      <option value="createdAt-asc">{{ 'policies.createdOldest' | translate }}</option>
                      <option value="title-asc">{{ 'policies.titleAZ' | translate }}</option>
                      <option value="title-desc">{{ 'policies.titleZA' | translate }}</option>
                      <option value="status-asc">{{ 'policies.status' | translate }}</option>
                    </select>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        @if (isLoading) {
          <div class="loading-state">
            <div class="loading-spinner">
              <div class="spinner"></div>
              <span>{{ 'policies.loading' | translate }}</span>
            </div>
          </div>
        } @else if (filteredPolicies.length === 0) {
          <div class="empty-state">
            <div class="empty-icon">
              📋
            </div>
            <h3 class="empty-title">
              @if (searchTerm || statusFilter !== 'all') {
                {{ 'policies.noPoliciesFound' | translate }}
              } @else {
                {{ 'policies.noPoliciesYet' | translate }}
              }
            </h3>
            <p class="empty-subtitle">
              @if (searchTerm || statusFilter !== 'all') {
                {{ 'policies.adjustSearchCriteria' | translate }}
              } @else {
                {{ 'policies.getStarted' | translate }}
              }
            </p>
            @if (!searchTerm && statusFilter === 'all') {
              <button (click)="createPolicy()" class="action-btn primary">
                <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                {{ 'policies.createFirstPolicy' | translate }}
              </button>
            }
          </div>
        } @else {
          <div class="policies-grid">
            @for (policy of filteredPolicies; track policy._id) {
              <div class="policy-card" (click)="viewPolicy(policy._id)">
                <div class="policy-card-header">
                  <h3 class="policy-title">{{ policy.title }}</h3>
                  <div class="policy-status">
                    <span [class]="getStatusBadgeClasses(policy.status)" class="status-badge">
                      {{ policy.status | titlecase }}
                    </span>
                    @if (policy.status === 'publish') {
                      <span [class]="getLifecycleBadgeClasses(policy)" class="lifecycle-badge">
                        {{ getLifecycleInfo(policy).lifecycle | titlecase }}
                      </span>
                    }
                    @if (policy.complianceScore !== undefined) {
                      <div class="compliance-badge" 
                           [class]="getComplianceBadgeClass(policy.complianceLevel)">
                        <div class="compliance-dot"></div>
                        <span class="compliance-score">{{ (policy.complianceScore * 100).toFixed(0) }}%</span>
                      </div>
                    }
                  </div>
                </div>
                <div class="policy-meta">
                  <span>{{ 'policies.updated' | translate }} {{ policy.updatedAt | date:'MMM d, y' }}</span>
                  <span *ngIf="policy.expiryDate" [class]="getExpiryDateClass(policy)">
                    {{ 'policies.expires' | translate }} {{ policy.expiryDate | date:'MMM d, y' }}
                  </span>
                  <span *ngIf="!policy.expiryDate">v1.0</span>
                </div>
                <div class="policy-actions">
                  @if (policy.status === 'draft') {
                    <button (click)="editPolicy(policy._id); $event.stopPropagation()" 
                            class="action-btn secondary">
                      <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                      </svg>
                      {{ 'policies.edit' | translate }}
                    </button>
                  } @else if (policy.status === 'publish') {
                    <button (click)="viewPolicy(policy._id); $event.stopPropagation()" 
                            class="action-btn secondary">
                      <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                      </svg>
                      {{ 'policies.view' | translate }}
                    </button>
                  }
                  
                  @if (policy.status === 'draft' && policy.hasPDF && policy.pdfProcessed) {
                    <button (click)="publishPolicy(policy._id); $event.stopPropagation()" 
                            class="action-btn primary">
                      <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      {{ 'policies.publish' | translate }}
                    </button>
                  }
                  
                  
                  <button (click)="deletePolicy(policy._id); $event.stopPropagation()" 
                          class="action-btn danger">
                    <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                    {{ 'policies.delete' | translate }}
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>

  `,
  styles: [`
    /* Layout spacing to clear fixed topbar */
    .policies-container {
      padding-top: 64px;
    }
    .policies-header { margin-bottom: 0.75rem; }

    @media (max-width: 768px) {
      .policies-header { margin-bottom: 1rem; }
    }


    @media (max-width: 768px) {
      .policies-container { padding-top: 56px; }
    }

    /* Compare Policies Button Styling */
    .compare-policies-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 0.5rem;
      padding: 0.75rem 1.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25);
      margin-right: 1rem;
    }

    .compare-policies-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 15px rgba(102, 126, 234, 0.4);
      background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
    }

    .compare-policies-btn:active {
      transform: translateY(0);
      box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25);
    }

    .compare-policies-btn .btn-icon {
      width: 1.125rem;
      height: 1.125rem;
    }

    /* Create Policy Button Styling */
    .create-policy-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      border: none;
      border-radius: 0.5rem;
      padding: 0.75rem 1.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 6px rgba(16, 185, 129, 0.25);
    }

    .create-policy-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 15px rgba(16, 185, 129, 0.4);
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
    }

    .create-policy-btn:active {
      transform: translateY(0);
      box-shadow: 0 4px 6px rgba(16, 185, 129, 0.25);
    }

    .create-policy-btn .btn-icon {
      width: 1.125rem;
      height: 1.125rem;
    }


    /* Header Actions Layout */
    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    .line-clamp-3 {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    .spinner {
      width: 1.5rem;
      height: 1.5rem;
      border: 2px solid var(--color-border-primary);
      border-top: 2px solid var(--color-text-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
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
      background-color: #d1fae5;
      color: #065f46;
    }

    .lifecycle-expiring-soon {
      background-color: #fef3c7;
      color: #92400e;
    }

    .lifecycle-expired {
      background-color: #fee2e2;
      color: #991b1b;
    }

    /* Policy Status Container */
    .policy-status {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }

    /* Compliance Badge Styles */
    .compliance-badge {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .compliance-badge.compliant {
      background-color: #d1fae5;
      color: #065f46;
    }

    .compliance-badge.partial {
      background-color: #fef3c7;
      color: #92400e;
    }

    .compliance-badge.non-compliant {
      background-color: #fee2e2;
      color: #991b1b;
    }

    .compliance-badge.unknown {
      background-color: #f3f4f6;
      color: #6b7280;
    }

    .compliance-dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      background-color: currentColor;
    }

    .compliance-score {
      font-size: 0.75rem;
      font-weight: 700;
    }

    /* Expiry Date Styles */
    .expiry-date {
      font-weight: 500;
    }

    .expiry-date.expired {
      color: #dc2626;
    }

    .expiry-date.expiring-soon {
      color: #d97706;
    }

    .expiry-date.active {
      color: #059669;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .policies-content {
        padding: 0;
      }

      .policies-header {
        order: 1;
      }

      .header-main { 
        flex-direction: column; 
        align-items: stretch; 
        gap: 1rem; 
      }

      .header-info {
        order: 1;
      }

      .header-actions {
        order: 2;
        flex-direction: column;
        gap: 0.75rem;
        width: 100%;
      }

      .policies-filters { 
        order: 3;
        margin-top: 0;
      }

      .filters-content { 
        gap: 0.75rem;
        padding: 1rem;
      }

      .search-container { 
        width: 100%;
      }

      .compare-policies-btn,
      .create-policy-btn {
        margin-right: 0;
        width: 100%;
        justify-content: center;
        padding: 1rem;
        font-size: 1rem;
      }
    }
  `]
})
export class PoliciesListComponent implements OnInit {
  policies: Policy[] = [];
  filteredPolicies: Policy[] = [];
  searchTerm = '';
  statusFilter = 'all';
  isLoading = false;
  showAdvancedFilters = false;
  sortBy = 'updatedAt-desc';
  

  // Enhanced filter properties
  filters = {
    createdDateFrom: '',
    createdDateTo: '',
    updatedDateFrom: '',
    updatedDateTo: '',
    hasPDF: false,
    pdfProcessed: false,
    aiReady: false
  };

  constructor(
    private policyService: PolicyService,
    private notificationService: NotificationService,
    private router: Router,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.loadPolicies();
  }

  loadPolicies(): void {
    this.isLoading = true;
    this.policyService.getMyPolicies().subscribe({
      next: (policies: Policy[]) => {
        this.policies = policies;
        this.filterPolicies();
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading policies:', error);
        this.isLoading = false;
      }
    });
  }

  filterPolicies(): void {
    let filtered = [...this.policies];

    // Text search (enhanced to include content)
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(policy =>
        policy.title.toLowerCase().includes(searchLower) ||
        (policy.description && policy.description.toLowerCase().includes(searchLower)) ||
        (policy.content && policy.content.toLowerCase().includes(searchLower))
      );
    }

    // Status filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(policy => policy.status === this.statusFilter);
    }

    // Date range filters
    if (this.filters.createdDateFrom) {
      const fromDate = new Date(this.filters.createdDateFrom);
      filtered = filtered.filter(policy => new Date(policy.createdAt) >= fromDate);
    }

    if (this.filters.createdDateTo) {
      const toDate = new Date(this.filters.createdDateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(policy => new Date(policy.createdAt) <= toDate);
    }

    if (this.filters.updatedDateFrom) {
      const fromDate = new Date(this.filters.updatedDateFrom);
      filtered = filtered.filter(policy => new Date(policy.updatedAt) >= fromDate);
    }

    if (this.filters.updatedDateTo) {
      const toDate = new Date(this.filters.updatedDateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(policy => new Date(policy.updatedAt) <= toDate);
    }

    // PDF status filters
    if (this.filters.hasPDF) {
      filtered = filtered.filter(policy => policy.hasPDF);
    }

    if (this.filters.pdfProcessed) {
      filtered = filtered.filter(policy => policy.pdfProcessed);
    }

    if (this.filters.aiReady) {
      filtered = filtered.filter(policy => policy.aiProcessed);
    }

    // Sorting
    filtered = this.sortPolicies(filtered);

    this.filteredPolicies = filtered;
  }

  setStatusFilter(status: string): void {
    this.statusFilter = status;
    this.filterPolicies();
  }

  getFilterButtonClass(status: string): string {
    return this.statusFilter === status ? 'filter-btn active' : 'filter-btn';
  }

  getStatusBadgeClasses(status: string): string {
    switch (status) {
      case 'publish':
        return 'status-badge status-publish';
      case 'draft':
        return 'status-badge status-draft';
      default:
        return 'status-badge status-draft';
    }
  }

  getLifecycleInfo(policy: Policy): PolicyLifecycleInfo {
    return this.policyService.calculatePolicyLifecycle(policy);
  }

  getLifecycleBadgeClasses(policy: Policy): string {
    const lifecycleInfo = this.getLifecycleInfo(policy);
    switch (lifecycleInfo.lifecycle) {
      case 'active':
        return 'lifecycle-badge lifecycle-active';
      case 'expiring-soon':
        return 'lifecycle-badge lifecycle-expiring-soon';
      case 'expired':
        return 'lifecycle-badge lifecycle-expired';
      default:
        return 'lifecycle-badge lifecycle-active';
    }
  }

  getExpiryDateClass(policy: Policy): string {
    if (!policy.expiryDate) return '';
    
    const lifecycleInfo = this.policyService.calculatePolicyLifecycle(policy);
    
    if (lifecycleInfo.isExpired) {
      return 'expiry-date expired';
    } else if (lifecycleInfo.isExpiringSoon) {
      return 'expiry-date expiring-soon';
    } else {
      return 'expiry-date active';
    }
  }

  getComplianceBadgeClass(level?: string): string {
    switch (level) {
      case 'compliant':
        return 'compliant';
      case 'partial':
        return 'partial';
      case 'non-compliant':
        return 'non-compliant';
      default:
        return 'unknown';
    }
  }

  getTotalCount(): number {
    return this.policies.length;
  }

  getPublishedCount(): number {
    return this.policies.filter(p => p.status === 'publish').length;
  }

  getDraftCount(): number {
    return this.policies.filter(p => p.status === 'draft').length;
  }

  createPolicy(): void {
    this.router.navigate(['/policies/create']);
  }

  comparePolicies(): void {
    this.router.navigate(['/policies/compare']);
  }

  viewPolicy(id: string): void {
    this.router.navigate(['/policies', id]);
  }

  editPolicy(id: string): void {
    this.router.navigate(['/policies', id, 'edit']);
  }

  deletePolicy(id: string): void {
    const policy = this.policies.find(p => p._id === id);
    const policyTitle = policy?.title || 'Unknown Policy';
    
    if (confirm(this.getTranslation('policies.confirmDelete'))) {
      this.policyService.deletePolicy(id).subscribe({
        next: () => {
          this.notificationService.showPolicyDeleted(policyTitle);
          this.loadPolicies();
        },
        error: (error: any) => {
          console.error('Error deleting policy:', error);
          this.notificationService.showError(this.getTranslation('policies.deleteError'));
        }
      });
    }
  }

  publishPolicy(id: string): void {
    const policy = this.policies.find(p => p._id === id);
    const policyTitle = policy?.title || 'Unknown Policy';
    
    if (confirm(this.getTranslation('policies.confirmPublish'))) {
      this.policyService.publishPolicy(id).subscribe({
        next: () => {
          this.notificationService.showPolicyPublished(policyTitle);
          this.loadPolicies();
        },
        error: (error: any) => {
          console.error('Error publishing policy:', error);
          this.notificationService.showError(this.getTranslation('policies.publishError'));
        }
      });
    }
  }

  // Enhanced filtering methods
  toggleAdvancedFilters(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filterPolicies();
  }

  clearAllFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.sortBy = 'updatedAt-desc';
    this.filters = {
      createdDateFrom: '',
      createdDateTo: '',
      updatedDateFrom: '',
      updatedDateTo: '',
      hasPDF: false,
      pdfProcessed: false,
      aiReady: false
    };
    this.filterPolicies();
  }

  hasActiveFilters(): boolean {
    return !!(
      this.searchTerm ||
      this.statusFilter !== 'all' ||
      this.filters.createdDateFrom ||
      this.filters.createdDateTo ||
      this.filters.updatedDateFrom ||
      this.filters.updatedDateTo ||
      this.filters.hasPDF ||
      this.filters.pdfProcessed ||
      this.filters.aiReady ||
      this.sortBy !== 'updatedAt-desc'
    );
  }

  getActiveFilterCount(): number {
    let count = 0;
    if (this.searchTerm) count++;
    if (this.statusFilter !== 'all') count++;
    if (this.filters.createdDateFrom) count++;
    if (this.filters.createdDateTo) count++;
    if (this.filters.updatedDateFrom) count++;
    if (this.filters.updatedDateTo) count++;
    if (this.filters.hasPDF) count++;
    if (this.filters.pdfProcessed) count++;
    if (this.filters.aiReady) count++;
    if (this.sortBy !== 'updatedAt-desc') count++;
    return count;
  }

  sortPolicies(policies: Policy[]): Policy[] {
    const [field, direction] = this.sortBy.split('-');
    const isAsc = direction === 'asc';

    return policies.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (field) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt);
          bValue = new Date(b.updatedAt);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return isAsc ? -1 : 1;
      if (aValue > bValue) return isAsc ? 1 : -1;
      return 0;
    });
  }

  getTranslation(key: string): string {
    return this.languageService.translate(key);
  }

}
