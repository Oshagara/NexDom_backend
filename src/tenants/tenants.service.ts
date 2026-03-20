import {
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Tenant, TenantDocument } from './tenants.schema';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { ActivityService } from '../admin/activity.service';

@Injectable()
export class TenantsService {
  constructor(
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
    private readonly activityService: ActivityService,
  ) {}

  async create(dto: CreateTenantDto, createdByUserId: string): Promise<TenantDocument> {
    const exists = await this.tenantModel.findOne({ email: dto.email.trim().toLowerCase() }).exec();
    if (exists) {
      throw new ConflictException('A tenant with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const tenant = await this.tenantModel.create({
      name: dto.name,
      phone: dto.phone,
      email: dto.email.trim().toLowerCase(),
      password: hashedPassword,
      role: 'tenant',
      propertyId: dto.propertyId ? new Types.ObjectId(dto.propertyId) : undefined,
      landlordId: dto.landlordId ? new Types.ObjectId(dto.landlordId) : undefined,
      leaseStart: dto.leaseStart,
      leaseEnd: dto.leaseEnd,
      rentAmount: dto.rentAmount,
      rentCurrency: dto.rentCurrency ?? 'NGN',
      depositAmount: dto.depositAmount,
      leaseStatus: dto.leaseStatus ?? 'pending',
      autoPayEnabled: dto.autoPayEnabled ?? false,
      autoPayMethod: dto.autoPayMethod,
      monthlyIncome: dto.monthlyIncome,
      maxRentBudget: dto.maxRentBudget,
      affordabilityRatio: dto.affordabilityRatio,
    });

    try {
      void this.activityService
        .logUserActivity(
          createdByUserId,
          'tenant_created',
          'New tenant profile created',
          { tenantId: String(tenant._id) },
        )
        .catch(() => {});
    } catch {}

    return tenant;
  }

  async findAll(page = 1, limit = 20): Promise<{ data: TenantDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.tenantModel
        .find()
        .select('-password')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.tenantModel.countDocuments().exec(),
    ]);
    return { data, total };
  }

  async findOne(id: string): Promise<TenantDocument> {
    const tenant = await this.tenantModel
      .findById(id)
      .select('-password')
      .populate('propertyId', 'title address price')
      .populate('landlordId', 'name email')
      .exec();
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async findByLandlord(
    landlordId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: TenantDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const filter = { landlordId: new Types.ObjectId(landlordId) };
    const [data, total] = await Promise.all([
      this.tenantModel
        .find(filter)
        .select('-password')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.tenantModel.countDocuments(filter).exec(),
    ]);
    return { data, total };
  }

  async update(
    id: string,
    dto: UpdateTenantDto,
    userSub: string, // User._id (ObjectId string) for ref comparisons
    userRole: string,
  ): Promise<TenantDocument> {
    const tenant = await this.tenantModel.findById(id).exec();
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    const isAdmin = ['admin', 'superadmin'].includes(userRole);
    const isLandlord = tenant.landlordId?.toString() === userSub;
    if (!isAdmin && !isLandlord) {
      throw new ForbiddenException('You cannot update this tenant');
    }

    const update: Record<string, unknown> = { ...dto };
    if (dto.propertyId) update.propertyId = new Types.ObjectId(dto.propertyId);
    if (dto.landlordId) update.landlordId = new Types.ObjectId(dto.landlordId);
    delete (update as Record<string, unknown>).password;

    const updated = await this.tenantModel
      .findByIdAndUpdate(id, { $set: update }, { new: true })
      .select('-password')
      .exec();
    if (!updated) throw new NotFoundException('Tenant not found');
    return updated;
  }

  async remove(id: string, userRole: string): Promise<void> {
    if (!['admin', 'superadmin'].includes(userRole)) {
      throw new ForbiddenException('Only admins can delete tenants');
    }
    const result = await this.tenantModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Tenant not found');
    }
  }
}
