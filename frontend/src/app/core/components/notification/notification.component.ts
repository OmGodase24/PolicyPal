import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Notification container for toast messages -->
    <div id="notification-container" class="fixed bottom-4 right-4 z-50 space-y-2">
      <!-- Notifications will be dynamically inserted here -->
    </div>
  `
})
export class NotificationComponent {}
