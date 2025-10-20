import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { MobileService } from '@core/services/mobile.service';

@Component({
  selector: 'app-offline-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="offline-container">
      <div class="offline-content">
        <!-- Offline Icon -->
        <div class="offline-icon">
          <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z"></path>
          </svg>
        </div>

        <!-- Offline Message -->
        <div class="offline-message">
          <h1 class="offline-title">You're Offline</h1>
          <p class="offline-description">
            It looks like you're not connected to the internet. 
            Don't worry, you can still access your cached policies and continue working.
          </p>
        </div>

        <!-- Offline Features -->
        <div class="offline-features">
          <div class="feature-item">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <span>View cached policies</span>
          </div>
          
          <div class="feature-item">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
            <span>Read AI summaries</span>
          </div>
          
          <div class="feature-item">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            <span>Create new policies</span>
          </div>
        </div>

        <!-- Connection Status -->
        <div class="connection-status" [class.online]="isOnline">
          <div class="status-indicator">
            <div class="status-dot"></div>
            <span class="status-text">{{ isOnline ? 'Back Online' : 'Still Offline' }}</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="offline-actions">
          <button 
            class="action-btn primary"
            (click)="goToDashboard()"
            [disabled]="!isOnline">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v4H8V5z"></path>
            </svg>
            Go to Dashboard
          </button>

          <button 
            class="action-btn secondary"
            (click)="retryConnection()">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Retry Connection
          </button>
        </div>

        <!-- Sync Status -->
        <div class="sync-status" *ngIf="pendingSync">
          <div class="sync-indicator">
            <div class="sync-spinner"></div>
            <span>Syncing changes when online...</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .offline-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      background: var(--color-bg-primary);
    }

    .offline-content {
      max-width: 500px;
      text-align: center;
      background: var(--color-bg-secondary);
      border-radius: 16px;
      padding: 3rem 2rem;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      border: 1px solid var(--color-border-primary);
    }

    .offline-icon {
      color: var(--color-text-secondary);
      margin-bottom: 2rem;
    }

    .offline-title {
      font-size: 2rem;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 1rem 0;
    }

    .offline-description {
      font-size: 1.1rem;
      color: var(--color-text-secondary);
      line-height: 1.6;
      margin: 0 0 2rem 0;
    }

    .offline-features {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: var(--color-bg-primary);
      border-radius: 12px;
      border: 1px solid var(--color-border-primary);
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.95rem;
      color: var(--color-text-secondary);
    }

    .connection-status {
      margin-bottom: 2rem;
      padding: 1rem;
      border-radius: 8px;
      background: #fef2f2;
      border: 1px solid #fecaca;
    }

    .connection-status.online {
      background: #f0fdf4;
      border-color: #bbf7d0;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
      animation: pulse 2s infinite;
    }

    .connection-status.online .status-dot {
      background: #10b981;
    }

    .status-text {
      font-weight: 500;
      color: #374151;
    }

    .offline-actions {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid transparent;
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
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      border-color: var(--color-border-primary);
    }

    .action-btn.secondary:hover {
      background: var(--color-bg-tertiary);
      border-color: var(--color-primary);
    }

    .sync-status {
      margin-top: 1.5rem;
      padding: 1rem;
      background: var(--color-bg-primary);
      border-radius: 8px;
      border: 1px solid var(--color-border-primary);
    }

    .sync-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-size: 0.9rem;
      color: var(--color-text-secondary);
    }

    .sync-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid var(--color-border-primary);
      border-top: 2px solid var(--color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    /* Dark mode */
    .dark .offline-content {
      background: var(--color-bg-secondary);
      border-color: var(--color-border-primary);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    }

    .dark .offline-features {
      background: var(--color-bg-primary);
      border-color: var(--color-border-primary);
    }

    .dark .connection-status {
      background: #1f2937;
      border-color: #374151;
    }

    .dark .connection-status.online {
      background: #064e3b;
      border-color: #065f46;
    }

    .dark .sync-status {
      background: var(--color-bg-primary);
      border-color: var(--color-border-primary);
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .offline-container {
        padding: 1rem;
      }

      .offline-content {
        padding: 2rem 1.5rem;
      }

      .offline-title {
        font-size: 1.75rem;
      }

      .offline-description {
        font-size: 1rem;
      }

      .offline-actions {
        gap: 0.75rem;
      }

      .action-btn {
        padding: 0.875rem 1.25rem;
      }
    }
  `]
})
export class OfflinePageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  isOnline = false;
  pendingSync = false;

  constructor(
    private mobileService: MobileService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.mobileService.isOnline$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isOnline => {
        this.isOnline = isOnline;
        
        if (isOnline) {
          // Add haptic feedback when back online
          this.mobileService.vibrate([50, 30, 50]);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goToDashboard(): void {
    if (this.isOnline) {
      this.router.navigate(['/dashboard']);
    }
  }

  retryConnection(): void {
    // Add haptic feedback
    this.mobileService.vibrate(50);
    
    // Force a network check
    window.location.reload();
  }
}
