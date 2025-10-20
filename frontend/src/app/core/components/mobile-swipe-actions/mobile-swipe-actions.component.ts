import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { fromEvent, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface SwipeAction {
  id: string;
  label: string;
  icon: string;
  color: string;
  action: () => void;
}

@Component({
  selector: 'app-mobile-swipe-actions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      #swipeContainer
      class="swipe-container"
      [class.swiping]="isSwiping"
      [style.transform]="'translateX(' + translateX + 'px)'"
      (touchstart)="onTouchStart($event)"
      (touchmove)="onTouchMove($event)"
      (touchend)="onTouchEnd($event)">
      
      <!-- Main content -->
      <div class="swipe-content">
        <ng-content></ng-content>
      </div>

      <!-- Swipe actions -->
      <div class="swipe-actions" [class.visible]="showActions">
        <button
          *ngFor="let action of actions"
          class="swipe-action"
          [style.background-color]="action.color"
          (click)="onActionClick(action)"
          [attr.aria-label]="action.label">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="action.icon"></path>
          </svg>
          <span class="action-label">{{ action.label }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .swipe-container {
      position: relative;
      overflow: hidden;
      transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      background: var(--color-bg-primary);
      border-radius: 12px;
      margin: 8px 0;
    }

    .swipe-container.swiping {
      transition: none;
    }

    .swipe-content {
      position: relative;
      z-index: 2;
      background: var(--color-bg-primary);
      min-height: 60px;
    }

    .swipe-actions {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      padding: 0 16px;
      background: linear-gradient(90deg, transparent 0%, var(--color-bg-secondary) 20%);
      z-index: 1;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
    }

    .swipe-actions.visible {
      opacity: 1;
      transform: translateX(0);
    }

    .swipe-action {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 60px;
      height: 100%;
      padding: 8px 12px;
      margin-left: 8px;
      border: none;
      border-radius: 8px;
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 12px;
      font-weight: 500;
    }

    .swipe-action:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .swipe-action:active {
      transform: scale(0.95);
    }

    .action-label {
      margin-top: 4px;
      text-align: center;
      line-height: 1.2;
    }

    /* Dark mode */
    .dark .swipe-container {
      background: var(--color-bg-primary);
    }

    .dark .swipe-content {
      background: var(--color-bg-primary);
    }

    .dark .swipe-actions {
      background: linear-gradient(90deg, transparent 0%, var(--color-bg-secondary) 20%);
    }

    /* Mobile specific styles */
    @media (max-width: 768px) {
      .swipe-container {
        margin: 4px 0;
        border-radius: 8px;
      }

      .swipe-action {
        min-width: 50px;
        padding: 6px 8px;
        font-size: 11px;
      }
    }
  `]
})
export class MobileSwipeActionsComponent implements OnInit, OnDestroy {
  @Input() actions: SwipeAction[] = [];
  @Input() swipeThreshold = 100;
  @Input() enableSwipe = true;
  @Output() actionTriggered = new EventEmitter<SwipeAction>();

  @ViewChild('swipeContainer', { static: true }) swipeContainer!: ElementRef;

  private destroy$ = new Subject<void>();
  private startX = 0;
  private currentX = 0;
  private translateX = 0;
  private isSwiping = false;
  private showActions = false;

  ngOnInit(): void {
    if (this.enableSwipe) {
      this.setupTouchListeners();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupTouchListeners(): void {
    // Additional touch event listeners can be added here if needed
  }

  onTouchStart(event: TouchEvent): void {
    if (!this.enableSwipe || this.actions.length === 0) return;

    this.startX = event.touches[0].clientX;
    this.isSwiping = true;
    
    // Add haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isSwiping) return;

    event.preventDefault();
    this.currentX = event.touches[0].clientX;
    const deltaX = this.currentX - this.startX;

    // Only allow left swipe (negative deltaX)
    if (deltaX < 0) {
      this.translateX = Math.max(deltaX, -this.swipeThreshold);
      this.showActions = Math.abs(deltaX) > 20;
    }
  }

  onTouchEnd(event: TouchEvent): void {
    if (!this.isSwiping) return;

    this.isSwiping = false;
    const deltaX = this.currentX - this.startX;

    if (Math.abs(deltaX) > this.swipeThreshold) {
      // Swipe completed - show actions
      this.translateX = -this.swipeThreshold;
      this.showActions = true;
    } else {
      // Swipe not completed - reset
      this.translateX = 0;
      this.showActions = false;
    }
  }

  onActionClick(action: SwipeAction): void {
    // Add haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 50]);
    }

    // Execute action
    action.action();
    this.actionTriggered.emit(action);

    // Reset swipe state
    this.translateX = 0;
    this.showActions = false;
  }

  // Method to programmatically reset swipe state
  resetSwipe(): void {
    this.translateX = 0;
    this.showActions = false;
    this.isSwiping = false;
  }
}
