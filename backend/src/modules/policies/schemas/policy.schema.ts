import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PolicyDocument = Policy & Document;

@Schema({ timestamps: true })
export class Policy {
  @Prop({ required: true })
  title: string;

  @Prop({ required: false, default: '' })
  description: string;

  @Prop({ required: false, default: '' })
  content: string;

  @Prop({ 
    type: Types.ObjectId, 
    ref: 'User', 
    required: true 
  })
  createdBy: Types.ObjectId;

  @Prop({ default: 'draft', enum: ['draft', 'publish'] })
  status: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: Date.now })
  publishedAt: Date;

  @Prop()
  expiryDate: Date;

  @Prop({ default: false })
  expiryDateEdited: boolean;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  // PDF-related fields
  @Prop({ default: false })
  hasPDF: boolean;

  @Prop({ default: false })
  pdfProcessed: boolean;

  @Prop()
  pdfFilename: string;

  @Prop()
  pdfSize: number;

  @Prop()
  pdfText: string;

  @Prop()
  pdfData: Buffer;

  @Prop()
  pdfEmbeddingsGenerated: boolean;

  // AI-related fields
  @Prop()
  aiSummary: string;

  @Prop()
  aiSummaryGeneratedAt: Date;

  // Multi-level AI summaries
  @Prop()
  aiSummaryBrief: string;

  @Prop()
  aiSummaryBriefGeneratedAt: Date;

  @Prop()
  aiSummaryStandard: string;

  @Prop()
  aiSummaryStandardGeneratedAt: Date;

  @Prop()
  aiSummaryDetailed: string;

  @Prop()
  aiSummaryDetailedGeneratedAt: Date;

  @Prop({ enum: ['brief', 'standard', 'detailed'], default: 'standard' })
  currentSummaryLevel: string;
}

export const PolicySchema = SchemaFactory.createForClass(Policy);