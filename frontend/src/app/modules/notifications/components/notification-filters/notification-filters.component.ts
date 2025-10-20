import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TranslatePipe } from '@core/pipes/translate.pipe';

export type NotificationFilter = 'all' | 'unread' | 'read';

@Component({
  selector: 'app-notification-filters',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="filters-section">
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
  `,
  styles: [`
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
  `]
})
export class NotificationFiltersComponent {
  @Input() currentFilter: NotificationFilter = 'all';
  @Input() unreadCount: number = 0;
  @Output() filterChange = new EventEmitter<NotificationFilter>();

  setFilter(filter: NotificationFilter): void {
    this.currentFilter = filter;
    this.filterChange.emit(filter);
  }
}
