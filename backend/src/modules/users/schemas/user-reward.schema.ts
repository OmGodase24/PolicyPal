import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserRewardDocument = UserReward & Document & { _id: Types.ObjectId };

@Schema({ timestamps: true })
export class UserReward {
  @Prop({ 
    type: Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  })
  userId: Types.ObjectId;

  @Prop({ required: true, default: 0 })
  totalPoints: number;

  @Prop({ required: true, default: 1 })
  level: number;

  @Prop({ required: true, default: 0 })
  currentLevelPoints: number;

  @Prop({ required: true, default: 50 })
  nextLevelPoints: number;

  @Prop({ type: [String], default: [] })
  badges: string[];

  @Prop({ required: true, default: 0 })
  currentStreak: number;

  @Prop({ required: true, default: 0 })
  longestStreak: number;

  @Prop()
  lastActivityDate: Date;

  @Prop({ type: Map, of: Number, default: {} })
  activityCounts: Map<string, number>;

  @Prop({ type: Map, of: Date, default: {} })
  lastActivityDates: Map<string, Date>;

  @Prop({ type: [String], default: [] })
  unlockedFeatures: string[];

  @Prop({ 
    type: {
      policiesCreated: { type: Number, default: 0 },
      policiesPublished: { type: Number, default: 0 },
      complianceChecks: { type: Number, default: 0 },
      aiInteractions: { type: Number, default: 0 },
      policyComparisons: { type: Number, default: 0 },
      dlpScans: { type: Number, default: 0 },
      privacyAssessments: { type: Number, default: 0 },
    },
    default: {
      policiesCreated: 0,
      policiesPublished: 0,
      complianceChecks: 0,
      aiInteractions: 0,
      policyComparisons: 0,
      dlpScans: 0,
      privacyAssessments: 0,
    }
  })
  achievements: {
    policiesCreated: number;
    policiesPublished: number;
    complianceChecks: number;
    aiInteractions: number;
    policyComparisons: number;
    dlpScans: number;
    privacyAssessments: number;
  };
}

export const UserRewardSchema = SchemaFactory.createForClass(UserReward);

// Add indexes for better performance
UserRewardSchema.index({ userId: 1 });
UserRewardSchema.index({ totalPoints: -1 });
UserRewardSchema.index({ level: -1 });
