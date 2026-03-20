import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EscrowDocument = Escrow & Document;

export type EscrowStatus =
  | 'pending_payment' // Created, awaiting payment
  | 'initiated' // Payment in progress / redirect sent
  | 'held' // Funds received and held
  | 'released' // Funds sent to seller
  | 'refunded' // Funds returned to buyer
  | 'failed' // Payment failed
  | 'cancelled' // Cancelled before payment
  | 'expired'; // Payment link/session expired

export type EscrowPurpose =
  | 'rent_deposit' // Security deposit
  | 'rent_advance' // Rent payment (advance)
  | 'property_purchase' // Down payment / purchase
  | 'shortlet' // Short-term rental
  | 'other';

@Schema({ timestamps: true })
export class Escrow {
  @Prop({ required: true })
  buyerId: string; // Tenant / buyer (User ref)

  @Prop({ required: true })
  sellerId: string; // Landlord / agent (User ref)

  @Prop({ required: true })
  propertyId: string;

  @Prop()
  tenantId?: string; // Optional: distinct tenant ref for rental escrows

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, default: 'NGN' })
  currency: string;

  @Prop({ required: true, unique: true })
  referenceId: string; // Ties to Flutterwave charge / tx_ref

  @Prop({
    required: true,
    enum: ['pending_payment', 'initiated', 'held', 'released', 'refunded', 'failed', 'cancelled', 'expired'],
    default: 'initiated',
  })
  status: EscrowStatus;

  @Prop({ enum: ['rent_deposit', 'rent_advance', 'property_purchase', 'shortlet', 'other'], default: 'other' })
  purpose?: EscrowPurpose;

  @Prop()
  rentPeriodStart?: Date; // For rent_advance / rent_deposit

  @Prop()
  rentPeriodEnd?: Date;

  @Prop()
  heldAt?: Date; // When funds confirmed held

  @Prop()
  releasedAt?: Date;

  @Prop()
  refundedAt?: Date;

  @Prop()
  expiresAt?: Date; // Payment link/session expiry

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const EscrowSchema = SchemaFactory.createForClass(Escrow);

