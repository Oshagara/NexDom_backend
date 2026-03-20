import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PaymentLogDocument = PaymentLog & Document;

@Schema({ timestamps: true })
export class PaymentLog {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ required: true })
  status: string; // e.g., 'success', 'failed', 'pending', 'refunded'

  @Prop({ required: true })
  method: string; // e.g., 'card', 'bank', 'wallet'

  @Prop({ required: false })
  reference?: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: false })
  error?: string;
}

export const PaymentLogSchema = SchemaFactory.createForClass(PaymentLog);
