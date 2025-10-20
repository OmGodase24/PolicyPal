import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PolicyComparisonDocument = PolicyComparison & Document;

@Schema({ timestamps: true })
export class PolicyComparison {
  @Prop({ 
    type: Types.ObjectId, 
    ref: 'User', 
    required: true 
  })
  userId: Types.ObjectId;

  @Prop({ 
    type: [Types.ObjectId], 
    ref: 'Policy', 
    required: true,
    validate: {
      validator: function(policyIds: Types.ObjectId[]) {
        return policyIds.length === 2; // Only allow 2 policies for comparison
      },
      message: 'Policy comparison must include exactly 2 policies'
    }
  })
  policyIds: Types.ObjectId[];

  @Prop({ required: true })
  comparisonName: string;

  @Prop({ type: Object, required: true })
  comparisonData: {
    policy1: {
      id: string;
      title: string;
      description: string;
      content: string;
      status: string;
      hasPDF: boolean;
      pdfProcessed: boolean;
      aiSummary?: string;
      aiSummaryBrief?: string;
      aiSummaryStandard?: string;
      aiSummaryDetailed?: string;
      createdAt: Date;
      updatedAt: Date;
      publishedAt?: Date;
    };
    policy2: {
      id: string;
      title: string;
      description: string;
      content: string;
      status: string;
      hasPDF: boolean;
      pdfProcessed: boolean;
      aiSummary?: string;
      aiSummaryBrief?: string;
      aiSummaryStandard?: string;
      aiSummaryDetailed?: string;
      createdAt: Date;
      updatedAt: Date;
      publishedAt?: Date;
    };
  };

  @Prop({ type: Object, required: false })
  aiInsights?: {
    summary: string;
    keyDifferences: string[];
    recommendations: string[];
    coverageComparison?: {
      policy1: string[];
      policy2: string[];
    };
    costComparison?: {
      policy1: string;
      policy2: string;
    };
  };

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const PolicyComparisonSchema = SchemaFactory.createForClass(PolicyComparison);

// Index for efficient queries
PolicyComparisonSchema.index({ userId: 1, createdAt: -1 });
PolicyComparisonSchema.index({ userId: 1, isDeleted: 1 });
