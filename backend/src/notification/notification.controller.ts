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
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  /**
   * Public diagnostic endpoint — no auth required.
   * Returns whether FCM push is enabled on this server.
   */
  @Get('notifications/fcm-status')
  async getFcmStatus() {
    const tokenCount = await this.notificationService.getPushTokenCount();
    return {
      fcmEnabled: this.notificationService.isFcmEnabled(),
      registeredTokens: tokenCount,
    };
  }

  @UseGuards(AuthGuard('jwt'))
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

  @UseGuards(AuthGuard('jwt'))
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

  @UseGuards(AuthGuard('jwt'))
  @Get('users/:userId/notification-preferences')
  getPreferences(@Param('userId') userId: string, @Request() req: any) {
    if (req.user.id !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return this.notificationService.getPreferences(userId);
  }

  @UseGuards(AuthGuard('jwt'))
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

  @UseGuards(AuthGuard('jwt'))
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

  @UseGuards(AuthGuard('jwt'))
  @Get('users/:userId/notifications/unread')
  async getUnread(@Param('userId') userId: string, @Request() req: any) {
    if (req.user.id !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return this.notificationService.getUnread(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('users/:userId/notifications/unread-count')
  async getUnreadCount(@Param('userId') userId: string, @Request() req: any) {
    if (req.user.id !== userId) {
      throw new ForbiddenException('Access denied');
    }
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  @UseGuards(AuthGuard('jwt'))
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

  @UseGuards(AuthGuard('jwt'))
  @Post('users/:userId/notifications/mark-all-read')
  async markAllAsRead(@Param('userId') userId: string, @Request() req: any) {
    if (req.user.id !== userId) {
      throw new ForbiddenException('Access denied');
    }
    await this.notificationService.markAllAsRead(userId);
    return { success: true };
  }
}
