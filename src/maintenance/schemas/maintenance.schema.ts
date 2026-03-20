import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MaintenanceRequestDocument = MaintenanceRequest & Document;

export enum MaintenanceType {
  PLUMBING = 'plumbing',
  ELECTRICAL = 'electrical',
  HVAC = 'hvac',
  STRUCTURAL = 'structural',
  PAINTING = 'painting',
  PEST_CONTROL = 'pest_control',
  OTHER = 'other',
}

export enum MaintenancePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  EMERGENCY = 'emergency',
}

export enum MaintenanceStatus {
  OPEN = 'open',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

@Schema({ timestamps: true })
export class MaintenanceRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  landlordId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Property', required: true })
  propertyId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: Object.values(MaintenanceType) })
  type: MaintenanceType;

  @Prop({ enum: Object.values(MaintenancePriority), default: MaintenancePriority.MEDIUM })
  priority: MaintenancePriority;

  @Prop({ enum: Object.values(MaintenanceStatus), default: MaintenanceStatus.OPEN })
  status: MaintenanceStatus;

  @Prop()
  assignedTo?: string;

  @Prop()
  estimatedCost?: number;

  @Prop()
  resolvedAt?: Date;

  @Prop({ type: [String], default: [] })
  images?: string[];

  @Prop()
  notes?: string;
}

export const MaintenanceRequestSchema = SchemaFactory.createForClass(MaintenanceRequest);

