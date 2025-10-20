import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as bcrypt from 'bcryptjs';

export interface UserDocument extends User, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

@Schema({
  timestamps: true,
  toJSON: {
    transform: function (doc, ret) {
      delete ret.password;
      return ret;
    },
  },
})
export class User {
  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true })
  password: string;

  // Removed role field - everyone is just a user

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastLoginAt: Date;

  @Prop()
  lastNameChangeAt: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  // Reward system fields
  @Prop({ default: 0 })
  totalPoints: number;

  @Prop({ default: 1 })
  level: number;

  @Prop({ type: [String], default: [] })
  badges: string[];

  @Prop({ default: 0 })
  currentStreak: number;

  @Prop({ default: 0 })
  longestStreak: number;

  @Prop({ type: [String], default: [] })
  unlockedFeatures: string[];

  // Password reset fields
  @Prop()
  passwordResetToken?: string;

  @Prop()
  passwordResetExpires?: Date;

  @Prop({ default: 0 })
  passwordResetAttempts: number;

  @Prop()
  lastPasswordResetAt?: Date;

  // Tracks in-profile password change throttling separately from forgot-password resets
  @Prop()
  lastProfilePasswordChangeAt?: Date;

  // MFA fields
  @Prop({ type: Object, default: {} })
  mfa: {
    enabled: boolean;
    secretEncrypted?: string;
    backupCodesHash?: string[];
    fallback: boolean;
  };

}

export const UserSchema = SchemaFactory.createForClass(User);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};