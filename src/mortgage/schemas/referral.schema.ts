import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MortgageReferralDocument = MortgageReferral & Document;

export enum ReferralStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true })
export class MortgageReferral {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BankPartner', required: true })
  bankPartnerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Property' })
  propertyId?: Types.ObjectId;

  @Prop({ required: true })
  propertyValue: number;

  @Prop({ required: true })
  income: number;

  @Prop({ required: true })
  loanAmount: number;

  @Prop({ enum: Object.values(ReferralStatus), default: ReferralStatus.PENDING })
  status: ReferralStatus;
}

export const MortgageReferralSchema = SchemaFactory.createForClass(MortgageReferral);
