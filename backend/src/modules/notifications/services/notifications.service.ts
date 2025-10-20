import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { 
  Notification, 
  NotificationDocument, 
  NotificationType, 
  NotificationPriority, 
  NotificationChannel, 
  NotificationStatus 
} from '../schemas/notification.schema';
import { 
  NotificationPreferences, 
  NotificationPreferencesDocument 
} from '../schemas/notification-preferences.schema';
import { EmailService } from './email.service';
import { NotificationsGateway } from '../gateways/notifications.gateway';
import { UsersService } from '../../users/services/users.service';

export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  channel?: NotificationChannel;
  metadata?: Record<string, any>;
  scheduledAt?: Date;
  policyId?: string;
  chatSessionId?: string;
  complianceReportId?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(NotificationPreferences.name)
    private readonly preferencesModel: Model<NotificationPreferencesDocument>,
    private readonly emailService: EmailService,
    private readonly usersService: UsersService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async createNotification(createNotificationDto: CreateNotificationDto): Promise<NotificationDocument> {
    try {
      // Get user preferences
      const preferences = await this.getUserPreferences(createNotificationDto.userId);
      
      // Check if user wants this type of notification
      if (!this.shouldSendNotification(createNotificationDto.type, preferences)) {
        this.logger.log(`⏭️ Skipping notification for user ${createNotificationDto.userId} - preferences disabled`);
        return null;
      }

      // Create notification
      const notification = new this.notificationModel({
        ...createNotificationDto,
        status: NotificationStatus.PENDING,
      });

      const savedNotification = await notification.save();
      this.logger.log(`✅ Created notification ${savedNotification._id} for user ${createNotificationDto.userId}`);

      // Process notification immediately or schedule it
      if (createNotificationDto.scheduledAt && createNotificationDto.scheduledAt > new Date()) {
        this.logger.log(`⏰ Scheduled notification ${savedNotification._id} for ${createNotificationDto.scheduledAt}`);
      } else {
        this.logger.log(`🚀 Processing notification ${savedNotification._id} immediately`);
        await this.processNotification(savedNotification);
      }

      return savedNotification;

    } catch (error) {
      this.logger.error(`❌ Failed to create notification: ${error.message}`);
      throw error;
    }
  }

  async processNotification(notification: NotificationDocument): Promise<void> {
    try {
      this.logger.log(`🔄 Processing notification ${notification._id} for user ${notification.userId}`);
      
      const preferences = await this.getUserPreferences(notification.userId);
      this.logger.log(`📋 User preferences: emailEnabled=${preferences.emailEnabled}, inAppEnabled=${preferences.inAppEnabled}`);
      
      // Send in-app notification
      if (this.shouldSendInApp(notification.type, preferences)) {
        this.logger.log(`📱 Sending in-app notification for ${notification.type}`);
        await this.sendInAppNotification(notification);
      } else {
        this.logger.log(`⏭️ Skipping in-app notification for ${notification.type}`);
      }

      // Send email notification
      if (this.shouldSendEmail(notification.type, preferences)) {
        this.logger.log(`📧 Sending email notification for ${notification.type}`);
        await this.sendEmailNotification(notification);
      } else {
        this.logger.log(`⏭️ Skipping email notification for ${notification.type}`);
      }

      // Update notification status
      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
      await notification.save();

      this.logger.log(`✅ Successfully processed notification ${notification._id}`);

    } catch (error) {
      this.logger.error(`❌ Failed to process notification ${notification._id}: ${error.message}`);
      
      // Update notification status to failed
      notification.status = NotificationStatus.FAILED;
      notification.errorMessage = error.message;
      notification.retryCount += 1;
      await notification.save();
    }
  }

  private async sendInAppNotification(notification: NotificationDocument): Promise<void> {
    try {
      // Send real-time notification via WebSocket
      this.notificationsGateway.sendToUserRoom(notification.userId, {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        metadata: notification.metadata,
        createdAt: notification.createdAt || new Date(),
        isRead: false,
      });

      this.logger.log(`📱 Sent in-app notification to user ${notification.userId}`);

    } catch (error) {
      this.logger.error(`❌ Failed to send in-app notification: ${error.message}`);
      throw error;
    }
  }

  private async sendEmailNotification(notification: NotificationDocument): Promise<void> {
    try {
      // Get user data for email template
      const userData = await this.getUserData(notification.userId);
      
      // Send email
      const emailSent = await this.emailService.sendNotificationEmail(
        userData.email,
        notification,
        userData
      );

      if (emailSent) {
        notification.deliveredAt = new Date();
        this.logger.log(`📧 Email sent to user ${notification.userId}`);
      } else {
        throw new Error('Email sending failed');
      }

    } catch (error) {
      this.logger.error(`❌ Failed to send email notification: ${error.message}`);
      throw error;
    }
  }

  async getUserNotifications(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    unreadOnly: boolean = false
  ): Promise<Notification[]> {
    const query: any = { userId };
    
    if (unreadOnly) {
      query.isRead = false;
    }

    return this.notificationModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .exec();
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.notificationModel.updateOne(
        { _id: notificationId, userId },
        { 
          isRead: true, 
          readAt: new Date(),
          status: NotificationStatus.READ 
        }
      );

      if (result.modifiedCount > 0) {
        this.logger.log(`✅ Marked notification ${notificationId} as read for user ${userId}`);
        return true;
      }

      return false;

    } catch (error) {
      this.logger.error(`❌ Failed to mark notification as read: ${error.message}`);
      return false;
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<number> {
    try {
      const result = await this.notificationModel.updateMany(
        { userId, isRead: false },
        { 
          isRead: true, 
          readAt: new Date(),
          status: NotificationStatus.READ 
        }
      );

      this.logger.log(`✅ Marked ${result.modifiedCount} notifications as read for user ${userId}`);
      return result.modifiedCount;

    } catch (error) {
      this.logger.error(`❌ Failed to mark all notifications as read: ${error.message}`);
      return 0;
    }
  }

  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.notificationModel.deleteOne({
        _id: notificationId,
        userId: userId
      });

      if (result.deletedCount === 0) {
        this.logger.warn(`⚠️ Notification ${notificationId} not found for user ${userId}`);
        return false;
      }

      this.logger.log(`🗑️ Deleted notification ${notificationId} for user ${userId}`);
      return true;

    } catch (error) {
      this.logger.error(`❌ Failed to delete notification ${notificationId}: ${error.message}`);
      return false;
    }
  }

  async deleteAllNotifications(userId: string): Promise<number> {
    try {
      const result = await this.notificationModel.deleteMany({ userId });

      this.logger.log(`🗑️ Deleted ${result.deletedCount} notifications for user ${userId}`);
      return result.deletedCount;

    } catch (error) {
      this.logger.error(`❌ Failed to delete all notifications for user ${userId}: ${error.message}`);
      return 0;
    }
  }

  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    let preferences = await this.preferencesModel.findOne({ userId }).exec();
    
    if (!preferences) {
      // Create default preferences
      preferences = new this.preferencesModel({
        userId,
        emailEnabled: true,
        inAppEnabled: true,
        pushEnabled: true,
        typePreferences: new Map(),
        emailFrequency: 'immediate',
        emailTime: '09:00',
        timezone: 'UTC',
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        language: 'en',
      });
      
      await preferences.save();
      this.logger.log(`✅ Created default preferences for user ${userId}`);
    }

    return preferences;
  }

  async updateUserPreferences(
    userId: string, 
    preferences: any
  ): Promise<NotificationPreferences> {
    try {
      // Convert typePreferences from Record to Map if needed
      if (preferences.typePreferences && !(preferences.typePreferences instanceof Map)) {
        const typePrefsMap = new Map();
        Object.entries(preferences.typePreferences).forEach(([key, value]) => {
          typePrefsMap.set(key, value);
        });
        preferences.typePreferences = typePrefsMap;
      }

      const updatedPreferences = await this.preferencesModel.findOneAndUpdate(
        { userId },
        preferences,
        { new: true, upsert: true }
      );

      this.logger.log(`✅ Updated preferences for user ${userId}`);
      return updatedPreferences;

    } catch (error) {
      this.logger.error(`❌ Failed to update preferences: ${error.message}`);
      throw error;
    }
  }

  // Scheduled job to process pending notifications
  @Cron(CronExpression.EVERY_MINUTE)
  async processPendingNotifications(): Promise<void> {
    try {
      const pendingNotifications = await this.notificationModel.find({
        status: NotificationStatus.PENDING,
        $or: [
          { scheduledAt: { $lte: new Date() } },
          { scheduledAt: { $exists: false } }
        ]
      }).exec();

      for (const notification of pendingNotifications) {
        await this.processNotification(notification);
      }

      if (pendingNotifications.length > 0) {
        this.logger.log(`⏰ Processed ${pendingNotifications.length} pending notifications`);
      }

    } catch (error) {
      this.logger.error(`❌ Failed to process pending notifications: ${error.message}`);
    }
  }

  // Helper methods
  private shouldSendNotification(type: NotificationType, preferences: NotificationPreferences): boolean {
    const typePref = preferences.typePreferences.get(type);
    return typePref ? (typePref.email || typePref.inApp || typePref.push) : true;
  }

  private shouldSendInApp(type: NotificationType, preferences: NotificationPreferences): boolean {
    if (!preferences.inAppEnabled) return false;
    const typePref = preferences.typePreferences.get(type);
    return typePref ? typePref.inApp : true;
  }

  private shouldSendEmail(type: NotificationType, preferences: NotificationPreferences): boolean {
    if (!preferences.emailEnabled) return false;
    const typePref = preferences.typePreferences.get(type);
    return typePref ? typePref.email : true;
  }

  private async getUserData(userId: string): Promise<any> {
    try {
      const user = await this.usersService.findOne(userId);
      return {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch user data for ${userId}: ${error.message}`);
      // Fallback to mock data if user not found
      return {
        id: userId,
        email: `user${userId}@example.com`,
        firstName: 'User',
        lastName: 'Name',
      };
    }
  }

  // Notification creation helpers for common scenarios
  async notifyPolicyCreated(userId: string, policyId: string, policyTitle: string): Promise<void> {
    await this.createNotification({
      userId,
      type: NotificationType.POLICY_CREATED,
      title: 'New Policy Created',
      message: `Your policy "${policyTitle}" has been created successfully.`,
      priority: NotificationPriority.MEDIUM,
      metadata: { policyId, policyTitle },
      policyId,
    });
  }

  async notifyPolicyExpiring(userId: string, policyId: string, policyTitle: string, daysUntilExpiry: number): Promise<void> {
    await this.createNotification({
      userId,
      type: NotificationType.POLICY_EXPIRING,
      title: 'Policy Expiring Soon',
      message: `Your policy "${policyTitle}" will expire in ${daysUntilExpiry} days.`,
      priority: NotificationPriority.HIGH,
      metadata: { policyId, policyTitle, daysUntilExpiry },
      policyId,
    });
  }

  async notifyComplianceCompleted(userId: string, policyId: string, complianceScore: number): Promise<void> {
    await this.createNotification({
      userId,
      type: NotificationType.COMPLIANCE_CHECK_COMPLETED,
      title: 'Compliance Check Completed',
      message: `Compliance check completed with a score of ${complianceScore}%.`,
      priority: NotificationPriority.MEDIUM,
      metadata: { policyId, complianceScore },
      policyId,
    });
  }
}
