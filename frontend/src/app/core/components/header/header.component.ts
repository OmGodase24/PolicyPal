import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';

import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { environment } from 'src/environments/environment';
import { ThemeToggleComponent } from '@shared/components/theme-toggle/theme-toggle.component';
import { LanguageSelectorComponent } from '@shared/components/language-selector/language-selector.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ThemeToggleComponent,
    LanguageSelectorComponent,
    TranslatePipe
  ],
  animations: [
    trigger('slideIn', [
      state('closed', style({
        transform: 'translateX(-100%)'
      })),
      state('open', style({
        transform: 'translateX(0)'
      })),
      transition('closed <=> open', animate('300ms ease-in-out'))
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms', style({ opacity: 0 }))
      ])
    ])
  ],
  template: `
    <!-- Topbar Header (Gmail-like) -->
    <header class="topbar">
      <div class="topbar-left">
        <!-- Hamburger toggles sidebar on mobile/tablet -->
        <button class="topbar-hamburger" (click)="toggleSidebar()" aria-label="Toggle Sidebar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <!-- Brand: icon + title + subtitle -->
        <div class="topbar-brand">
          <div class="logo-icon">
            <svg class="logo-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
          <div class="brand-text">
            <a routerLink="/dashboard" class="brand-title" (click)="closeSidebarOnMobile()">{{ appName }}</a>
            <div class="brand-subtitle">{{ appTagline }}</div>
          </div>
        </div>
      </div>

      <div class="topbar-right">
        <!-- Optional Language (kept to preserve functionality) -->
        <app-language-selector></app-language-selector>
        <!-- Theme toggle to the left of profile -->
        <app-theme-toggle></app-theme-toggle>

        <!-- Profile summary with dropdown -->
        @if (currentUser$ | async; as user) {
          <div class="topbar-profile" [class.open]="isUserMenuOpen">
            <button (click)="toggleUserMenu()" class="user-profile-button" type="button">
              <div class="user-avatar">{{ getUserInitials(user) }}</div>
              <div class="user-info">
                <p class="user-name">{{ user.firstName }} {{ user.lastName }}</p>
                <p class="user-email">{{ user.email }}</p>
              </div>
              <svg class="dropdown-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>

            @if (isUserMenuOpen) {
              <div class="user-dropdown">
                <div class="dropdown-header">
                  <p class="dropdown-user-name">{{ user.firstName }} {{ user.lastName }}</p>
                  <p class="dropdown-user-email">{{ user.email }}</p>
                </div>
                <button type="button" class="dropdown-item" (click)="onProfileClick()">
                  <svg class="dropdown-icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {{ 'navigation.profile' | translate }}
                </button>
                <div class="dropdown-divider"></div>
                <button (click)="logout()" class="dropdown-item danger">
                  <svg class="dropdown-icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  {{ 'navigation.logout' | translate }}
                </button>
              </div>
            }
          </div>
        }
      </div>
    </header>

    <!-- Mobile Overlay -->
    @if (isSidebarOpen) {
      <div 
        class="sidebar-overlay" 
        (click)="closeSidebar()"
        @fadeIn>
      </div>
    }

    

    <!-- Sidebar -->
    <aside 
      class="sidebar" 
      [class.sidebar-open]="isSidebarOpen"
      [@slideIn]="isSidebarOpen ? 'open' : 'closed'">

      <!-- Navigation Links (Sidebar only) -->
      <div class="sidebar-content-wrapper">
        <nav class="sidebar-nav">
          <a routerLink="/dashboard"
             routerLinkActive="active"
             [routerLinkActiveOptions]="{exact: false}"
             class="nav-item"
             (click)="closeSidebarOnMobile()">
            <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v4H8V5z"></path>
            </svg>
            <span class="nav-text">{{ 'navigation.dashboard' | translate }}</span>
          </a>
          <a routerLink="/policies" 
           routerLinkActive="active" 
           [routerLinkActiveOptions]="{exact: false}"
           class="nav-item"
           (click)="closeSidebarOnMobile()">
            <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <span class="nav-text">{{ 'navigation.policies' | translate }}</span>
          </a>
          
          <a routerLink="/ai-assistant" 
           routerLinkActive="active" 
           [routerLinkActiveOptions]="{exact: false}"
           class="nav-item"
           (click)="closeSidebarOnMobile()">
            <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
            <span class="nav-text">{{ 'navigation.aiChat' | translate }}</span>
          </a>
          
          <a routerLink="/chat-history" 
           routerLinkActive="active" 
           [routerLinkActiveOptions]="{exact: false}"
           class="nav-item"
           (click)="closeSidebarOnMobile()">
            <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="nav-text">{{ 'navigation.chatHistory' | translate }}</span>
          </a>
          
          <a routerLink="/analytics" 
           routerLinkActive="active" 
           [routerLinkActiveOptions]="{exact: false}"
           class="nav-item"
           (click)="closeSidebarOnMobile()">
            <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
            <span class="nav-text">{{ 'navigation.analytics' | translate }}</span>
          </a>
          
          <a routerLink="/rewards" 
           routerLinkActive="active" 
           [routerLinkActiveOptions]="{exact: false}"
           class="nav-item"
           (click)="closeSidebarOnMobile()">
            <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A4 4 0 008 12v8m8-8a4 4 0 00-3.555-3.968m7.555 3.968a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="nav-text">{{ 'rewards.title' | translate }}</span>
          </a>
          
          <a routerLink="/notifications" 
           routerLinkActive="active" 
           [routerLinkActiveOptions]="{exact: false}"
           class="nav-item"
           (click)="closeSidebarOnMobile()">
            <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM4.828 7l2.586 2.586a2 2 0 002.828 0L15 5h-5V3a1 1 0 00-1-1H5a1 1 0 00-1 1v4a1 1 0 001 1h2.172z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <span class="nav-text">{{ 'navigation.notifications' | translate }}</span>
          </a>
        </nav>
      </div>

    </aside>

    <!-- Click outside to close dropdowns -->
    @if (isUserMenuOpen) {
      <div (click)="closeUserMenu()" class="dropdown-backdrop"></div>
    }
  `
})
export class HeaderComponent implements OnInit {
  currentUser$ = this.authService.currentUser$;
  isUserMenuOpen = false;
  isSidebarOpen = false;
  appName = environment.appName;
  appTagline = environment.appTagline;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Close menus when route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.closeAllMenus();
    });

    // Set initial sidebar state based on screen size
    this.checkScreenSize();
    window.addEventListener('resize', () => this.checkScreenSize());

    // Add global click handler to close dropdowns when clicking outside
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      // Only close user menu if clicking outside the profile area
      if (!target.closest('.topbar-profile')) {
        this.closeUserMenu();
      }
    });
  }

  private checkScreenSize(): void {
    if (window.innerWidth >= 1024) {
      // On desktop, sidebar should be visible (but we control this via CSS)
      this.isSidebarOpen = true;
    } else {
      // On mobile/tablet, sidebar closed by default
      this.isSidebarOpen = false;
    }
  }

  getUserInitials(user: User): string {
    const firstInitial = user.firstName?.charAt(0) || '';
    const lastInitial = user.lastName?.charAt(0) || '';
    return (firstInitial + lastInitial).toUpperCase();
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
    this.isUserMenuOpen = false;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  closeSidebarOnMobile(): void {
    // Only close on mobile/tablet
    if (window.innerWidth < 1024) {
      this.isSidebarOpen = false;
    }
  }

  toggleUserMenu(): void {
    console.log('Toggle user menu clicked, current state:', this.isUserMenuOpen);
    this.isUserMenuOpen = !this.isUserMenuOpen;
    console.log('New state:', this.isUserMenuOpen);
  }


  closeUserMenu(): void {
    this.isUserMenuOpen = false;
  }

  onProfileClick(): void {
    console.log('Profile clicked - navigating to profile page');
    this.closeUserMenu();
    // Navigate to profile page
    this.router.navigate(['/profile']).then(() => {
      console.log('Navigation to profile completed');
    }).catch((error) => {
      console.error('Navigation to profile failed:', error);
    });
  }

  closeAllMenus(): void {
    this.isUserMenuOpen = false;
    // Don't close sidebar on desktop when navigating
    if (window.innerWidth < 1024) {
      this.isSidebarOpen = false;
    }
  }

  logout(): void {
    console.log('Logout clicked - logging out user');
    try {
      this.authService.logout();
      this.closeAllMenus();
      console.log('Logout completed successfully');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }
}
