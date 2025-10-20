import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { NotificationSocketService, Notification } from '@core/services/notification-socket.service';
import { TranslatePipe } from '@core/pipes/translate.pipe';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="notification-bell-container" (click)="toggleDropdown()">
      <button class="notification-bell" [class.has-notifications]="unreadCount > 0">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9">
          </path>
        </svg>
        <span *ngIf="unreadCount > 0" class="notification-badge">{{ unreadCount }}</span>
      </button>

      <!-- Dropdown -->
      <div class="notification-dropdown" [class.show]="showDropdown" (click)="$event.stopPropagation()">
        <div class="dropdown-header">
          <h3>{{ 'notifications.title' | translate }}</h3>
          <button *ngIf="unreadCount > 0" (click)="markAllAsRead()" class="mark-all-read">
            {{ 'notifications.markAllRead' | translate }}
          </button>
        </div>

        <div class="notifications-list">
          <div *ngIf="notifications.length === 0" class="empty-state">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9">
              </path>
            </svg>
            <p>{{ 'notifications.noNotifications' | translate }}</p>
          </div>

          <div *ngFor="let notification of notifications.slice(0, 5); trackBy: trackByNotification" 
               class="notification-item" 
               [class.unread]="!notification.isRead"
               (click)="handleNotificationClick(notification)">
            <div class="notification-icon" [ngClass]="getNotificationIconClass(notification.type)">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      [attr.d]="getNotificationIcon(notification.type)">
                </path>
              </svg>
            </div>
            <div class="notification-content">
              <h4 class="notification-title">{{ notification.title }}</h4>
              <p class="notification-message">{{ notification.message }}</p>
              <span class="notification-time">{{ getTimeAgo(notification.createdAt) }}</span>
            </div>
            <div *ngIf="!notification.isRead" class="unread-indicator"></div>
          </div>
        </div>

        <div *ngIf="notifications.length > 5" class="dropdown-footer">
          <button (click)="viewAllNotifications()" class="view-all-btn">
            {{ 'notifications.viewAll' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notification-bell-container {
      position: relative;
      display: inline-block;
    }

    .notification-bell {
      position: relative;
      background: none;
      border: none;
      padding: 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      color: var(--color-text-primary);
    }

    .notification-bell:hover {
      background: var(--color-bg-tertiary);
    }

    .notification-bell.has-notifications {
      color: var(--color-primary);
    }

    .notification-badge {
      position: absolute;
      top: 4px;
      right: 4px;
      background: var(--color-danger);
      color: white;
      border-radius: 50%;
      width: 18px;
      height: 18px;
      font-size: 10px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    .notification-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      width: 360px;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border-primary);
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-10px);
      transition: all 0.2s ease;
      margin-top: 8px;
    }

    .notification-dropdown.show {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .dropdown-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid var(--color-border-primary);
    }

    .dropdown-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .mark-all-read {
      background: none;
      border: none;
      color: var(--color-primary);
      font-size: 12px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background-color 0.2s ease;
    }

    .mark-all-read:hover {
      background: var(--color-bg-tertiary);
    }

    .notifications-list {
      max-height: 400px;
      overflow-y: auto;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
      text-align: center;
      color: var(--color-text-tertiary);
    }

    .empty-state svg {
      margin-bottom: 8px;
    }

    .empty-state p {
      margin: 0;
      font-size: 14px;
    }

    .notification-item {
      display: flex;
      align-items: flex-start;
      padding: 12px 16px;
      border-bottom: 1px solid var(--color-border-primary);
      cursor: pointer;
      transition: background-color 0.2s ease;
      position: relative;
    }

    .notification-item:hover {
      background: var(--color-bg-tertiary);
    }

    .notification-item.unread {
      background: var(--color-bg-secondary);
    }

    .notification-icon {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      flex-shrink: 0;
    }

    .notification-icon.policy {
      background: var(--color-primary-light);
      color: var(--color-primary);
    }

    .notification-icon.compliance {
      background: var(--color-success-light);
      color: var(--color-success);
    }

    .notification-icon.chat {
      background: var(--color-info-light);
      color: var(--color-info);
    }

    .notification-icon.alert {
      background: var(--color-warning-light);
      color: var(--color-warning);
    }

    .notification-content {
      flex: 1;
      min-width: 0;
    }

    .notification-title {
      margin: 0 0 4px 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text-primary);
      line-height: 1.4;
    }

    .notification-message {
      margin: 0 0 4px 0;
      font-size: 13px;
      color: var(--color-text-secondary);
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .notification-time {
      font-size: 11px;
      color: var(--color-text-tertiary);
    }

    .unread-indicator {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 8px;
      height: 8px;
      background: var(--color-primary);
      border-radius: 50%;
    }

    .dropdown-footer {
      padding: 12px 16px;
      border-top: 1px solid var(--color-border-primary);
      text-align: center;
    }

    .view-all-btn {
      background: none;
      border: 1px solid var(--color-border-primary);
      color: var(--color-text-primary);
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s ease;
    }

    .view-all-btn:hover {
      background: var(--color-bg-tertiary);
      border-color: var(--color-primary);
    }

    /* Mobile responsiveness */
    @media (max-width: 768px) {
      .notification-dropdown {
        width: 320px;
        right: -10px;
      }
    }
  `]
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  unreadCount = 0;
  showDropdown = false;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private notificationService: NotificationSocketService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('🔔 NotificationBellComponent initialized');
    
    // Subscribe to notifications
    this.subscriptions.push(
      this.notificationService.notifications$.subscribe(notifications => {
        console.log('🔔 Received notifications:', notifications);
        this.notifications = notifications;
        this.updateUnreadCount();
      })
    );

    // Subscribe to unread count
    this.subscriptions.push(
      this.notificationService.unreadCount$.subscribe(count => {
        console.log('🔔 Unread count updated:', count);
        this.unreadCount = count;
      })
    );

    // Close dropdown when clicking outside
    document.addEventListener('click', this.handleOutsideClick.bind(this));
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    document.removeEventListener('click', this.handleOutsideClick.bind(this));
  }

  private updateUnreadCount(): void {
    this.unreadCount = this.notifications.filter(n => !n.isRead).length;
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }

  handleOutsideClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-bell-container')) {
      this.showDropdown = false;
    }
  }

  handleNotificationClick(notification: Notification): void {
    // Mark as read
    this.notificationService.markNotificationAsRead(notification._id);
    
    // Navigate to notifications page
    this.router.navigate(['/notifications']);
    
    // Close dropdown
    this.showDropdown = false;
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  viewAllNotifications(): void {
    this.router.navigate(['/notifications']);
    this.showDropdown = false;
  }

  trackByNotification(index: number, notification: Notification): string {
    return notification._id;
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  getNotificationIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'policy_created': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      'policy_updated': 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
      'policy_published': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      'policy_expiring': 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z',
      'compliance_check_completed': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      'ai_chat_session_started': 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
      'system_maintenance': 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      'security_alert': 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z',
      'welcome': 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
    };
    
    return icons[type] || icons['policy_created'];
  }

  getNotificationIconClass(type: string): string {
    if (type.includes('policy')) return 'policy';
    if (type.includes('compliance')) return 'compliance';
    if (type.includes('chat')) return 'chat';
    if (type.includes('alert') || type.includes('expiring')) return 'alert';
    return 'policy';
  }

  private navigateToNotification(notification: Notification): void {
    if (notification.metadata?.policyId) {
      this.router.navigate(['/policies', notification.metadata.policyId]);
    } else if (notification.metadata?.chatSessionId) {
      this.router.navigate(['/ai-chat']);
    } else {
      // Default navigation
      this.router.navigate(['/dashboard']);
    }
  }
}
