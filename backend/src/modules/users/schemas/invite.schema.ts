import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InviteDocument = Invite & Document;

@Schema({ timestamps: true })
export class Invite {
  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true, ref: 'User' })
  invitedBy: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  used: boolean;

  @Prop()
  usedAt?: Date;

  @Prop({ ref: 'User' })
  usedBy?: string;

  @Prop({ default: 'pending' })
  status: 'pending' | 'used' | 'expired' | 'cancelled';

  @Prop()
  message?: string; // Optional: custom message from inviter
}

export const InviteSchema = SchemaFactory.createForClass(Invite);

// Add indexes for better performance
InviteSchema.index({ token: 1 });
InviteSchema.index({ email: 1 });
InviteSchema.index({ invitedBy: 1 });
InviteSchema.index({ expiresAt: 1 });
InviteSchema.index({ status: 1 });
