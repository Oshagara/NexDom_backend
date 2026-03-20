import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LoanDocument = Loan & Document;

export enum LoanStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DISBURSED = 'disbursed',
  REPAID = 'repaid',
  DEFAULTED = 'defaulted',
}

@Schema({ timestamps: true })
export class Loan {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Property', required: false })
  propertyId?: Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop()
  purpose?: string;

  @Prop({ required: true })
  termMonths: number;

  @Prop({ required: true })
  interestRate: number; // annual percent

  @Prop({ required: true })
  monthlyRepayment: number;

  @Prop({ required: true, enum: Object.values(LoanStatus), default: LoanStatus.PENDING })
  status: LoanStatus;

  @Prop()
  disbursedAt?: Date;

  @Prop()
  repaidAt?: Date;

  @Prop({ default: false })
  escrowLinked?: boolean;
}

export const LoanSchema = SchemaFactory.createForClass(Loan);
