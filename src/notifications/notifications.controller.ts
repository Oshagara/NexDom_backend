import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { NotificationFilterDto } from './dto/notification-filter.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { GetUser } from '../common/get-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications for current user' })
  @ApiResponse({ status: 200, description: 'Paginated notifications' })
  async findAll(
    @GetUser() user: any,
    @Query() filters: NotificationFilterDto,
  ) {
    const userId = user?.userId ?? user?.sub;
    return this.notificationsService.findByUser(String(userId), filters);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notifications count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async getUnreadCount(@GetUser() user: any) {
    const userId = user?.userId ?? user?.sub;
    const count = await this.notificationsService.getUnreadCount(String(userId));
    return { count };
  }

  @Put('mark-read')
  @ApiOperation({ summary: 'Mark selected notifications as read' })
  @ApiResponse({ status: 200, description: 'Notifications updated' })
  async markAsRead(
    @GetUser() user: any,
    @Body() dto: MarkReadDto,
  ): Promise<void> {
    const userId = user?.userId ?? user?.sub;
    await this.notificationsService.markAsRead(String(userId), dto);
  }

  @Put('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'Notifications updated' })
  async markAllAsRead(@GetUser() user: any): Promise<void> {
    const userId = user?.userId ?? user?.sub;
    await this.notificationsService.markAllAsRead(String(userId));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete notification (own only)' })
  @ApiResponse({ status: 204, description: 'Notification deleted' })
  async remove(@GetUser() user: any, @Param('id') id: string): Promise<void> {
    const userId = user?.userId ?? user?.sub;
    await this.notificationsService.remove(id, String(userId));
  }
}

