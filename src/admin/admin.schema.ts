import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AdminDocument = Admin & Document;

@Schema({ timestamps: true })
export class Admin {
  @Prop({ required: true, unique: true })
  adminId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string; // Hashed password

  @Prop({ required: true, enum: ['admin', 'superadmin'], default: 'admin' })
  role: string;

  @Prop({ default: 'active' })
  status: string; // e.g., 'active', 'suspended'

  @Prop()
  lastLoginAt?: Date;

  @Prop()
  lastLoginIp?: string;

  @Prop()
  lastLoginUserAgent?: string;

  @Prop()
  resetPasswordToken?: string;

  @Prop()
  resetPasswordExpires?: Date;

  @Prop({ default: false })
  twoFactorEnabled?: boolean;

  @Prop()
  twoFactorSecret?: string;

  @Prop({ default: false })
  deleted?: boolean;

  @Prop()
  deletedAt?: Date;

  @Prop({ type: [String], default: [] })
  permissions?: string[];
}

export const AdminSchema = SchemaFactory.createForClass(Admin); 