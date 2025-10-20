import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter, takeUntil, fromEvent, debounceTime, Subject } from 'rxjs';
import { MobileService } from '@core/services/mobile.service';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-mobile-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="mobile-bottom-nav" 
         *ngIf="isMobile" 
         [class]="getDeviceClass()"
         [class.offline]="!isOnline">
      <a 
        routerLink="/dashboard" 
        routerLinkActive="active"
        [routerLinkActiveOptions]="{exact: false}"
        class="nav-item"
        (click)="onNavClick()">
        <div class="nav-icon">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v4H8V5z"></path>
          </svg>
        </div>
        <span class="nav-label">Dashboard</span>
      </a>

      <a 
        routerLink="/policies" 
        routerLinkActive="active"
        [routerLinkActiveOptions]="{exact: false}"
        class="nav-item"
        (click)="onNavClick()">
        <div class="nav-icon">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        </div>
        <span class="nav-label">Policies</span>
      </a>

      <a 
        routerLink="/ai-assistant" 
        routerLinkActive="active"
        [routerLinkActiveOptions]="{exact: false}"
        class="nav-item"
        (click)="onNavClick()">
        <div class="nav-icon">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
          </svg>
          <span class="notification-badge" *ngIf="hasNotifications">{{ getNotificationCount() }}</span>
        </div>
        <span class="nav-label">AI Chat</span>
      </a>

      <a 
        routerLink="/chat-history" 
        routerLinkActive="active"
        [routerLinkActiveOptions]="{exact: false}"
        class="nav-item"
        (click)="onNavClick()">
        <div class="nav-icon">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
          </svg>
        </div>
        <span class="nav-label">History</span>
      </a>

      <button 
        class="nav-item add-policy-btn"
        (click)="onAddPolicyClick()">
        <div class="nav-icon">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
        </div>
        <span class="nav-label">New Policy</span>
      </button>
    </nav>
  `,
  styles: [`
    .mobile-bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--color-bg-primary);
      border-top: 1px solid var(--color-border-primary);
      display: flex;
      justify-content: space-around;
      align-items: center;
      padding: 8px 0 calc(8px + env(safe-area-inset-bottom));
      z-index: 50;
      box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
    }

    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 8px 12px;
      min-width: 60px;
      text-decoration: none;
      color: var(--color-text-secondary);
      transition: all 0.2s ease;
      border-radius: 12px;
      position: relative;
    }

    .nav-item:hover {
      color: var(--color-primary);
      background: var(--color-bg-secondary);
    }

    .nav-item.active {
      color: var(--color-primary);
      background: var(--color-bg-secondary);
    }

    .nav-item.active .nav-icon {
      transform: scale(1.1);
    }

    .nav-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 4px;
      transition: transform 0.2s ease;
    }

    .nav-label {
      font-size: 10px;
      font-weight: 500;
      text-align: center;
      line-height: 1.2;
    }

    .add-policy-btn {
      background: linear-gradient(135deg, var(--color-primary) 0%, #2563eb 100%);
      color: white;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }

    .add-policy-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
    }

    .add-policy-btn .nav-label {
      color: white;
      font-weight: 600;
    }

    /* Dark mode */
    .dark .mobile-bottom-nav {
      background: var(--color-bg-primary);
      border-top-color: var(--color-border-primary);
      box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3);
    }

    .dark .nav-item:hover,
    .dark .nav-item.active {
      background: var(--color-bg-secondary);
    }

    /* Hide on desktop */
    @media (min-width: 768px) {
      .mobile-bottom-nav {
        display: none;
      }
    }

    /* Animation for active state */
    .nav-item.active::before {
      content: '';
      position: absolute;
      top: -2px;
      left: 50%;
      transform: translateX(-50%);
      width: 4px;
      height: 4px;
      background: var(--color-primary);
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        transform: translateX(-50%) scale(1);
      }
      50% {
        opacity: 0.5;
        transform: translateX(-50%) scale(1.2);
      }
    }

    /* Notification badge */
    .notification-badge {
      position: absolute;
      top: -2px;
      right: -2px;
      background: #ef4444;
      color: white;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 10px;
      min-width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
      animation: notification-pulse 2s infinite;
    }

    @keyframes notification-pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.1);
      }
    }

    /* Device-specific styles */
    .ios .mobile-bottom-nav {
      padding-bottom: calc(8px + env(safe-area-inset-bottom) + 8px);
    }

    .android .mobile-bottom-nav {
      box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
    }

    .offline .mobile-bottom-nav {
      opacity: 0.7;
    }

    .offline .nav-item {
      color: var(--color-text-muted);
    }

    /* Enhanced touch targets for mobile */
    .touch .nav-item {
      min-height: 48px;
      min-width: 48px;
    }

    /* Accessibility improvements */
    .nav-item:focus {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .mobile-bottom-nav {
        border-top: 2px solid var(--color-border-primary);
      }
      
      .nav-item.active {
        background: var(--color-primary);
        color: white;
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .nav-item.active::before,
      .notification-badge {
        animation: none;
      }
    }
  `]
})
export class MobileBottomNavComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  isMobile = false;
  currentRoute = '';
  hasNotifications = false;
  isOnline = true;
  deviceInfo: any = null;

  constructor(
    private router: Router,
    private mobileService: MobileService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.checkScreenSize();
    this.setupResizeListener();
    this.trackCurrentRoute();
    this.setupDeviceInfo();
    this.setupNotificationListener();
    this.setupOnlineStatusListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkScreenSize(): void {
    this.isMobile = window.innerWidth < 768;
  }

  private setupResizeListener(): void {
    fromEvent(window, 'resize')
      .pipe(
        debounceTime(100),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.checkScreenSize();
      });
  }

  private trackCurrentRoute(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.url;
      });
  }

  onAddPolicyClick(): void {
    // Add haptic feedback
    this.mobileService.vibrate([50, 30, 50]);
    
    // Navigate to create policy page (frontend route, not API)
    this.router.navigate(['/policies/create']);
  }

  private setupDeviceInfo(): void {
    this.mobileService.deviceInfo$
      .pipe(takeUntil(this.destroy$))
      .subscribe(deviceInfo => {
        this.deviceInfo = deviceInfo;
        this.isMobile = deviceInfo.isMobile;
      });
  }

  private setupNotificationListener(): void {
    // Listen for notification changes - using a simple boolean for now
    // In a real implementation, you would subscribe to the notification service
    this.hasNotifications = false; // Placeholder - implement based on your notification service
  }

  private setupOnlineStatusListener(): void {
    this.mobileService.isOnline$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isOnline => {
        this.isOnline = isOnline;
      });
  }

  // Enhanced navigation with analytics
  onNavClick(): void {
    // Add haptic feedback
    this.mobileService.vibrate(50);
    
    // Track navigation analytics
    this.trackNavigation();
  }

  private trackNavigation(): void {
    // Track navigation for analytics
    console.log('Navigation tracked:', {
      route: this.currentRoute,
      device: this.deviceInfo?.platform,
      timestamp: new Date().toISOString()
    });
  }

  // Get notification count for display
  getNotificationCount(): number {
    return this.hasNotifications ? 1 : 0;
  }

  // Check if current route matches
  isRouteActive(route: string): boolean {
    return this.currentRoute.includes(route);
  }

  // Get device-specific styling
  getDeviceClass(): string {
    if (!this.deviceInfo) return '';
    
    const classes = [];
    if (this.deviceInfo.platform === 'ios') classes.push('ios');
    if (this.deviceInfo.platform === 'android') classes.push('android');
    if (this.deviceInfo.isTouchDevice) classes.push('touch');
    if (!this.isOnline) classes.push('offline');
    
    return classes.join(' ');
  }
}
