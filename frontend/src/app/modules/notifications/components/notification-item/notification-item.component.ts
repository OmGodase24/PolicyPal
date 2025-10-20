import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Notification } from '@core/services/notification-socket.service';

@Component({
  selector: 'app-notification-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-item" [class.unread]="!notification.isRead">
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
          <span class="notification-type">{{ getNotificationTypeLabel(notification.type) }}</span>
          <span class="notification-priority" [class]="'priority-' + notification.priority">
            {{ notification.priority | titlecase }}
          </span>
        </div>
      </div>

      <div class="notification-actions">
        <button 
          class="action-btn"
          (click)="onMarkAsRead($event)"
          aria-label="Mark as read">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
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

    .action-btn {
      padding: 8px;
      border-radius: 6px;
      background: transparent;
      border: 1px solid var(--color-border-primary);
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .action-btn:hover {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
    }
  `]
})
export class NotificationItemComponent {
  @Input() notification!: Notification;
  @Output() markAsRead = new EventEmitter<Notification>();

  onMarkAsRead(event: Event): void {
    event.stopPropagation();
    this.markAsRead.emit(this.notification);
  }

  getNotificationTypeLabel(type: string): string {
    const typeLabels: { [key: string]: string } = {
      'policy_created': 'Policy Created',
      'policy_published': 'Policy Published',
      'policy_updated': 'Policy Updated',
      'policy_expiring': 'Policy Expiring',
      'policy_expired': 'Policy Expired',
      'compliance_check_completed': 'Compliance Check',
      'ai_chat_session_started': 'AI Chat',
      'system_maintenance': 'System Maintenance',
      'security_alert': 'Security Alert',
      'welcome': 'Welcome'
    };
    return typeLabels[type] || type;
  }
}
