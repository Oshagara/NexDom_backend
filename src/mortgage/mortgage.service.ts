import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BankPartner } from './schemas/bank-partner.schema';
import { MortgageReferral, ReferralStatus } from './schemas/referral.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReferralDto } from './dto/create-referral.dto';

@Injectable()
export class MortgageService {
  constructor(
    @InjectModel(BankPartner.name) private readonly bankPartnerModel: Model<BankPartner>,
    @InjectModel(MortgageReferral.name) private readonly referralModel: Model<MortgageReferral>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listPartners(): Promise<BankPartner[]> {
    return this.bankPartnerModel.find().sort({ name: 1 }).exec();
  }

  async getPartner(id: string): Promise<BankPartner> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid bank partner id');
    const p = await this.bankPartnerModel.findById(id).exec();
    if (!p) throw new NotFoundException('Bank partner not found');
    return p;
  }

  async createReferral(dto: CreateReferralDto): Promise<MortgageReferral> {
    if (!Types.ObjectId.isValid(dto.userId)) throw new BadRequestException('Invalid userId');
    if (!Types.ObjectId.isValid(dto.bankPartnerId)) throw new BadRequestException('Invalid bankPartnerId');

    const created = await this.referralModel.create({
      userId: new Types.ObjectId(dto.userId),
      bankPartnerId: new Types.ObjectId(dto.bankPartnerId),
      propertyId: dto.propertyId ? new Types.ObjectId(dto.propertyId) : undefined,
      propertyValue: dto.propertyValue,
      income: dto.income,
      loanAmount: dto.loanAmount,
      status: ReferralStatus.SUBMITTED,
    } as any);

    // Notify user their referral was submitted
    try {
      await this.notificationsService.create({
        userId: dto.userId,
        type: 'info' as any,
        title: 'Mortgage referral submitted',
        body: `Your mortgage referral to partner ${dto.bankPartnerId} was submitted.`,
        metadata: { referralId: String(created._id), bankPartnerId: dto.bankPartnerId },
      }).catch(() => {});
    } catch {}

    return created;
  }

  async listReferrals(userId?: string): Promise<MortgageReferral[]> {
    const query: any = {};
    if (userId && Types.ObjectId.isValid(userId)) query.userId = new Types.ObjectId(userId);
    return this.referralModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async stats(): Promise<any> {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const agg = await this.referralModel.aggregate([
      { $match: { createdAt: { $gte: start } } },
      { $group: { _id: null, totalReferrals: { $sum: 1 }, totalLoanAmount: { $sum: '$loanAmount' } } },
    ]);

    const totals = agg && agg.length ? agg[0] : { totalReferrals: 0, totalLoanAmount: 0 };
    return { referralsMTD: totals.totalReferrals, totalLoanValueMTD: totals.totalLoanAmount };
  }
}
