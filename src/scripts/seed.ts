import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

import { UsersSchema, User } from '../users/users.schema';
import { PropertySchema, Property } from '../property/property.schema';
import { EscrowSchema, Escrow } from '../escrow/escrow.schema';
import { BankPartnerSchema, BankPartner } from '../mortgage/schemas/bank-partner.schema';
import { InsuranceProductSchema, InsuranceProduct } from '../insurance/schemas/product.schema';
import { ActivitySchema, Activity } from '../admin/activity.schema';

async function ensureModel<T extends mongoose.Document>(name: string, schema: mongoose.Schema) {
  return mongoose.models[name] || mongoose.model<T>(name, schema);
}

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/infinity-housing-dev';
  console.log('Connecting to', uri);
  await mongoose.connect(uri, { // use default options
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    useNewUrlParser: true,
    // @ts-ignore
    useUnifiedTopology: true,
  } as any);

  const UserModel = await ensureModel<User & mongoose.Document>('User', UsersSchema as any);
  const PropertyModel = await ensureModel<Property & mongoose.Document>('Property', PropertySchema as any);
  const EscrowModel = await ensureModel<Escrow & mongoose.Document>('Escrow', EscrowSchema as any);
  const BankPartnerModel = await ensureModel<BankPartner & mongoose.Document>('BankPartner', BankPartnerSchema as any);
  const InsuranceProductModel = await ensureModel<InsuranceProduct & mongoose.Document>('InsuranceProduct', InsuranceProductSchema as any);
  const ActivityModel = await ensureModel<Activity & mongoose.Document>('Activity', ActivitySchema as any);

  console.log('Clearing demo collections (users, properties, escrows, bankpartners, insurance, activities)');
  await Promise.all([
    UserModel.deleteMany({}),
    PropertyModel.deleteMany({}),
    EscrowModel.deleteMany({}),
    BankPartnerModel.deleteMany({}),
    InsuranceProductModel.deleteMany({}),
    ActivityModel.deleteMany({}),
  ]);

  // Create users
  const password = await bcrypt.hash('Password123!', 10);

  const [admin, landlord, agent, tenant] = await Promise.all([
    UserModel.create({ name: 'Admin User', email: 'admin@local.test', password, role: 'superadmin', isVerified: true }),
    UserModel.create({ name: 'Landlord One', email: 'landlord@local.test', password, role: 'landlord', isVerified: true }),
    UserModel.create({ name: 'Agent Smith', email: 'agent@local.test', password, role: 'agent', isVerified: true }),
    UserModel.create({ name: 'Tenant Jane', email: 'tenant@local.test', password, role: 'tenant', isVerified: true }),
  ]);

  console.log('Created users:', admin.email, landlord.email, agent.email, tenant.email);

  // Create bank partners
  const partners = await BankPartnerModel.insertMany([
    { name: 'FirstHome Bank', interestRate: 9.5, maxLTV: 80, maxTermYears: 20, minMonthlyIncome: 50000, contactEmail: 'mortgage@firsthome.example' },
    { name: 'Unity Mortgage', interestRate: 11.0, maxLTV: 75, maxTermYears: 25, minMonthlyIncome: 40000, contactEmail: 'partners@unity.example' },
    { name: 'Habitat Finance', interestRate: 10.2, maxLTV: 70, maxTermYears: 30, minMonthlyIncome: 60000, contactEmail: 'contact@habitat.example' },
  ]);
  console.log('Created bank partners:', partners.map(p => p.name).join(', '));

  // Create insurance products
  const products = await InsuranceProductModel.insertMany([
    { name: 'HomeSafe Basic', description: 'Basic home insurance for fire and theft', premiumRateAnnualPct: 0.5, coverageTypes: ['fire', 'theft'], minPremium: 5000 },
    { name: 'HomeSafe Plus', description: 'Extended coverage including flood and accidental damage', premiumRateAnnualPct: 0.9, coverageTypes: ['fire', 'theft', 'flood', 'accidental'], minPremium: 12000 },
    { name: 'Rental Protector', description: 'Covers landlord property against tenant damage', premiumRateAnnualPct: 0.6, coverageTypes: ['tenant_damage', 'liability'], minPremium: 8000 },
  ]);
  console.log('Created insurance products:', products.map(p => p.name).join(', '));

  // Create properties
  const sampleProps = await PropertyModel.insertMany([
    {
      title: 'Riverside 2BR Flat', landlordId: landlord._id, listingType: 'For Rent', propertyType: 'Flat', type: 'Residential', status: 'verified', price: 2000000, currency: 'NGN', bedrooms: 2, bathrooms: 1, toilets: 1, unitCount: 1, images: [], address: { street: '12 Riverside', city: 'Lagos', state: 'Lagos', country: 'NG' }, listedBy: { name: agent.name, phone: '08010000001', role: 'agent' }, availability: 'immediate'
    },
    {
      title: 'Ikeja 3BR Duplex', landlordId: landlord._id, listingType: 'For Sale', propertyType: 'Duplex', type: 'Residential', status: 'pending', price: 45000000, currency: 'NGN', bedrooms: 3, bathrooms: 3, toilets: 3, unitCount: 1, images: [], address: { street: '24 Allen', city: 'Ikeja', state: 'Lagos', country: 'NG' }, listedBy: { name: agent.name, phone: '08010000001', role: 'agent' }, availability: 'immediate'
    },
    {
      title: 'Ikoyi Studio Shortlet', landlordId: landlord._id, listingType: 'Shortlet', propertyType: 'Flat', type: 'Rental', status: 'verified', price: 15000, currency: 'NGN', bedrooms: 0, bathrooms: 1, toilets: 1, unitCount: 1, images: [], address: { street: '3B Glover', city: 'Ikoyi', state: 'Lagos', country: 'NG' }, listedBy: { name: agent.name, phone: '08010000001', role: 'agent' }, availability: 'immediate'
    },
    {
      title: 'Lagos Land 500sqm', landlordId: landlord._id, listingType: 'For Sale', propertyType: 'Land', type: 'Land', status: 'pending', price: 12000000, currency: 'NGN', bedrooms: 0, bathrooms: 0, toilets: 0, unitCount: 1, images: [], address: { street: 'Plot 7', city: 'Lekki', state: 'Lagos', country: 'NG' }, listedBy: { name: agent.name, phone: '08010000001', role: 'agent' }, availability: 'immediate'
    },
  ]);

  console.log('Created properties:', sampleProps.map(p => p.title).join(' | '));

  // Create an escrow tied to first property
  const escrow = await EscrowModel.create({
    buyerId: tenant._id,
    sellerId: landlord._id,
    propertyId: sampleProps[0]._id,
    amount: 2000000,
    currency: 'NGN',
    referenceId: `escrow_${uuidv4()}`,
    status: 'initiated',
    purpose: 'rent_advance',
  });
  console.log('Created escrow:', escrow.referenceId);

  // Create sample activities
  const activities = [
    { userId: String(admin._id), role: admin.role, action: 'seed', resource: 'system', metadata: { note: 'initial-seed' } },
    { userId: String(landlord._id), role: landlord.role, action: 'create_property', resource: 'property', resourceId: String(sampleProps[0]._id) },
    { userId: String(agent._id), role: agent.role, action: 'list_property', resource: 'property', resourceId: String(sampleProps[1]._id) },
    { userId: String(tenant._id), role: tenant.role, action: 'view_property', resource: 'property', resourceId: String(sampleProps[0]._id) },
  ];

  await ActivityModel.insertMany(activities);
  console.log('Inserted sample activities');

  console.log('Seeding complete — closing connection');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Seed error', err);
  process.exit(1);
});
