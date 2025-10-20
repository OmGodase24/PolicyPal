import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { NotificationSocketService, Notification } from '@core/services/notification-socket.service';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { LanguageService } from '@core/services/language.service';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="notifications-page">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <button 
            class="back-btn"
            (click)="goBack()"
            aria-label="Go back">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </button>
          <div class="header-text">
            <h1 class="page-title">{{ 'notifications.title' | translate }}</h1>
            <p class="page-subtitle">{{ 'notifications.pageSubtitle' | translate }}</p>
          </div>
          <div class="header-actions">
            <button
              class="action-btn mark-all-read"
              (click)="markAllAsRead()"
              [disabled]="unreadCount === 0"
              aria-label="Mark all as read">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              {{ 'notifications.markAllRead' | translate }}
            </button>
            
            <button
              class="action-btn delete-all"
              (click)="deleteAllNotifications()"
              [disabled]="notifications.length === 0"
              aria-label="Delete all notifications">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
              {{ 'notifications.deleteAll' | translate }}
            </button>
            
            <button
              class="action-btn selection-mode"
              (click)="toggleSelectionMode()"
              [class.active]="isSelectionMode"
              aria-label="Toggle selection mode">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              {{ isSelectionMode ? ('notifications.deselectAll' | translate) : ('notifications.selectAll' | translate) }}
            </button>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-section">
        <div class="stat-card">
          <div class="stat-number">{{ totalCount }}</div>
          <div class="stat-label">{{ 'notifications.total' | translate }}</div>
        </div>
        <div class="stat-card unread">
          <div class="stat-number">{{ unreadCount }}</div>
          <div class="stat-label">{{ 'notifications.unread' | translate }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ readCount }}</div>
          <div class="stat-label">{{ 'notifications.read' | translate }}</div>
        </div>
      </div>

      <!-- Selection Bar -->
      <div class="selection-bar" *ngIf="isSelectionMode">
        <div class="selection-info">
          <span class="selection-count">{{ 'notifications.selectedCount' | translate: { count: selectedCount } }}</span>
        </div>
        <div class="selection-actions">
          <button
            class="action-btn select-all"
            (click)="selectAll()"
            [disabled]="selectedCount === filteredNotifications.length">
            {{ 'notifications.selectAll' | translate }}
          </button>
          <button
            class="action-btn deselect-all"
            (click)="deselectAll()"
            [disabled]="selectedCount === 0">
            {{ 'notifications.deselectAll' | translate }}
          </button>
          <button
            class="action-btn delete-selected"
            (click)="deleteSelectedNotifications()"
            [disabled]="selectedCount === 0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
            {{ 'notifications.deleteSelected' | translate }}
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section" *ngIf="!isSelectionMode">
        <div class="filter-tabs">
          <button
            class="filter-tab"
            [class.active]="currentFilter === 'all'"
            (click)="setFilter('all')">
            {{ 'notifications.all' | translate }}
          </button>
          <button
            class="filter-tab"
            [class.active]="currentFilter === 'unread'"
            (click)="setFilter('unread')">
            {{ 'notifications.unread' | translate }}
            <span class="badge" *ngIf="unreadCount > 0">{{ unreadCount }}</span>
          </button>
          <button
            class="filter-tab"
            [class.active]="currentFilter === 'read'"
            (click)="setFilter('read')">
            {{ 'notifications.read' | translate }}
          </button>
        </div>
      </div>

      <!-- Notifications List -->
      <div class="notifications-content">
        <div *ngIf="loading" class="loading-state">
          <div class="spinner"></div>
          <p>{{ 'notifications.loading' | translate }}</p>
        </div>

        <div *ngIf="!loading && filteredNotifications.length === 0" class="empty-state">
          <div class="empty-icon">
            <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 1 0-15 0v5h5l-5 5-5-5h5v-5a7.5 7.5 0 1 1 15 0v5z"></path>
            </svg>
          </div>
          <h3>{{ 'notifications.noNotifications' | translate }}</h3>
          <p>{{ 'notifications.noNotificationsDesc' | translate }}</p>
        </div>

        <div *ngIf="!loading && filteredNotifications.length > 0" class="notifications-list">
          <div 
            *ngFor="let notification of filteredNotifications; trackBy: trackByNotificationId"
            class="notification-item"
            [class.unread]="!notification.isRead"
            [class.selected]="isNotificationSelected(notification._id)"
            (click)="isSelectionMode ? toggleNotificationSelection(notification._id) : onNotificationClick(notification)">
            
            <!-- Selection Checkbox -->
            <div class="notification-checkbox" *ngIf="isSelectionMode" (click)="$event.stopPropagation()">
              <input
                type="checkbox"
                [checked]="isNotificationSelected(notification._id)"
                (change)="toggleNotificationSelection(notification._id)"
                class="checkbox-input">
            </div>
            
            <div class="notification-content">
              <div class="notification-header">
                <h4 class="notification-title">{{ notification.title }}</h4>
                <div class="notification-meta">
                  <span class="notification-time">{{ notification.createdAt | date:'short' }}</span>
                  <span *ngIf="!notification.isRead" class="unread-indicator"></span>
                </div>
              </div>
              
              <p class="notification-message">{{ notification.message }}</p>
              
              <div class="notification-footer">
                <span class="notification-type">{{ getNotificationTypeLabel(notification.type) | translate }}</span>
                <span class="notification-priority" [class]="'priority-' + notification.priority">
                  {{ notification.priority | titlecase }}
                </span>
              </div>
            </div>

            <div class="notification-actions">
              <button 
                class="action-btn mark-read"
                (click)="markAsRead(notification, $event)"
                [disabled]="isSelectionMode"
                aria-label="Mark as read">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </button>
              
              <button 
                class="action-btn delete"
                (click)="deleteNotification(notification._id, $event)"
                aria-label="Delete notification">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notifications-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .back-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border-primary);
      color: var(--color-text-primary);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .back-btn:hover {
      background: var(--color-bg-tertiary);
      border-color: var(--color-primary);
    }

    .header-text {
      flex: 1;
    }

    .page-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 4px 0;
    }

    .page-subtitle {
      font-size: 14px;
      color: var(--color-text-secondary);
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid var(--color-border-primary);
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
    }

    .action-btn:hover:not(:disabled) {
      background: var(--color-bg-secondary);
      border-color: var(--color-primary);
    }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .mark-all-read {
      background: var(--color-primary);
      color: white;
      border-color: var(--color-primary);
    }

    .mark-all-read:hover:not(:disabled) {
      background: #2563eb;
    }

    .stats-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border-primary);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }

    .stat-card.unread {
      border-color: var(--color-primary);
      background: var(--color-bg-secondary);
    }

    .stat-number {
      font-size: 32px;
      font-weight: 700;
      color: var(--color-text-primary);
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 14px;
      color: var(--color-text-secondary);
    }

    .filters-section {
      margin-bottom: 24px;
    }

    .filter-tabs {
      display: flex;
      gap: 8px;
      background: var(--color-bg-secondary);
      padding: 4px;
      border-radius: 8px;
    }

    .filter-tab {
      flex: 1;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      background: transparent;
      border: none;
      color: var(--color-text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .filter-tab.active {
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .badge {
      background: var(--color-primary);
      color: white;
      font-size: 12px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 10px;
      min-width: 18px;
      text-align: center;
    }

    .notifications-content {
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border-primary);
      border-radius: 12px;
      overflow: hidden;
    }

    .loading-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--color-border-primary);
      border-top: 3px solid var(--color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .empty-icon {
      color: var(--color-text-tertiary);
      margin-bottom: 16px;
    }

    .empty-state h3 {
      font-size: 18px;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 8px 0;
    }

    .empty-state p {
      font-size: 14px;
      color: var(--color-text-secondary);
      margin: 0;
    }

    .notifications-list {
      max-height: 600px;
      overflow-y: auto;
    }

    .notification-item {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--color-border-primary);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .notification-item:hover {
      background: var(--color-bg-secondary);
    }

    .notification-item.unread {
      background: var(--color-bg-secondary);
      border-left: 4px solid var(--color-primary);
    }

    .notification-item:last-child {
      border-bottom: none;
    }

    .notification-content {
      flex: 1;
      min-width: 0;
    }

    .notification-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }

    .notification-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0;
      line-height: 1.4;
    }

    .notification-meta {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .notification-time {
      font-size: 12px;
      color: var(--color-text-tertiary);
    }

    .unread-indicator {
      width: 8px;
      height: 8px;
      background: var(--color-primary);
      border-radius: 50%;
    }

    .notification-message {
      font-size: 14px;
      color: var(--color-text-secondary);
      line-height: 1.5;
      margin: 0 0 12px 0;
    }

    .notification-footer {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .notification-type {
      font-size: 12px;
      font-weight: 500;
      color: var(--color-text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .notification-priority {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }

    .priority-low {
      background: #f3f4f6;
      color: #6b7280;
    }

    .priority-medium {
      background: #fef3c7;
      color: #92400e;
    }

    .priority-high {
      background: #fecaca;
      color: #dc2626;
    }

    .priority-urgent {
      background: #fecaca;
      color: #dc2626;
    }

    .notification-actions {
      display: flex;
      align-items: center;
    }

    .notification-actions .action-btn {
      padding: 8px;
      border-radius: 6px;
      background: transparent;
      border: 1px solid var(--color-border-primary);
      color: var(--color-text-secondary);
    }

    .notification-actions .action-btn:hover {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
    }

    /* Dark mode */
    .dark .stat-card.unread {
      background: var(--color-bg-tertiary);
    }

    .dark .priority-low {
      background: #374151;
      color: #9ca3af;
    }

    .dark .priority-medium {
      background: #92400e;
      color: #fcd34d;
    }

    .dark .priority-high,
    .dark .priority-urgent {
      background: #dc2626;
      color: #fecaca;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .notifications-page {
        padding: 16px;
      }

      .header-content {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .header-actions {
        width: 100%;
        justify-content: flex-end;
      }

      .stats-section {
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }

      .stat-card {
        padding: 16px;
      }

      .stat-number {
        font-size: 24px;
      }

      .notification-item {
        padding: 12px 16px;
      }

      .notification-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }
    }
  `]
})
export class NotificationsPageComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  loading = true;
  currentFilter: 'all' | 'unread' | 'read' = 'all';
  
  // Selection state
  selectedNotifications: Set<string> = new Set();
  isSelectionMode = false;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private notificationService: NotificationSocketService,
    private router: Router,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.subscribeToNotifications();
    // Only load notifications if we don't have any yet
    if (this.notificationService.getCurrentNotifications().length === 0) {
      this.loadNotifications();
    } else {
      // Use existing notifications
      this.notifications = this.notificationService.getCurrentNotifications();
      this.applyFilter();
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  get totalCount(): number {
    return this.notifications.length;
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  get readCount(): number {
    return this.notifications.filter(n => n.isRead).length;
  }

  private loadNotifications(): void {
    this.loading = true;
    this.notificationService.getNotifications().subscribe({
      next: (notifications) => {
        this.notifications = notifications;
        this.applyFilter();
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load notifications:', error);
        this.loading = false;
      }
    });
  }

  private subscribeToNotifications(): void {
    this.subscriptions.push(
      this.notificationService.notifications$.subscribe(notifications => {
        this.notifications = notifications;
        this.applyFilter();
      })
    );
  }

  setFilter(filter: 'all' | 'unread' | 'read'): void {
    this.currentFilter = filter;
    this.applyFilter();
  }

  private applyFilter(): void {
    switch (this.currentFilter) {
      case 'unread':
        this.filteredNotifications = this.notifications.filter(n => !n.isRead);
        break;
      case 'read':
        this.filteredNotifications = this.notifications.filter(n => n.isRead);
        break;
      default:
        this.filteredNotifications = this.notifications;
    }
  }

  markAsRead(notification: Notification, event: Event): void {
    event.stopPropagation();
    
    // Check if already read
    if (notification.isRead) {
      return;
    }
    
    console.log('🔍 Notification object:', notification);
    console.log('🔍 Notification ID:', notification._id);
    console.log('🔍 Notification keys:', Object.keys(notification));
    
    this.notificationService.markNotificationAsRead(notification._id);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  onNotificationClick(notification: Notification): void {
    if (!notification.isRead) {
      this.notificationService.markNotificationAsRead(notification._id);
    }
    
    // Navigate based on notification type
    this.navigateToNotificationTarget(notification);
  }

  private navigateToNotificationTarget(notification: Notification): void {
    switch (notification.type) {
      case 'policy_created':
      case 'policy_published':
      case 'policy_updated':
        this.router.navigate(['/policies']);
        break;
      case 'ai_chat_session_started':
        this.router.navigate(['/ai-chat']);
        break;
      case 'compliance_check_completed':
        this.router.navigate(['/policies']);
        break;
      default:
        this.router.navigate(['/dashboard']);
    }
  }

  getNotificationTypeLabel(type: string): string {
    const typeLabels: { [key: string]: string } = {
      'policy_created': 'notifications.policyCreated',
      'policy_published': 'notifications.policyPublished',
      'policy_updated': 'notifications.policyUpdated',
      'policy_expiring': 'notifications.policyExpiring',
      'policy_expired': 'notifications.policyExpired',
      'compliance_check_completed': 'notifications.complianceCompleted',
      'ai_chat_session_started': 'notifications.aiChatStarted',
      'system_maintenance': 'notifications.systemMaintenance',
      'security_alert': 'notifications.securityAlert',
      'welcome': 'notifications.welcome'
    };
    return typeLabels[type] || type;
  }

  trackByNotificationId(index: number, notification: Notification): string {
    return notification._id;
  }

  // Selection methods
  toggleSelectionMode(): void {
    this.isSelectionMode = !this.isSelectionMode;
    if (!this.isSelectionMode) {
      this.selectedNotifications.clear();
    }
  }

  toggleNotificationSelection(notificationId: string): void {
    if (this.selectedNotifications.has(notificationId)) {
      this.selectedNotifications.delete(notificationId);
    } else {
      this.selectedNotifications.add(notificationId);
    }
  }

  isNotificationSelected(notificationId: string): boolean {
    return this.selectedNotifications.has(notificationId);
  }

  selectAll(): void {
    this.filteredNotifications.forEach(notification => {
      this.selectedNotifications.add(notification._id);
    });
  }

  deselectAll(): void {
    this.selectedNotifications.clear();
  }

  get selectedCount(): number {
    return this.selectedNotifications.size;
  }

  get hasSelection(): boolean {
    return this.selectedNotifications.size > 0;
  }

  // Delete methods
  deleteNotification(notificationId: string, event: Event): void {
    event.stopPropagation();
    
    const message = this.languageService.translate('notifications.confirmDeleteSingle');
    if (confirm(message)) {
      this.notificationService.deleteNotification(notificationId);
    }
  }

  deleteSelectedNotifications(): void {
    if (this.selectedNotifications.size === 0) return;
    
    const message = this.languageService.translate('notifications.confirmDeleteSelected');
    if (confirm(message)) {
      this.selectedNotifications.forEach(notificationId => {
        this.notificationService.deleteNotification(notificationId);
      });
      this.selectedNotifications.clear();
      this.isSelectionMode = false;
    }
  }

  deleteAllNotifications(): void {
    if (this.notifications.length === 0) return;
    
    const message = this.languageService.translate('notifications.confirmDeleteAll');
    if (confirm(message)) {
      this.notificationService.deleteAllNotifications();
      this.selectedNotifications.clear();
      this.isSelectionMode = false;
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
