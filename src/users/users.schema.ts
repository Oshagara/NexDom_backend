import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

export type UserTier = 'Starter' | 'Professional' | 'Enterprise';
export type UserStatus = 'active' | 'pending' | 'suspended';

@Schema({ timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } })
export class User {
  @Prop()
  userId: string;

  @Prop()
  name: string;

  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  @Prop({ unique: true })
  email: string;

  @Prop()
  phone?: string;

  @Prop({ type: String, required: true, select: false })
  password: string;

  @Prop({ default: 'user' })
  role: string;

  @Prop({ type: String })
  verificationCode?: string;

  @Prop({ type: Date })
  verificationCodeExpires?: Date;

  @Prop({ default: 0 })
  resendCount: number;

  @Prop({ default: undefined })
  resendCooldown?: Date;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: false })
  isBlocked: boolean;

  @Prop({ default: 'Starter', enum: ['Starter', 'Professional', 'Enterprise'] })
  tier: UserTier;

  @Prop({ default: 'active', enum: ['active', 'pending', 'suspended'] })
  status: UserStatus;

  @Prop()
  dateOfBirth?: Date;

  @Prop()
  stateOfOrigin?: string;

  @Prop()
  address?: string;

  @Prop()
  lastLoginAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  invitedByAdminId?: Types.ObjectId;

  @Prop()
  agencyName?: string;

  @Prop()
  profilePictureUrl?: string;

  @Prop()
  bio?: string;

  @Prop()
  agentId?: string;
}

export const UsersSchema = SchemaFactory.createForClass(User);

// Virtual: initials for avatar display
UsersSchema.virtual('avatarInitials').get(function (this: User & { email?: string }) {
  if (this.firstName && this.lastName) {
    return `${(this.firstName || '').charAt(0)}${(this.lastName || '').charAt(0)}`.toUpperCase();
  }
  if (this.name && typeof this.name === 'string') {
    const parts = this.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return (this.name as string).substring(0, 2).toUpperCase();
  }
  return (this.email || 'U').substring(0, 2).toUpperCase();
});