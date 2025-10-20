import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ThemeService, Theme } from '@core/services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button 
      (click)="toggleTheme()" 
      class="theme-toggle"
      [class]="'theme-toggle-' + currentTheme"
      [attr.aria-label]="'Switch to ' + (currentTheme === 'light' ? 'dark' : 'light') + ' mode'"
      title="Toggle theme">
      
      <!-- Sun Icon (Light Mode) -->
      <svg 
        *ngIf="currentTheme === 'light'" 
        class="theme-icon sun-icon" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24">
        <path 
          stroke-linecap="round" 
          stroke-linejoin="round" 
          stroke-width="2" 
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z">
        </path>
      </svg>
      
      <!-- Moon Icon (Dark Mode) -->
      <svg 
        *ngIf="currentTheme === 'dark'" 
        class="theme-icon moon-icon" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24">
        <path 
          stroke-linecap="round" 
          stroke-linejoin="round" 
          stroke-width="2" 
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z">
        </path>
      </svg>
      
      <!-- Toggle Switch Background -->
      <div class="toggle-switch">
        <div class="toggle-slider" [class.active]="currentTheme === 'dark'"></div>
      </div>
    </button>
  `,
  styles: [`
    .theme-toggle {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 60px;
      height: 32px;
      background: var(--toggle-bg, #f3f4f6);
      border: 2px solid var(--toggle-border, #e5e7eb);
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
    }

    .theme-toggle:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .theme-toggle:active {
      transform: scale(0.95);
    }

    .theme-icon {
      position: absolute;
      width: 18px;
      height: 18px;
      color: var(--toggle-icon-color, #6b7280);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 2;
    }

    .sun-icon {
      left: 8px;
      opacity: 1;
      transform: rotate(0deg) scale(1);
    }

    .moon-icon {
      right: 8px;
      opacity: 1;
      transform: rotate(0deg) scale(1);
    }

    .toggle-switch {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 24px;
      height: 24px;
      background: var(--toggle-slider-bg, #ffffff);
      border-radius: 50%;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .toggle-slider {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .toggle-slider.active {
      transform: translateX(28px);
    }

    /* Light Mode Styles */
    .theme-toggle-light {
      --toggle-bg: #f3f4f6;
      --toggle-border: #e5e7eb;
      --toggle-icon-color: #6b7280;
      --toggle-slider-bg: #ffffff;
    }

    /* Dark Mode Styles */
    .theme-toggle-dark {
      --toggle-bg: #374151;
      --toggle-border: #4b5563;
      --toggle-icon-color: #f9fafb;
      --toggle-slider-bg: #1f2937;
    }

    /* Dark mode global styles */
    :host-context(.dark) .theme-toggle {
      --toggle-bg: #374151;
      --toggle-border: #4b5563;
      --toggle-icon-color: #f9fafb;
      --toggle-slider-bg: #1f2937;
    }

    /* Animation for icon transitions */
    .theme-toggle-light .moon-icon {
      opacity: 0;
      transform: rotate(180deg) scale(0.8);
    }

    .theme-toggle-dark .sun-icon {
      opacity: 0;
      transform: rotate(180deg) scale(0.8);
    }

    /* Focus styles for accessibility */
    .theme-toggle:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
    }

    /* Mobile optimizations */
    @media (max-width: 640px) {
      .theme-toggle {
        width: 56px;
        height: 30px;
      }

      .theme-icon {
        width: 16px;
        height: 16px;
      }

      .sun-icon {
        left: 7px;
      }

      .moon-icon {
        right: 7px;
      }

      .toggle-switch {
        width: 22px;
        height: 22px;
      }

      .toggle-slider.active {
        transform: translateX(26px);
      }
    }
  `]
})
export class ThemeToggleComponent implements OnInit, OnDestroy {
  currentTheme: Theme = 'light';
  private destroy$ = new Subject<void>();

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    this.themeService.theme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => {
        this.currentTheme = theme;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
