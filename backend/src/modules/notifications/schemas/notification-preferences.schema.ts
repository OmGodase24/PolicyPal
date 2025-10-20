import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { NotificationType, NotificationChannel } from './notification.schema';

export type NotificationPreferencesDocument = NotificationPreferences & Document;

@Schema({ timestamps: true })
export class NotificationPreferences {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ default: true })
  emailEnabled: boolean;

  @Prop({ default: true })
  inAppEnabled: boolean;

  @Prop({ default: true })
  pushEnabled: boolean;

  // Per-type preferences
  @Prop({ 
    type: Map, 
    of: {
      email: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    default: new Map()
  })
  typePreferences: Map<NotificationType, {
    email: boolean;
    inApp: boolean;
    push: boolean;
  }>;

  // Email preferences
  @Prop({ default: 'immediate' })
  emailFrequency: 'immediate' | 'daily' | 'weekly' | 'never';

  @Prop({ default: '09:00' })
  emailTime: string;

  @Prop({ default: 'UTC' })
  timezone: string;

  // Quiet hours
  @Prop({ default: false })
  quietHoursEnabled: boolean;

  @Prop({ default: '22:00' })
  quietHoursStart: string;

  @Prop({ default: '08:00' })
  quietHoursEnd: string;

  // Language preferences
  @Prop({ default: 'en' })
  language: string;
}

export const NotificationPreferencesSchema = SchemaFactory.createForClass(NotificationPreferences);

// Index for user lookups
NotificationPreferencesSchema.index({ userId: 1 });
