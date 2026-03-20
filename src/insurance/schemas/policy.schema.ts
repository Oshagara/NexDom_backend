import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InsurancePolicyDocument = InsurancePolicy & Document;

export enum PolicyStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class InsurancePolicy {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'InsuranceProduct', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  premium: number;

  @Prop()
  startDate: Date;

  @Prop()
  endDate: Date;

  @Prop({ enum: Object.values(PolicyStatus), default: PolicyStatus.ACTIVE })
  status: PolicyStatus;
}

export const InsurancePolicySchema = SchemaFactory.createForClass(InsurancePolicy);
