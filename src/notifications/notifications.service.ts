import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificationsGateway } from './notifications.gateway';
import {
  Notification,
  NotificationDocument,
  NotificationType,
} from './schemas/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { NotificationFilterDto } from './dto/notification-filter.dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface NotificationStats {
  count: number;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    if (!dto?.userId) throw new BadRequestException('userId is required');

    const savedDoc = await this.notificationModel.create({
      ...dto,
      userId: new Types.ObjectId(dto.userId),
      metadata: dto.metadata ?? undefined,
    });

    try {
      this.notificationsGateway.sendToUser(dto.userId, 'notification', savedDoc);
    } catch {}

    return savedDoc;
  }

  async createBulk(dtos: CreateNotificationDto[]): Promise<Notification[]> {
    if (!dtos || dtos.length === 0) {
      throw new BadRequestException('dtos cannot be empty');
    }

    const docs = await this.notificationModel.insertMany(
      dtos.map(dto => ({
        ...dto,
        userId: new Types.ObjectId(dto.userId),
        metadata: dto.metadata ?? undefined,
      })),
    );

    // Emit for each document (grouping by user makes it cheaper but is unnecessary here).
    for (const doc of docs) {
      try {
        this.notificationsGateway.sendToUser(String(doc.userId), 'notification', doc);
      } catch {}
    }

    return docs as Notification[];
  }

  async findByUser(userId: string, filters: NotificationFilterDto): Promise<PaginatedResult<Notification>> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };

    if (filters.read !== undefined) query.read = filters.read;
    if (filters.type) query.type = filters.type;

    const [data, total] = await Promise.all([
      this.notificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      read: false,
    });
  }

  async markAsRead(userId: string, dto: MarkReadDto): Promise<void> {
    await this.notificationModel.updateMany(
      {
        userId: new Types.ObjectId(userId),
        _id: { $in: dto.notificationIds.map(id => new Types.ObjectId(id)) },
      },
      {
        $set: { read: true, readAt: new Date() },
      },
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      { userId: new Types.ObjectId(userId), read: false },
      { $set: { read: true, readAt: new Date() } },
    );
  }

  async remove(id: string, userId: string): Promise<void> {
    const deleted = await this.notificationModel.deleteOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });
    if (deleted.deletedCount === 0) {
      throw new NotFoundException('Notification not found');
    }
  }

  async notifyRentDue(userId: string, amount: number, dueDate: Date): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.RENT_DUE,
      title: 'Rent due',
      body: `Your rent of ${amount} is due on ${dueDate.toDateString()}.`,
      metadata: { amount, dueDate },
    });
  }

  async notifyPaymentSuccess(userId: string, amount: number, reference: string): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.PAYMENT_SUCCESS,
      title: 'Payment successful',
      body: `Payment of ${amount} completed successfully.`,
      metadata: { amount, reference },
    });
  }

  async notifyMaintenanceUpdate(
    userId: string,
    requestId: string,
    status: string,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.MAINTENANCE_UPDATE,
      title: 'Maintenance update',
      body: `Your maintenance request has been updated to: ${status}.`,
      metadata: { requestId, status },
    });
  }

  async notifyEscrowUpdate(userId: string, escrowId: string, status: string): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.ESCROW_UPDATE,
      title: 'Escrow update',
      body: `Escrow ${escrowId} status changed to: ${status}.`,
      metadata: { escrowId, status },
    });
  }
}

