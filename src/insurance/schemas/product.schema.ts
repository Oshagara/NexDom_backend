import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InsuranceProductDocument = InsuranceProduct & Document;

@Schema({ timestamps: true })
export class InsuranceProduct {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  type: string; // 'tenant' | 'landlord' | 'developer'

  @Prop({ required: true })
  monthlyPremium: number;

  @Prop({ required: true })
  coverageAmount: number;

  @Prop({ type: [String], default: [] })
  features: string[];

  @Prop({ default: false })
  popular: boolean;
}

export const InsuranceProductSchema = SchemaFactory.createForClass(InsuranceProduct);
