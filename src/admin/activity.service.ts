import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Activity, ActivityDocument } from './activity.schema';
import * as crypto from 'crypto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserActivityFilterDto } from '../activity/dto/user-activity-filter.dto';

export interface ActivityEvent {
  userId: string;
  role: string;
  email?: string;
  name?: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  sessionId?: string;
  timestamp?: Date;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ActivityService {
  constructor(
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
  ) {}

  /**
   * Log a single activity event
   */
  async logActivity(event: ActivityEvent): Promise<ActivityDocument> {
    const timestamp = event.timestamp || new Date();
    const prev = await this.activityModel
      .findOne({ userId: event.userId, role: event.role })
      .sort({ timestamp: -1 })
      .lean();
    const prevHash = prev?.hash || '';
    const canonical = JSON.stringify({
      userId: event.userId,
      role: event.role,
      email: (event as any).email || null,
      name: (event as any).name || null,
      action: event.action,
      resource: event.resource,
      resourceId: event.resourceId || null,
      metadata: event.metadata || null,
      ip: event.ip || null,
      userAgent: event.userAgent || null,
      sessionId: event.sessionId || null,
      timestamp: timestamp.toISOString(),
      prevHash,
    });
    const secret = process.env.ACTIVITY_HMAC_SECRET || 'dev-secret-change-me';
    const hash = crypto.createHmac('sha256', secret).update(canonical).digest('hex');
    const activity = new this.activityModel({
      ...event,
      timestamp,
      prevHash,
      hash,
      hashAlgo: 'HMAC-SHA256',
    });
    return await activity.save();
  }

  /**
   * Batch log multiple activity events
   */
  async logActivityBatch(events: ActivityEvent[]): Promise<ActivityDocument[]> {
    if (!events || events.length === 0) {
      throw new BadRequestException('Events array cannot be empty');
    }

    // Validate all events
    for (const event of events) {
      if (!event.userId || !event.role || !event.action || !event.resource) {
        throw new BadRequestException('Each event must have userId, role, action, and resource');
      }
    }

    // Group events by (userId, role) to chain within each group
    const grouped = new Map<string, ActivityEvent[]>();
    for (const e of events) {
      const key = `${e.userId}|${e.role}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(e);
    }

    const secret = process.env.ACTIVITY_HMAC_SECRET || 'dev-secret-change-me';
    const docs: Partial<Activity>[] = [];

    for (const [key, list] of grouped.entries()) {
      const [userId, role] = key.split('|');
      // fetch last for this chain
      let prev = await this.activityModel
        .findOne({ userId, role })
        .sort({ timestamp: -1 })
        .lean();
      let prevHash = prev?.hash || '';

      // sort list by timestamp to ensure deterministic chain
      list.sort((a, b) => (a.timestamp?.getTime?.() || new Date(a.timestamp || Date.now()).getTime()) - (b.timestamp?.getTime?.() || new Date(b.timestamp || Date.now()).getTime()));

      for (const event of list) {
        const timestamp = event.timestamp || new Date();
        const canonical = JSON.stringify({
          userId: event.userId,
          role: event.role,
          email: (event as any).email || null,
          name: (event as any).name || null,
          action: event.action,
          resource: event.resource,
          resourceId: event.resourceId || null,
          metadata: event.metadata || null,
          ip: event.ip || null,
          userAgent: event.userAgent || null,
          sessionId: event.sessionId || null,
          timestamp: timestamp.toISOString(),
          prevHash,
        });
        const hash = crypto.createHmac('sha256', secret).update(canonical).digest('hex');
        docs.push({
          userId: event.userId,
          role: event.role,
          email: (event as any).email,
          name: (event as any).name,
          action: event.action,
          resource: event.resource,
          resourceId: event.resourceId,
          metadata: event.metadata,
          ip: event.ip,
          userAgent: event.userAgent,
          sessionId: event.sessionId,
          timestamp,
      processed: true,
          prevHash,
          hash,
          hashAlgo: 'HMAC-SHA256',
        });
        prevHash = hash;
      }
    }

    const created = await this.activityModel.insertMany(docs as any[], { ordered: true });
    // insertMany returns plain docs typed as any; re-query ids to return ActivityDocuments
    const ids = created.map((d: any) => d._id);
    const persisted = await this.activityModel.find({ _id: { $in: ids } });
    return persisted as unknown as ActivityDocument[];
  }

  /**
   * Verify integrity of a user's activity chain
   */
  async verifyChain(userId: string, role: string): Promise<{ valid: boolean; invalidAt?: string; count: number }> {
    const secret = process.env.ACTIVITY_HMAC_SECRET || 'dev-secret-change-me';
    const list = await this.activityModel.find({ userId, role }).sort({ timestamp: 1 }).lean();
    let prevHash = '';
    for (const a of list) {
      const canonical = JSON.stringify({
        userId: a.userId,
        role: a.role,
        action: a.action,
        resource: a.resource,
        resourceId: a.resourceId || null,
        metadata: a.metadata || null,
        ip: a.ip || null,
        userAgent: a.userAgent || null,
        sessionId: a.sessionId || null,
        timestamp: (a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp)).toISOString(),
        prevHash,
      });
      const expected = crypto.createHmac('sha256', secret).update(canonical).digest('hex');
      if (a.prevHash !== prevHash || a.hash !== expected) {
        return { valid: false, invalidAt: String(a._id), count: list.length };
      }
      prevHash = a.hash as string;
    }
    return { valid: true, count: list.length };
  }

  /**
   * Get user activity with filtering and pagination
   */
  async getUserActivity(query: {
    userId?: string;
    email?: string;
    name?: string;
    role?: string;
    action?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    data: ActivityDocument[];
  }> {
    const filter: any = {};

    if (query.userId) {
      filter.userId = query.userId;
    }

    if (query.role) {
      filter.role = query.role;
    }

    if (query.email) {
      filter.email = query.email;
    }

    if (query.name) {
      filter.name = query.name;
    }

    if (query.action) {
      filter.action = query.action;
    }

    const [data, total] = await Promise.all([
      this.activityModel
        .find(filter)
        .lean(),
      this.activityModel.countDocuments(filter),
    ]);

    return {
      data
    };
  }

  /**
   * Get recent activity for a specific user
   */
  async getRecentActivity(
    userId: string,
    role: string,
    limit: number = 10,
  ): Promise<ActivityDocument[]> {
    return await this.activityModel
      .find({ userId, role })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get activity statistics
   */
  async getActivityStats(query: {
    userId?: string;
    role?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalActivities: number;
    uniqueUsers: number;
    topActions: Array<{ action: string; count: number }>;
    topResources: Array<{ resource: string; count: number }>;
  }> {
    const filter: any = {};

    if (query.userId) {
      filter.userId = query.userId;
    }

    if (query.role) {
      filter.role = query.role;
    }

    if (query.startDate || query.endDate) {
      filter.timestamp = {};
      if (query.startDate) {
        filter.timestamp.$gte = query.startDate;
      }
      if (query.endDate) {
        filter.timestamp.$lte = query.endDate;
      }
    }

    const [totalActivities, uniqueUsers, topActions, topResources] = await Promise.all([
      this.activityModel.countDocuments(filter),
      this.activityModel.distinct('userId', filter).then(users => users.length),
      this.activityModel
        .aggregate([
          { $match: filter },
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          { $project: { action: '$_id', count: 1, _id: 0 } },
        ]),
      this.activityModel
        .aggregate([
          { $match: filter },
          { $group: { _id: '$resource', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          { $project: { resource: '$_id', count: 1, _id: 0 } },
        ]),
    ]);

    return {
      totalActivities,
      uniqueUsers,
      topActions,
      topResources,
    };
  }

  /**
   * Clean up old activity records (for maintenance)
   */
  async cleanupOldActivities(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.activityModel.deleteMany({
      timestamp: { $lt: cutoffDate },
    });

    return result.deletedCount;
  }

  /**
   * Log a user-scoped activity entry (non-admin helper).
   */
  async logUserActivity(
    userId: string,
    type: string,
    description: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.logActivity({
      userId,
      role: 'user',
      action: type,
      resource: 'user_activity',
      metadata: {
        description,
        ...(metadata ?? {}),
      },
    });
  }

  /**
   * Find activities for a specific user with filters and pagination.
   */
  async findByUser(
    userId: string,
    filters: UserActivityFilterDto,
  ): Promise<PaginatedResult<ActivityDocument>> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      userId,
    };

    if (filters.type) query.action = filters.type;

    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) {
        (query.timestamp as any).$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        (query.timestamp as any).$lte = new Date(filters.endDate);
      }
    }

    const [data, total] = await Promise.all([
      this.activityModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.activityModel.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Return the most recent activities for a user.
   */
  async getRecentByUser(userId: string, limit: number = 10): Promise<ActivityDocument[]> {
    return this.activityModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }
}