import { 
  Controller, 
  Post, 
  Body, 
  UseGuards, 
  Get, 
  Query, 
  Req, 
  BadRequestException,
  ValidationPipe,
  UsePipes 
} from '@nestjs/common';
import { ActivityService, ActivityEvent } from './activity.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRole } from './admin-role.decorator';
import { AdminRolesGuard } from './admin-roles.guard';
import { Request } from 'express';

export class BatchActivityDto {
  events: ActivityEvent[] | undefined;
}

export class ActivityQueryDto {
  userId?: string;
  role?: string;
  action?: string;
  resource?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Controller('private/activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Post('batch')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async logActivityBatch(
    @Body() body: BatchActivityDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    
    const enrichedEvents = (body.events ?? []).map(event => ({
      ...event,
      ip: event.ip || (Array.isArray(req.headers['x-forwarded-for']) 
        ? req.headers['x-forwarded-for'][0] 
        : req.headers['x-forwarded-for']) || req.ip || req.connection?.remoteAddress,
      userAgent: event.userAgent || req.headers['user-agent'],
      sessionId: event.sessionId || (req as any).sessionID,
    }));

    const result = await this.activityService.logActivityBatch(enrichedEvents);
    
    return {
      message: 'Activity events logged successfully',
      count: result.length,
      events: result.map(event => ({
        id: event._id,
        userId: event.userId,
        role: event.role,
        action: event.action,
        resource: event.resource,
        timestamp: event.timestamp,
      })),
    };
  }

  // @Get()
  // @UseGuards(JwtAuthGuard)
  // async getActivity(
  //   @Query() query: ActivityQueryDto & { email?: string; name?: string },
  //   @Req() req: Request,
  // ) {
  //   const user = (req as any).user;
  
  //   const processedQuery: any = {
  //     ...query,
  //     startDate: query.startDate ? new Date(query.startDate) : undefined,
  //     endDate: query.endDate ? new Date(query.endDate) : undefined,
  //   };
  
  //   // If you need email/name lookup, inject UsersService and resolve to userId here.
  
  //   // 🔹 Default to current user unless admin/superadmin explicitly queries others
  //   if (!processedQuery.userId) {
  //     const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  //     if (!isAdmin) {
  //       processedQuery.userId = user.sub || user.id;
  //     } else {
  //       // Admin/superadmin without userId filter gets their own activities by default
  //       processedQuery.userId = user.sub || user.id;
  //     }
  //   }
  
  //   if (!processedQuery.role && user.role) {
  //     processedQuery.role = user.role;
  //   }
  
  //   return await this.activityService.getUserActivity(processedQuery);
  // }

  @Get()
@UseGuards(JwtAuthGuard, AdminRolesGuard)
@AdminRole('superadmin')
async getActivity(
  @Query() query: ActivityQueryDto & { email?: string; name?: string },
) {
  const processedQuery: any = {
    ...query,
    startDate: query.startDate ? new Date(query.startDate) : undefined,
    endDate: query.endDate ? new Date(query.endDate) : undefined,
  };

  // Superadmin can query freely (all users or filtered by userId)
  return await this.activityService.getUserActivity(processedQuery);
}

  

  @Get('recent')
  @UseGuards(JwtAuthGuard)
  async getRecentActivity(
    @Req() req: Request,
    @Query('limit') limit?: number,
  ) {
    const user = (req as any).user;
    
    const userId = user.sub || user.id;
    const role = user.role;
    const activityLimit = limit && limit > 0 ? Math.min(limit, 50) : 10;

    return await this.activityService.getRecentActivity(userId, role, activityLimit);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('admin')
  async getActivityStats(
    @Query() query: {
      userId?: string;
      role?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const processedQuery = {
      ...query,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };

    return await this.activityService.getActivityStats(processedQuery);
  }

  @Get('verify')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('superadmin')
  async verifyChain(
    @Query('userId') userId: string,
    @Query('role') role: string,
  ) {
    if (!userId || !role) throw new BadRequestException('userId and role are required');
    return await this.activityService.verifyChain(userId, role);
  }

  @Post('cleanup')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('superadmin')
  async cleanupOldActivities(
    @Body() body: { daysToKeep?: number },
  ) {
    const daysToKeep = body.daysToKeep && body.daysToKeep > 0 ? body.daysToKeep : 90;
    
    if (daysToKeep < 7) {
      throw new BadRequestException('Cannot keep less than 7 days of activity records');
    }

    const deletedCount = await this.activityService.cleanupOldActivities(daysToKeep);
    
    return {
      message: `Cleaned up ${deletedCount} old activity records`,
      deletedCount,
      daysKept: daysToKeep,
    };
  }
}