import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TransactionDocument = Transaction & Document;

export type TransactionType = 'fund' | 'withdraw' | 'property-payment';
export type TransactionStatus = 'pending' | 'successful' | 'failed';

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, enum: ['fund', 'withdraw', 'property-payment'] })
  type: TransactionType;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, default: 'NGN' })
  currency: string;

  @Prop({ required: true, enum: ['pending', 'successful', 'failed'], default: 'pending' })
  status: TransactionStatus;

  @Prop({ required: true, unique: true })
  referenceId: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

