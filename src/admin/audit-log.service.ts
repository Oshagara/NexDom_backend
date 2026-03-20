import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './audit-log.schema';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async logAction({ action, performedBy, target, details, ip, status = 'success' }: {
    action: string;
    performedBy: string;
    target?: string;
    details?: string;
    ip?: string;
    status?: string;
  }) {
    await this.auditLogModel.create({ action, performedBy, target, details, ip, status });
  }

  async getLogs(query: { action?: string; performedBy?: string; target?: string; status?: string; page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }) {
    const filter: any = {};
    if (query.action) filter.action = query.action;
    if (query.performedBy) filter.performedBy = query.performedBy;
    if (query.target) filter.target = query.target;
    if (query.status) filter.status = query.status;
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;
    const sort: any = {};
    if (query.sortBy) sort[query.sortBy] = query.sortOrder === 'asc' ? 1 : -1;
    else sort.createdAt = -1;
    const [logs, total] = await Promise.all([
      this.auditLogModel.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      this.auditLogModel.countDocuments(filter),
    ]);
    return {
      data: logs,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
} 