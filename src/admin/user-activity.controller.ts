import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../common/get-user.decorator';
import { UserActivityFilterDto } from '../activity/dto/user-activity-filter.dto';
import { ActivityService } from './activity.service';

@ApiTags('Activity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('activity')
export class UserActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('my')
  @ApiOperation({ summary: 'Get activity feed for current user' })
  @ApiResponse({ status: 200, description: 'Paginated activity feed' })
  async my(
    @GetUser() user: any,
    @Query() filters: UserActivityFilterDto,
  ) {
    const userId = user?.userId ?? user?.sub;
    return this.activityService.findByUser(String(userId), filters);
  }

  @Get('my/recent')
  @ApiOperation({ summary: 'Get recent activity for current user' })
  @ApiResponse({ status: 200, description: 'Recent activity list' })
  async myRecent(
    @GetUser() user: any,
    @Query('limit') limit?: number,
  ) {
    const userId = user?.userId ?? user?.sub;
    const parsedLimit = limit && limit > 0 ? Math.min(Number(limit), 50) : 10;
    return this.activityService.getRecentByUser(String(userId), parsedLimit);
  }
}

