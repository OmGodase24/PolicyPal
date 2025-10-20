import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BadgeDocument = Badge & Document & { _id: Types.ObjectId };

@Schema({ timestamps: true })
export class Badge {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  icon: string;

  @Prop({ required: true })
  category: 'milestone' | 'streak' | 'feature' | 'special';

  @Prop({ 
    type: {
      activityType: { type: String, required: true },
      count: { type: Number, required: true },
      timeframe: { type: String, required: false }
    }
  })
  requirement: {
    activityType: string;
    count: number;
    timeframe?: string; // 'daily', 'weekly', 'monthly', 'all-time'
  };

  @Prop({ required: true, default: 10 })
  pointsReward: number;

  @Prop({ type: [String], default: [] })
  unlocksFeatures: string[];

  @Prop({ default: false })
  isHidden: boolean; // Hidden until unlocked

  @Prop({ default: true })
  isActive: boolean;
}

export const BadgeSchema = SchemaFactory.createForClass(Badge);

// Add indexes
BadgeSchema.index({ id: 1 });
BadgeSchema.index({ category: 1 });
BadgeSchema.index({ isActive: 1 });
