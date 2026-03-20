import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InsuranceClaimDocument = InsuranceClaim & Document;

export enum ClaimStatus {
  OPEN = 'open',
  ASSESSED = 'assessed',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PAID = 'paid',
}

@Schema({ timestamps: true })
export class InsuranceClaim {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'InsurancePolicy', required: true })
  policyId: Types.ObjectId;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ enum: Object.values(ClaimStatus), default: ClaimStatus.OPEN })
  status: ClaimStatus;

  @Prop({ type: [String], default: [] })
  evidenceFiles?: string[];
}

export const InsuranceClaimSchema = SchemaFactory.createForClass(InsuranceClaim);
