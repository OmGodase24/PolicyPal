import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { Policy } from '@core/models/policy.model';
import { PolicyService } from '@core/services/policy.service';
import { MobileSwipeActionsComponent, SwipeAction } from '@core/components/mobile-swipe-actions/mobile-swipe-actions.component';

@Component({
  selector: 'app-mobile-policy-card',
  standalone: true,
  imports: [CommonModule, MobileSwipeActionsComponent],
  template: `
    <app-mobile-swipe-actions
      [actions]="swipeActions"
      [enableSwipe]="true"
      (actionTriggered)="onSwipeAction($event)">
      
      <div class="mobile-policy-card" (click)="onCardClick()">
        <!-- Policy Header -->
        <div class="policy-header">
          <div class="policy-title-section">
            <h3 class="policy-title">{{ policy.title }}</h3>
            <div class="policy-status">
              <span [class]="getStatusBadgeClasses(policy.status)" class="status-badge">
                {{ policy.status | titlecase }}
              </span>
            </div>
          </div>
          <div class="policy-actions">
            <button 
              class="action-btn quick-action"
              (click)="onQuickAction($event)"
              [attr.aria-label]="'Quick actions for ' + policy.title">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Policy Description -->
        <div class="policy-description">
          <p>{{ policy.description }}</p>
        </div>

        <!-- Policy Metadata -->
        <div class="policy-metadata">
          <div class="metadata-item">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <span>{{ policy.hasPDF ? '📄 PDF' : '📝 Text' }}</span>
          </div>
          
          <div class="metadata-item">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <span>{{ policy.updatedAt | date:'MMM d' }}</span>
          </div>

          <div class="metadata-item" *ngIf="policy.expiryDate">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span [class]="getExpiryDateClass(policy)">
              Expires {{ policy.expiryDate | date:'MMM d, y' }}
            </span>
          </div>

          <div class="metadata-item" *ngIf="policy.aiProcessed">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
            </svg>
            <span>AI Ready</span>
          </div>
        </div>

        <!-- AI Summary Preview -->
        <div class="ai-summary-preview" *ngIf="policy.aiSummary">
          <div class="summary-header">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
            </svg>
            <span class="summary-label">AI Summary</span>
          </div>
          <p class="summary-text">{{ policy.aiSummary | slice:0:120 }}{{ policy.aiSummary.length > 120 ? '...' : '' }}</p>
        </div>

        <!-- Action Buttons -->
        <div class="policy-actions-mobile">
          <button 
            class="action-btn primary"
            (click)="onViewClick($event)"
            [disabled]="!policy.hasPDF && !policy.content">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
            View
          </button>

          <button 
            class="action-btn secondary"
            (click)="onAIChatClick($event)"
            [disabled]="!policy.aiProcessed">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
            AI Chat
          </button>

          <button 
            class="action-btn secondary"
            (click)="onEditClick($event)"
            [disabled]="policy.status !== 'draft'">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
            Edit
          </button>
        </div>
      </div>
    </app-mobile-swipe-actions>
  `,
  styles: [`
    .mobile-policy-card {
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border-primary);
      border-radius: 12px;
      padding: 20px;
      margin: 8px 0;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      overflow: hidden;
      min-height: 200px;
    }

    .mobile-policy-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      border-color: var(--color-primary);
    }

    .mobile-policy-card:active {
      transform: translateY(0);
    }

    .policy-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .policy-title-section {
      flex: 1;
      min-width: 0;
    }

    .policy-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 8px 0;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .policy-status {
      display: flex;
      align-items: center;
    }

    .status-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-publish {
      background: #d1fae5;
      color: #065f46;
    }

    .status-draft {
      background: #fef3c7;
      color: #92400e;
    }

    .policy-actions {
      display: flex;
      align-items: center;
    }

    .quick-action {
      padding: 8px;
      border-radius: 8px;
      background: transparent;
      border: none;
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .quick-action:hover {
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
    }

    .policy-description {
      margin-bottom: 12px;
    }

    .policy-description p {
      font-size: 14px;
      color: var(--color-text-secondary);
      line-height: 1.4;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .policy-metadata {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 12px;
    }

    .metadata-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--color-text-tertiary);
    }

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

    .ai-summary-preview {
      background: var(--color-bg-secondary);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
    }

    .summary-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }

    .summary-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-primary);
    }

    .summary-text {
      font-size: 13px;
      color: var(--color-text-secondary);
      line-height: 1.4;
      margin: 0;
    }

    .policy-actions-mobile {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid transparent;
      flex: 1;
      justify-content: center;
    }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .action-btn.primary {
      background: var(--color-primary);
      color: white;
      border-color: var(--color-primary);
    }

    .action-btn.primary:hover:not(:disabled) {
      background: #2563eb;
      transform: translateY(-1px);
    }

    .action-btn.secondary {
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
      border-color: var(--color-border-primary);
    }

    .action-btn.secondary:hover:not(:disabled) {
      background: var(--color-bg-tertiary);
      border-color: var(--color-primary);
    }

    /* Dark mode */
    .dark .mobile-policy-card {
      background: var(--color-bg-primary);
      border-color: var(--color-border-primary);
    }

    .dark .mobile-policy-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .dark .ai-summary-preview {
      background: var(--color-bg-secondary);
    }

    .dark .status-publish {
      background: #065f46;
      color: #a7f3d0;
    }

    .dark .status-draft {
      background: #92400e;
      color: #fcd34d;
    }

    /* Touch feedback */
    .mobile-policy-card:active {
      background: var(--color-bg-secondary);
    }

    /* Responsive adjustments */
    @media (max-width: 480px) {
      .mobile-policy-card {
        padding: 12px;
        margin: 6px 0;
      }

      .policy-title {
        font-size: 15px;
      }

      .policy-description p {
        font-size: 13px;
      }

      .action-btn {
        padding: 6px 10px;
        font-size: 11px;
      }
    }
  `]
})
export class MobilePolicyCardComponent implements OnInit {
  @Input() policy!: Policy;
  @Output() viewPolicy = new EventEmitter<Policy>();
  @Output() editPolicy = new EventEmitter<Policy>();
  @Output() deletePolicy = new EventEmitter<Policy>();
  @Output() startAIChat = new EventEmitter<Policy>();

  swipeActions: SwipeAction[] = [];

  constructor(private router: Router, private policyService: PolicyService) {}

  ngOnInit(): void {
    this.setupSwipeActions();
  }

  private setupSwipeActions(): void {
    this.swipeActions = [
      {
        id: 'view',
        label: 'View',
        icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
        color: '#3b82f6',
        action: () => this.onViewClick()
      },
      {
        id: 'ai-chat',
        label: 'AI Chat',
        icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
        color: '#10b981',
        action: () => this.onAIChatClick()
      },
      {
        id: 'edit',
        label: 'Edit',
        icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
        color: '#f59e0b',
        action: () => this.onEditClick()
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        color: '#ef4444',
        action: () => this.onDeleteClick()
      }
    ];
  }

  onCardClick(): void {
    this.viewPolicy.emit(this.policy);
  }

  onViewClick(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.viewPolicy.emit(this.policy);
  }

  onEditClick(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.editPolicy.emit(this.policy);
  }

  onAIChatClick(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.startAIChat.emit(this.policy);
  }

  onDeleteClick(): void {
    this.deletePolicy.emit(this.policy);
  }

  onQuickAction(event: Event): void {
    event.stopPropagation();
    // Show quick action menu
  }

  onSwipeAction(action: SwipeAction): void {
    // Handle swipe action
    console.log('Swipe action triggered:', action.id);
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
}
