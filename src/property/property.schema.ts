import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { User } from '../users/users.schema';

// Sub-schemas as interfaces for type safety
interface Coordinates {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

interface Address {
  street?: string;
  area?: string;
  city?: string;
  state?: string;
  lga?: string;
  country?: string;
  coordinates?: Coordinates;
}

interface ListedBy {
  name: string;
  phone: string;
  role: string;
  agency?: string;
}

interface LocationAdvantage {
  name: string;
  type: string;
  distance: string;
}

interface Features {
  interior: string[];
  exterior: string[];
  security: string[];
  amenities: string[];
}

interface FinancialDetails {
  maintenanceFee?: number;
  agencyFee?: string;
  paymentPlan: string[];
}

interface LegalStatus {
  ownership: string;
  cOfO: boolean;
  governorConsent?: boolean;
}

interface AdditionalInfo {
  petPolicy?: string;
  targetTenant?: string;
  proximityToRoad?: string;
}

export type PropertyDocument = Property & Document;

export type PropertyStatus = 'verified' | 'pending' | 'flagged';
export type PropertyTypeCategory = 'Residential' | 'Commercial' | 'Rental' | 'Land';
export type OccupancyStatus = 'occupied' | 'vacant';

@Schema({ timestamps: true })
export class Property {
  @Prop()
  title?: string; // Display name e.g. "Eko Pearl Flat 3B"

  @Prop({ type: String, ref: 'User' })
  postedBy?: string; // Legacy: agentId or userId string

  @Prop({ type: Types.ObjectId, ref: 'User' })
  landlordId?: Types.ObjectId; // NEXDOM: owner/landlord ref

  @Prop({ required: true, enum: ['For Sale', 'For Rent', 'Shortlet'] })
  listingType: string;

  @Prop({ required: true, enum: ['Duplex', 'Bungalow', 'Flat', 'Self-Contain', 'Terraced', 'Mansion'] })
  propertyType: string;

  @Prop({ enum: ['Residential', 'Commercial', 'Rental', 'Land'] })
  type?: PropertyTypeCategory; // NEXDOM category

  @Prop({ default: 'pending', enum: ['verified', 'pending', 'flagged'] })
  status: PropertyStatus;

  @Prop([String])
  tags?: string[]; // e.g. ['Furnished', 'Generator', '24hr security']

  @Prop({ default: 1 })
  unitCount: number;

  @Prop()
  estimatedValue?: number; // For portfolio valuation

  @Prop({ default: 'vacant', enum: ['occupied', 'vacant'] })
  occupancyStatus: OccupancyStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  currentTenantId?: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ default: 'NGN' })
  currency: string;

  @Prop({ default: false })
  isNegotiable: boolean;

  @Prop({ type: Object })
  address: Address;

  @Prop({ min: 1 })
  bedrooms: number;

  @Prop({ min: 0 })
  bathrooms: number;

  @Prop({ min: 0 })
  toilets: number;

  @Prop({ type: { value: Number, unit: String } })
  area: { value: number; unit: 'sqm' | 'sqft' };

  @Prop({ type: { value: Number, unit: String } })
  plotSize: { value: number; unit: 'sqm' | 'sqft' };

  @Prop({ min: 1800 })
  yearBuilt: number;

  @Prop({ min: 1 })
  floors: number;

  @Prop({ enum: ['Fully Furnished', 'Semi-Furnished', 'Unfurnished'] })
  furnishing: string;

  @Prop([String])
  flooring: string[];

  @Prop({ type: Object })
  listedBy: ListedBy;

  @Prop()
  availability: string;

  @Prop([String])
  images: string[];

  @Prop([String])
  videos: string[];

  @Prop()
  floorPlan: string;

  @Prop({ type: Object })
  features: Features;

  @Prop({ type: Object })
  locationAdvantages: LocationAdvantage;

  @Prop({ type: Object })
  financialDetails: FinancialDetails;

  @Prop({ type: Object })
  legalStatus: LegalStatus;

  @Prop({ type: Object })
  additionalInfo: AdditionalInfo;
}

export const PropertySchema = SchemaFactory.createForClass(Property);

// Add geospatial index for location-based queries
PropertySchema.index({ 'address.coordinates': '2dsphere' });