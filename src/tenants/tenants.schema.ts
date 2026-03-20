import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TenantDocument = Tenant & Document;

export type LeaseStatus = 'active' | 'pending' | 'expired' | 'terminated';
export type AutoPayMethod = 'card' | 'bank_transfer' | 'wallet';

@Schema({ timestamps: true })
export class Tenant {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ default: 'tenant' })
  role: string;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop()
  verificationToken: string;

  // Link to User when tenant has an account
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Property' })
  propertyId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  landlordId?: Types.ObjectId;

  // Lease fields
  @Prop()
  leaseStart?: Date;

  @Prop()
  leaseEnd?: Date;

  @Prop()
  rentAmount?: number;

  @Prop({ default: 'NGN' })
  rentCurrency?: string;

  @Prop()
  depositAmount?: number;

  @Prop({ default: 'active', enum: ['active', 'pending', 'expired', 'terminated'] })
  leaseStatus?: LeaseStatus;

  // Auto-pay
  @Prop({ default: false })
  autoPayEnabled?: boolean;

  @Prop({ enum: ['card', 'bank_transfer', 'wallet'] })
  autoPayMethod?: AutoPayMethod;

  // Income & affordability (for tenant onboarding / verification)
  @Prop()
  monthlyIncome?: number;

  @Prop()
  maxRentBudget?: number; // Max rent tenant can afford (affordability cap)

  @Prop({ min: 0, max: 100 })
  affordabilityRatio?: number; // e.g. 30 = max 30% of income for rent
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);
