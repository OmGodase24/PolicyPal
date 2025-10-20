import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChatHistoryDocument = ChatHistory & Document;

@Schema({ timestamps: true })
export class ChatHistory {
  @Prop({ 
    type: Types.ObjectId, 
    ref: 'Policy', 
    required: true 
  })
  policyId: Types.ObjectId;

  @Prop({ 
    type: Types.ObjectId, 
    ref: 'User', 
    required: true 
  })
  userId: Types.ObjectId;

  @Prop({ required: true })
  sessionId: string;

  @Prop({ required: true })
  question: string;

  @Prop({ required: true })
  answer: string;

  @Prop({ type: Number, min: 0, max: 1 })
  confidence?: number;

  @Prop({ type: [Object] })
  sources?: any[];

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ChatHistorySchema = SchemaFactory.createForClass(ChatHistory);

// Create compound index for efficient querying
ChatHistorySchema.index({ policyId: 1, userId: 1, sessionId: 1 });
ChatHistorySchema.index({ userId: 1, createdAt: -1 });
