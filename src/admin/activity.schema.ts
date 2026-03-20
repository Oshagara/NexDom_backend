import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ActivityDocument = Activity & Document;

@Schema({ timestamps: true })
export class Activity {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, enum: ['admin', 'superadmin', 'agent', 'landlord', 'tenant', 'user', 'guest'] })
  role: string;

  @Prop()
  email?: string;

  @Prop()
  name?: string;

  @Prop({ required: true })
  action: string; // e.g., 'login', 'create_property', 'update_profile'

  @Prop({ required: true })
  resource: string; // e.g., 'property', 'tenant', 'payment'

  @Prop()
  resourceId?: string; // ID of the resource being acted upon

  @Prop({ type: Object })
  metadata?: Record<string, any>; // Additional context data

  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;

  @Prop()
  sessionId?: string;

  @Prop({ default: Date.now })
  timestamp: Date;

  @Prop({ default: false })
  processed?: boolean; // For batch processing tracking

  // Non-repudiation fields
  @Prop()
  prevHash?: string; // Hash of previous activity in the chain (by user+role)

  @Prop()
  hash?: string; // Hash of this activity's canonical content + prevHash

  @Prop({ default: 'HMAC-SHA256' })
  hashAlgo?: string;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);

// Create indexes for efficient querying
ActivitySchema.index({ userId: 1, timestamp: -1 });
ActivitySchema.index({ role: 1, timestamp: -1 });
ActivitySchema.index({ action: 1, timestamp: -1 });
ActivitySchema.index({ resource: 1, timestamp: -1 });
ActivitySchema.index({ timestamp: -1 });