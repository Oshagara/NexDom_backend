import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum NotificationType {
  RENT_DUE = 'rent_due',
  RENT_PAID = 'rent_paid',
  MAINTENANCE_UPDATE = 'maintenance_update',
  LEASE_EXPIRY = 'lease_expiry',
  ESCROW_UPDATE = 'escrow_update',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  KYC_VERIFIED = 'kyc_verified',
  SYSTEM = 'system',
  NEW_MESSAGE = 'new_message',
}

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: Object.values(NotificationType) })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop({ default: false, index: true })
  read: boolean;

  @Prop()
  readAt?: Date;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  @Prop()
  actionUrl?: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

