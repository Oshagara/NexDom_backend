import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ required: true })
  action: string;

  @Prop({ required: true })
  performedBy: string; // adminId or email

  @Prop()
  target?: string; // target adminId/email/entity

  @Prop()
  details?: string;

  @Prop()
  ip?: string;

  @Prop({ default: 'success' })
  status: string; // success/failure
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog); 