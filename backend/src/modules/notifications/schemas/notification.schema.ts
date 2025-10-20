import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  POLICY_CREATED = 'policy_created',
  POLICY_UPDATED = 'policy_updated',
  POLICY_PUBLISHED = 'policy_published',
  POLICY_EXPIRING = 'policy_expiring',
  POLICY_EXPIRED = 'policy_expired',
  COMPLIANCE_CHECK_COMPLETED = 'compliance_check_completed',
  AI_CHAT_SESSION_STARTED = 'ai_chat_session_started',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  SECURITY_ALERT = 'security_alert',
  WELCOME = 'welcome'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  BOTH = 'both'
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  READ = 'read'
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, enum: NotificationType })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ required: true, enum: NotificationPriority, default: NotificationPriority.MEDIUM })
  priority: NotificationPriority;

  @Prop({ required: true, enum: NotificationChannel, default: NotificationChannel.BOTH })
  channel: NotificationChannel;

  @Prop({ required: true, enum: NotificationStatus, default: NotificationStatus.PENDING })
  status: NotificationStatus;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ type: Date })
  scheduledAt?: Date;

  @Prop({ type: Date })
  sentAt?: Date;

  @Prop({ type: Date })
  deliveredAt?: Date;

  @Prop({ type: Date })
  readAt?: Date;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ default: 0 })
  retryCount: number;

  @Prop()
  errorMessage?: string;

  // Timestamps
  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;

  // Related entity references
  @Prop()
  policyId?: string;

  @Prop()
  chatSessionId?: string;

  @Prop()
  complianceReportId?: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Indexes for better performance
NotificationSchema.index({ userId: 1, status: 1 });
NotificationSchema.index({ type: 1, priority: 1 });
NotificationSchema.index({ scheduledAt: 1 });
NotificationSchema.index({ createdAt: -1 });
