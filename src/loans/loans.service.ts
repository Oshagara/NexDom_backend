import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Loan, LoanDocument, LoanStatus } from './schemas/loan.schema';
import { CreateLoanDto } from './dto/create-loan.dto';
import { LoanFilterDto } from './dto/loan-filter.dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class LoansService {
  constructor(@InjectModel(Loan.name) private readonly loanModel: Model<LoanDocument>) {}

  async apply(dto: CreateLoanDto): Promise<Loan> {
    if (!Types.ObjectId.isValid(dto.userId)) throw new BadRequestException('Invalid userId');

    const monthlyRepayment = this.calculateMonthlyRepayment(dto.amount, dto.interestRate, dto.termMonths);

    const created = await this.loanModel.create({
      userId: new Types.ObjectId(dto.userId),
      propertyId: dto.propertyId ? new Types.ObjectId(dto.propertyId) : undefined,
      amount: dto.amount,
      purpose: dto.purpose,
      termMonths: dto.termMonths,
      interestRate: dto.interestRate,
      monthlyRepayment,
      status: LoanStatus.PENDING,
      escrowLinked: !!dto.escrowLinked,
    });

    return created;
  }

  calculateMonthlyRepayment(principal: number, annualRate: number, termMonths: number): number {
    const r = annualRate / 100 / 12;
    const n = termMonths;
    if (r === 0) return +(principal / n).toFixed(2);
    const monthly = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return +monthly.toFixed(2);
  }

  async findAll(filters: LoanFilterDto): Promise<PaginatedResult<Loan>> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (filters.userId && Types.ObjectId.isValid(filters.userId)) query.userId = new Types.ObjectId(filters.userId);

    const [data, total] = await Promise.all([
      this.loanModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.loanModel.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Loan> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid loan id');
    const doc = await this.loanModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Loan not found');
    return doc;
  }

  async stats(): Promise<any> {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const [activeCount, totalValue] = await Promise.all([
      this.loanModel.countDocuments({ status: LoanStatus.APPROVED }),
      this.loanModel.aggregate([
        { $match: { createdAt: { $gte: start } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const total = Array.isArray(totalValue) && totalValue.length ? totalValue[0].total : 0;
    return { approvedCount: activeCount, volumeMTD: total };
  }
}
