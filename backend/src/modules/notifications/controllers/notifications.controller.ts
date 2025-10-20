import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { NotificationsService } from '../services/notifications.service';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { UpdateNotificationPreferencesDto } from '../dto/update-notification-preferences.dto';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of notifications to return' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of notifications to skip' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean, description: 'Return only unread notifications' })
  async getUserNotifications(
    @Request() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    const userId = req.user.userId;
    return this.notificationsService.getUserNotifications(
      userId,
      limit || 20,
      offset || 0,
      unreadOnly || false
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiResponse({ status: 201, description: 'Notification created successfully' })
  async createNotification(
    @Request() req: any,
    @Body() createNotificationDto: CreateNotificationDto,
  ) {
    const userId = req.user.userId;
    return this.notificationsService.createNotification({
      ...createNotificationDto,
      userId,
    });
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markNotificationAsRead(
    @Request() req: any,
    @Param('id') notificationId: string,
  ) {
    const userId = req.user.userId;
    const success = await this.notificationsService.markNotificationAsRead(
      notificationId,
      userId
    );
    return { success };
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllNotificationsAsRead(@Request() req: any) {
    const userId = req.user.userId;
    const count = await this.notificationsService.markAllNotificationsAsRead(userId);
    return { success: true, count };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async deleteNotification(
    @Request() req: any,
    @Param('id') notificationId: string,
  ) {
    const userId = req.user.userId;
    const success = await this.notificationsService.deleteNotification(notificationId, userId);
    return { success };
  }

  @Delete('all')
  @ApiOperation({ summary: 'Delete all notifications for user' })
  @ApiResponse({ status: 200, description: 'All notifications deleted successfully' })
  async deleteAllNotifications(@Request() req: any) {
    const userId = req.user.userId;
    const count = await this.notificationsService.deleteAllNotifications(userId);
    return { success: true, count };
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get user notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences retrieved successfully' })
  async getNotificationPreferences(@Request() req: any) {
    const userId = req.user.userId;
    return this.notificationsService.getUserPreferences(userId);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update user notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  async updateNotificationPreferences(
    @Request() req: any,
    @Body() updatePreferencesDto: UpdateNotificationPreferencesDto,
  ) {
    const userId = req.user.userId;
    return this.notificationsService.updateUserPreferences(userId, updatePreferencesDto);
  }

  @Post('test')
  @ApiOperation({ summary: 'Create a test notification' })
  @ApiResponse({ status: 201, description: 'Test notification created successfully' })
  async testNotification(@Request() req: any) {
    const userId = req.user.userId;
    
    // Create a test notification
    const notification = await this.notificationsService.createNotification({
      userId,
      type: 'POLICY_CREATED' as any,
      title: 'Test Notification',
      message: 'This is a test notification to verify the system is working.',
      priority: 'MEDIUM' as any,
      metadata: { test: true }
    });

    return {
      message: 'Test notification created',
      notificationId: notification._id,
      userId
    };
  }
}
