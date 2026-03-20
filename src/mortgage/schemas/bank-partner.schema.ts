import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BankPartnerDocument = BankPartner & Document;

@Schema({ timestamps: true })
export class BankPartner {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  interestRate: number; // annual percent

  @Prop({ required: true })
  maxLTV: number; // percentage e.g., 70

  @Prop({ required: true })
  maxTermYears: number;

  @Prop({ required: true })
  minMonthlyIncome: number;

  @Prop()
  contactEmail?: string;
}

export const BankPartnerSchema = SchemaFactory.createForClass(BankPartner);
