import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  
  showSuccess(message: string, duration: number = 3000): void {
    this.showNotification(message, 'success', duration);
  }

  showError(message: string, duration: number = 5000): void {
    this.showNotification(message, 'error', duration);
  }

  showInfo(message: string, duration: number = 3000): void {
    this.showNotification(message, 'info', duration);
  }

  showWarning(message: string, duration: number = 4000): void {
    this.showNotification(message, 'warning', duration);
  }

  // Policy-specific notifications
  showPolicyCreated(policyTitle: string): void {
    this.showNotification(
      `🎉 New policy "${policyTitle}" created successfully!`,
      'success',
      4000
    );
  }

  showPolicyPublished(policyTitle: string): void {
    this.showNotification(
      `📢 Policy "${policyTitle}" has been published and is now live!`,
      'success',
      5000
    );
  }

  showPolicyUpdated(policyTitle: string): void {
    this.showNotification(
      `✏️ Policy "${policyTitle}" has been updated successfully!`,
      'info',
      3000
    );
  }

  showPolicyDeleted(policyTitle: string): void {
    this.showNotification(
      `🗑️ Policy "${policyTitle}" has been deleted`,
      'warning',
      4000
    );
  }

  showPolicyAIProcessed(policyTitle: string): void {
    this.showNotification(
      `🤖 Policy "${policyTitle}" is now AI-ready! You can start chatting about it.`,
      'success',
      5000
    );
  }

  showPolicyAIProcessing(policyTitle: string): void {
    this.showNotification(
      `⚙️ Policy "${policyTitle}" is being processed by AI... This may take a few minutes.`,
      'info',
      6000
    );
  }

  showPolicyAIError(policyTitle: string): void {
    this.showNotification(
      `❌ AI processing failed for "${policyTitle}". Please try reprocessing.`,
      'error',
      6000
    );
  }

  showPolicyPDFUploaded(policyTitle: string): void {
    this.showNotification(
      `📄 PDF uploaded for "${policyTitle}". AI processing will begin shortly.`,
      'info',
      4000
    );
  }

  showPolicyPDFReplaced(policyTitle: string): void {
    this.showNotification(
      `🔄 PDF replaced for "${policyTitle}". AI will reprocess the new document.`,
      'info',
      4000
    );
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info' | 'warning', duration: number): void {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = this.getNotificationClasses(type);
    notification.innerHTML = `
      <div class="flex items-center">
        <div class="flex-shrink-0">
          ${this.getIcon(type)}
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium">${message}</p>
        </div>
        <div class="ml-auto pl-3">
          <button type="button" class="inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2" onclick="this.parentElement.parentElement.remove()">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    `;

    container.appendChild(notification);

    // Auto remove after duration
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, duration);

    // Add entrance animation
    setTimeout(() => {
      notification.classList.add('translate-x-0', 'opacity-100');
      notification.classList.remove('translate-x-full', 'opacity-0');
    }, 10);
  }

  private getNotificationClasses(type: string): string {
    const baseClasses = 'max-w-sm w-full shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden transform transition-all duration-300 ease-in-out translate-x-full opacity-0';
    
    switch (type) {
      case 'success':
        return `${baseClasses} bg-success-50 ring-success-200 text-success-800`;
      case 'error':
        return `${baseClasses} bg-danger-50 ring-danger-200 text-danger-800`;
      case 'warning':
        return `${baseClasses} bg-warning-50 ring-warning-200 text-warning-800`;
      case 'info':
      default:
        return `${baseClasses} bg-primary-50 ring-primary-200 text-primary-800`;
    }
  }

  private getIcon(type: string): string {
    const iconClasses = 'h-5 w-5';
    
    switch (type) {
      case 'success':
        return `<svg class="${iconClasses} text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
      case 'error':
        return `<svg class="${iconClasses} text-danger-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
      case 'warning':
        return `<svg class="${iconClasses} text-warning-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>`;
      case 'info':
      default:
        return `<svg class="${iconClasses} text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    }
  }
}
