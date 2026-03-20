import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  MaintenancePriority,
  MaintenanceRequest,
  MaintenanceRequestDocument,
  MaintenanceStatus,
} from './schemas/maintenance.schema';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { MaintenanceFilterDto } from './dto/maintenance-filter.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';

export interface MaintenanceStats {
  open: number;
  assigned: number;
  in_progress: number;
  resolved: number;
  total: number;
  avgResolutionDays: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectModel(MaintenanceRequest.name)
    private readonly maintenanceModel: Model<MaintenanceRequestDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateMaintenanceDto): Promise<MaintenanceRequestDocument> {
    const created = await this.maintenanceModel.create({
      ...dto,
      tenantId: new Types.ObjectId(dto.tenantId),
      landlordId: new Types.ObjectId(dto.landlordId),
      propertyId: new Types.ObjectId(dto.propertyId),
    });

    // Mongoose document `.populate()` returns a Promise; don't chain it off the returned Promise.
    await created.populate('tenantId', 'name email');
    await created.populate('landlordId', 'name');
    await created.populate('propertyId', 'title address');

    // Notify landlord about new maintenance request.
    try {
      void this.notificationsService
        .create({
          userId: dto.landlordId,
          type: NotificationType.MAINTENANCE_UPDATE,
          title: 'New maintenance request',
          body: `You have a new maintenance request: ${dto.title}.`,
          metadata: {
            requestId: String(created._id),
            tenantId: dto.tenantId,
            propertyId: dto.propertyId,
          },
        })
        .catch(() => {});
    } catch {}

    return created;
  }

  async findAll(filters: MaintenanceFilterDto): Promise<PaginatedResult<MaintenanceRequestDocument>> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (filters.tenantId) {
      query.tenantId = new Types.ObjectId(filters.tenantId);
    }
    if (filters.landlordId) {
      query.landlordId = new Types.ObjectId(filters.landlordId);
    }
    if (filters.propertyId) {
      query.propertyId = new Types.ObjectId(filters.propertyId);
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.priority) {
      query.priority = filters.priority;
    }

    const [data, total] = await Promise.all([
      this.maintenanceModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('tenantId', 'name email')
        .populate('landlordId', 'name')
        .populate('propertyId', 'title address')
        .exec(),
      this.maintenanceModel.countDocuments(query),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<MaintenanceRequestDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid maintenance request id');
    }
    const doc = await this.maintenanceModel
      .findById(id)
      .populate('tenantId', 'name email')
      .populate('landlordId', 'name')
      .populate('propertyId', 'title address')
      .exec();
    if (!doc) {
      throw new NotFoundException('Maintenance request not found');
    }
    return doc;
  }

  async findByTenant(tenantId: string): Promise<MaintenanceRequestDocument[]> {
    const docs = await this.maintenanceModel
      .find({ tenantId: new Types.ObjectId(tenantId) })
      .sort({ createdAt: -1 })
      .exec();
    return docs;
  }

  async findByLandlord(landlordId: string): Promise<MaintenanceRequestDocument[]> {
    const docs = await this.maintenanceModel
      .find({ landlordId: new Types.ObjectId(landlordId) })
      .sort({ createdAt: -1 })
      .exec();
    return docs;
  }

  async update(
    id: string,
    dto: UpdateMaintenanceDto,
    _userId: string,
  ): Promise<MaintenanceRequestDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid maintenance request id');
    }
    const doc = await this.maintenanceModel.findById(id).exec();
    if (!doc) {
      throw new NotFoundException('Maintenance request not found');
    }

    if (dto.status === MaintenanceStatus.RESOLVED && !doc.resolvedAt) {
      doc.resolvedAt = new Date();
    }

    if (dto.status) {
      doc.status = dto.status;
    }
    if (dto.assignedTo !== undefined) {
      doc.assignedTo = dto.assignedTo;
    }
    if (dto.estimatedCost !== undefined) {
      doc.estimatedCost = dto.estimatedCost;
    }
    if (dto.notes !== undefined) {
      doc.notes = dto.notes;
    }

    await doc.save();

    const newStatus = doc.status;
    // Notify tenant about maintenance status update.
    try {
      void this.notificationsService
        .notifyMaintenanceUpdate(
          String(doc.tenantId),
          String(doc._id),
          String(newStatus),
        )
        .catch(() => {});
    } catch {}

    return doc;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid maintenance request id');
    }
    const doc = await this.maintenanceModel.findById(id).exec();
    if (!doc) {
      throw new NotFoundException('Maintenance request not found');
    }
    doc.status = MaintenanceStatus.CLOSED;
    await doc.save();

    // Notify tenant about closure.
    try {
      void this.notificationsService
        .notifyMaintenanceUpdate(
          String(doc.tenantId),
          String(doc._id),
          String(doc.status),
        )
        .catch(() => {});
    } catch {}
  }

  async getStats(landlordId: string): Promise<MaintenanceStats> {
    const match: Record<string, unknown> = {};
    if (landlordId) {
      match.landlordId = new Types.ObjectId(landlordId);
    }

    const pipeline: any[] = [
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          resolvedDurations: {
            $push: {
              $cond: [
                { $and: ['$resolvedAt', '$createdAt'] },
                {
                  $divide: [
                    { $subtract: ['$resolvedAt', '$createdAt'] },
                    1000 * 60 * 60 * 24,
                  ],
                },
                null,
              ],
            },
          },
        },
      },
    ];

    const agg = await this.maintenanceModel.aggregate(pipeline);

    let open = 0;
    let assigned = 0;
    let inProgress = 0;
    let resolved = 0;
    let total = 0;
    const allDurations: number[] = [];

    for (const row of agg) {
      const status = row._id as MaintenanceStatus;
      const count = row.count as number;
      total += count;
      if (status === MaintenanceStatus.OPEN) open = count;
      if (status === MaintenanceStatus.ASSIGNED) assigned = count;
      if (status === MaintenanceStatus.IN_PROGRESS) inProgress = count;
      if (status === MaintenanceStatus.RESOLVED) resolved = count;
      const durations = (row.resolvedDurations as (number | null)[]).filter(
        (d): d is number => d !== null && !Number.isNaN(d),
      );
      allDurations.push(...durations);
    }

    const avgResolutionDays =
      allDurations.length > 0
        ? allDurations.reduce((sum, d) => sum + d, 0) / allDurations.length
        : 0;

    return {
      open,
      assigned,
      in_progress: inProgress,
      resolved,
      total,
      avgResolutionDays,
    };
  }
}

