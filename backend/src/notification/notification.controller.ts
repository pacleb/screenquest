import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationService } from './notification.service';
import { RegisterPushTokenDto, UpdateNotificationPreferencesDto } from './dto/notification.dto';

@Controller()
@UseGuards(AuthGuard('jwt'))
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Post('users/:userId/push-token')
  registerToken(
    @Param('userId') userId: string,
    @Body() dto: RegisterPushTokenDto,
    @Request() req: any,
  ) {
    // Users can only register their own tokens
    if (req.user.id !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return this.notificationService.registerToken(userId, dto.token, dto.platform);
  }

  @Delete('users/:userId/push-token')
  unregisterToken(
    @Param('userId') userId: string,
    @Body() dto: { token: string },
    @Request() req: any,
  ) {
    if (req.user.id !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return this.notificationService.unregisterToken(userId, dto.token);
  }

  @Get('users/:userId/notification-preferences')
  getPreferences(@Param('userId') userId: string, @Request() req: any) {
    if (req.user.id !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return this.notificationService.getPreferences(userId);
  }

  @Put('users/:userId/notification-preferences')
  updatePreferences(
    @Param('userId') userId: string,
    @Body() dto: UpdateNotificationPreferencesDto,
    @Request() req: any,
  ) {
    if (req.user.id !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return this.notificationService.updatePreferences(userId, dto);
  }

  // --- In-App Notification endpoints ---

  @Get('users/:userId/notifications')
  async getNotifications(
    @Param('userId') userId: string,
    @Query('cursor') cursor: string | undefined,
    @Request() req: any,
  ) {
    if (req.user.id !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return this.notificationService.getAll(userId, 50, cursor);
  }

  @Get('users/:userId/notifications/unread')
  async getUnread(@Param('userId') userId: string, @Request() req: any) {
    if (req.user.id !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return this.notificationService.getUnread(userId);
  }

  @Get('users/:userId/notifications/unread-count')
  async getUnreadCount(@Param('userId') userId: string, @Request() req: any) {
    if (req.user.id !== userId) {
      throw new ForbiddenException('Access denied');
    }
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  @Post('users/:userId/notifications/mark-read')
  async markAsRead(
    @Param('userId') userId: string,
    @Body() dto: { notificationIds: string[] },
    @Request() req: any,
  ) {
    if (req.user.id !== userId) {
      throw new ForbiddenException('Access denied');
    }
    await this.notificationService.markAsRead(userId, dto.notificationIds);
    return { success: true };
  }

  @Post('users/:userId/notifications/mark-all-read')
  async markAllAsRead(@Param('userId') userId: string, @Request() req: any) {
    if (req.user.id !== userId) {
      throw new ForbiddenException('Access denied');
    }
    await this.notificationService.markAllAsRead(userId);
    return { success: true };
  }
}
