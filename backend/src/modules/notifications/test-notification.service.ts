import { Injectable } from '@nestjs/common';
import { NotificationsService } from './services/notifications.service';
import { NotificationType, NotificationPriority } from './schemas/notification.schema';

@Injectable()
export class TestNotificationService {
  constructor(private readonly notificationsService: NotificationsService) {}

  async testEmailNotification(userId: string, userEmail: string): Promise<void> {
    console.log('🧪 Testing email notification...');
    
    try {
      await this.notificationsService.createNotification({
        userId,
        type: NotificationType.WELCOME,
        title: 'Welcome to PolicyPal!',
        message: 'This is a test notification to verify email functionality.',
        priority: NotificationPriority.MEDIUM,
        metadata: {
          testMode: true,
          userEmail: userEmail
        }
      });
      
      console.log('✅ Test notification created successfully');
    } catch (error) {
      console.error('❌ Test notification failed:', error.message);
    }
  }

  async testInAppNotification(userId: string): Promise<void> {
    console.log('🧪 Testing in-app notification...');
    
    try {
      await this.notificationsService.createNotification({
        userId,
        type: NotificationType.POLICY_CREATED,
        title: 'Test Policy Created',
        message: 'This is a test in-app notification.',
        priority: NotificationPriority.LOW,
        channel: 'in_app' as any
      });
      
      console.log('✅ Test in-app notification created successfully');
    } catch (error) {
      console.error('❌ Test in-app notification failed:', error.message);
    }
  }
}
