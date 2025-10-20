import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ActivityLogDocument = ActivityLog & Document & { _id: Types.ObjectId };

@Schema({ timestamps: true })
export class ActivityLog {
  @Prop({ 
    type: Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  })
  userId: Types.ObjectId;

  @Prop({ required: true })
  activityType: string;

  @Prop({ required: true })
  activityName: string;

  @Prop({ required: true, default: 0 })
  pointsEarned: number;

  @Prop({ 
    type: {
      policyId: { type: String, required: false },
      policyTitle: { type: String, required: false },
      comparisonId: { type: String, required: false },
      complianceScore: { type: Number, required: false },
      aiInteractionType: { type: String, required: false },
      dlpRiskLevel: { type: String, required: false }
    },
    default: {}
  })
  metadata: {
    policyId?: string;
    policyTitle?: string;
    comparisonId?: string;
    complianceScore?: number;
    aiInteractionType?: string;
    dlpRiskLevel?: string;
    [key: string]: any;
  };

  @Prop({ type: [String], default: [] })
  badgesEarned: string[];

  @Prop({ type: [String], default: [] })
  featuresUnlocked: string[];

  @Prop({ required: true, default: Date.now })
  activityDate: Date;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);

// Add indexes for better performance
ActivityLogSchema.index({ userId: 1, activityDate: -1 });
ActivityLogSchema.index({ activityType: 1 });
ActivityLogSchema.index({ activityDate: -1 });
