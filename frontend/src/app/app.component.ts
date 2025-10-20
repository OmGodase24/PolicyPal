import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { HeaderComponent } from '@core/components/header/header.component';
import { MobileBottomNavComponent } from '@core/components/mobile-bottom-nav/mobile-bottom-nav.component';
import { LoadingService } from '@core/services/loading.service';
import { AuthService } from '@core/services/auth.service';
import { NotificationComponent } from '@core/components/notification/notification.component';
import { ThemeService } from '@core/services/theme.service';
import { MobileService } from '@core/services/mobile.service';
import { LanguageService } from '@core/services/language.service';
import { NotificationSocketService } from '@core/services/notification-socket.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent,
    MobileBottomNavComponent,
    NotificationComponent
  ],
  template: `
    <div class="app-root" style="background-color: var(--color-bg-primary);">
      <!-- Global Loading Bar -->
      @if (loadingService.isLoading$ | async) {
        <div class="fixed top-0 left-0 right-0 z-50 h-1 bg-primary-600 animate-pulse"></div>
      }

      <!-- Sidebar (only show when authenticated) -->
      @if (authService.isAuthenticated$ | async) {
        <app-header></app-header>
      }

      <!-- Main Content Area -->
      @if (authService.isAuthenticated$ | async) {
        <div class="app-layout with-sidebar">
          <main class="main-content" 
                [style.padding-bottom]="isMobile ? '80px' : '0'">
            <router-outlet></router-outlet>
          </main>
        </div>
      } @else {
        <main class="auth-content">
          <router-outlet></router-outlet>
        </main>
      }

      <!-- Mobile Bottom Navigation -->
      @if (isMobile && (authService.isAuthenticated$ | async)) {
        <app-mobile-bottom-nav></app-mobile-bottom-nav>
      }

      <!-- Global Notifications -->
      <app-notification></app-notification>
    </div>
  `
})
export class AppComponent implements OnInit {
  isMobile = false;

  constructor(
    public loadingService: LoadingService,
    public authService: AuthService,
    public mobileService: MobileService,
    private themeService: ThemeService,
    private languageService: LanguageService,
    private notificationService: NotificationSocketService
  ) {}

  ngOnInit(): void {
    // Initialize app
    this.authService.initializeAuth();
    this.themeService.watchSystemTheme();
    this.languageService.initializeLanguage();
    
    // Initialize notification service
    this.notificationService.initialize();
    
    // Check if mobile on initialization
    this.isMobile = this.mobileService.isMobile();
    
    // Subscribe to device changes
    this.mobileService.deviceInfo$.subscribe(deviceInfo => {
      this.isMobile = deviceInfo.isMobile;
    });
  }
}
