import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InsuranceProduct } from './schemas/product.schema';
import { InsurancePolicy } from './schemas/policy.schema';
import { InsuranceClaim } from './schemas/claim.schema';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { CreateClaimDto } from './dto/create-claim.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class InsuranceService {
  constructor(
    @InjectModel(InsuranceProduct.name) private readonly productModel: Model<InsuranceProduct>,
    @InjectModel(InsurancePolicy.name) private readonly policyModel: Model<InsurancePolicy>,
    @InjectModel(InsuranceClaim.name) private readonly claimModel: Model<InsuranceClaim>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listProducts(): Promise<InsuranceProduct[]> {
    return this.productModel.find().sort({ createdAt: -1 }).exec();
  }

  async createPolicy(dto: CreatePolicyDto): Promise<InsurancePolicy> {
    if (!Types.ObjectId.isValid(dto.userId)) throw new BadRequestException('Invalid userId');
    if (!Types.ObjectId.isValid(dto.productId)) throw new BadRequestException('Invalid productId');

    const created = await this.policyModel.create({
      userId: new Types.ObjectId(dto.userId),
      productId: new Types.ObjectId(dto.productId),
      premium: dto.premium,
      startDate: dto.startDate ?? new Date(),
      endDate: dto.endDate,
      status: 'active',
    } as any);

    // Notify user of successful policy creation
    try {
      await this.notificationsService.create({
        userId: dto.userId,
        type: 'info' as any,
        title: 'Policy issued',
        body: `Your insurance policy for product ${dto.productId} is now active.`,
        metadata: { policyId: String(created._id), productId: dto.productId },
      }).catch(() => {});
    } catch {}

    return created;
  }

  async applyClaim(dto: CreateClaimDto): Promise<InsuranceClaim> {
    if (!Types.ObjectId.isValid(dto.userId)) throw new BadRequestException('Invalid userId');
    if (!Types.ObjectId.isValid(dto.policyId)) throw new BadRequestException('Invalid policyId');

    const policy = await this.policyModel.findById(dto.policyId).exec();
    if (!policy) throw new NotFoundException('Policy not found');

    const created = await this.claimModel.create({
      userId: new Types.ObjectId(dto.userId),
      policyId: new Types.ObjectId(dto.policyId),
      description: dto.description,
      amount: dto.amount,
      evidenceFiles: dto.evidenceFiles ?? [],
      status: 'open',
    } as any);

    // Notify user that claim was submitted
    try {
      await this.notificationsService.create({
        userId: dto.userId,
        type: 'info' as any,
        title: 'Claim submitted',
        body: `Your claim for policy ${dto.policyId} has been submitted and is under review.`,
        metadata: { claimId: String(created._id), policyId: dto.policyId },
      }).catch(() => {});
    } catch {}

    return created;
  }

  async listPolicies(userId?: string): Promise<InsurancePolicy[]> {
    const query: any = {};
    if (userId && Types.ObjectId.isValid(userId)) query.userId = new Types.ObjectId(userId);
    return this.policyModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async listClaims(userId?: string): Promise<InsuranceClaim[]> {
    const query: any = {};
    if (userId && Types.ObjectId.isValid(userId)) query.userId = new Types.ObjectId(userId);
    return this.claimModel.find(query).sort({ createdAt: -1 }).exec();
  }
}
