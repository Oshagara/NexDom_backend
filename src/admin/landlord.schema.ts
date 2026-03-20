import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LandlordDocument = Landlord & Document;

@Schema({ timestamps: true })
export class Landlord {
  @Prop({ required: true, unique: true })
  landlordId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string; // Hashed password

  @Prop()
  phone?: string;

  @Prop()
  address?: string;

  @Prop()
  city?: string;

  @Prop()
  state?: string;

  @Prop()
  zipCode?: string;

  @Prop()
  country?: string;

  @Prop()
  profilePicture?: string;

  @Prop()
  bio?: string;

  @Prop({ default: 'active' })
  status: string; // e.g., 'active', 'suspended', 'inactive'

  @Prop()
  lastLoginAt?: Date;

  @Prop()
  lastLoginIp?: string;

  @Prop()
  lastLoginUserAgent?: string;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: false })
  isBlocked: boolean;

  @Prop()
  verificationCode?: string;

  @Prop()
  verificationCodeExpires?: Date;

  @Prop({ default: 0 })
  resendCount: number;

  @Prop()
  resendCooldown?: Date;

  @Prop()
  resetPasswordToken?: string;

  @Prop()
  resetPasswordExpires?: Date;

  @Prop({ default: false })
  deleted?: boolean;

  @Prop()
  deletedAt?: Date;

  // Business information
  @Prop()
  businessName?: string;

  @Prop()
  taxId?: string;

  @Prop()
  licenseNumber?: string;

  // Preferences
  @Prop({ default: true })
  emailNotifications: boolean;

  @Prop({ default: true })
  smsNotifications: boolean;

  @Prop({ default: 'en' })
  language: string;

  @Prop({ default: 'USD' })
  currency: string;

  // Timestamps added by @Schema({ timestamps: true })
  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const LandlordSchema = SchemaFactory.createForClass(Landlord);

// Create indexes for efficient querying
LandlordSchema.index({ email: 1 });
LandlordSchema.index({ landlordId: 1 });
LandlordSchema.index({ status: 1 });
LandlordSchema.index({ isVerified: 1 });
LandlordSchema.index({ createdAt: -1 });