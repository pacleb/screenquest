import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
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
    const requesterId = req.user.sub;
    if (requesterId !== userId) {
      return { error: 'Access denied' };
    }
    return this.notificationService.registerToken(userId, dto.token, dto.platform);
  }

  @Delete('users/:userId/push-token')
  unregisterToken(
    @Param('userId') userId: string,
    @Body() dto: { token: string },
    @Request() req: any,
  ) {
    const requesterId = req.user.sub;
    if (requesterId !== userId) {
      return { error: 'Access denied' };
    }
    return this.notificationService.unregisterToken(userId, dto.token);
  }

  @Get('users/:userId/notification-preferences')
  getPreferences(@Param('userId') userId: string, @Request() req: any) {
    const requesterId = req.user.sub;
    if (requesterId !== userId) {
      return { error: 'Access denied' };
    }
    return this.notificationService.getPreferences(userId);
  }

  @Put('users/:userId/notification-preferences')
  updatePreferences(
    @Param('userId') userId: string,
    @Body() dto: UpdateNotificationPreferencesDto,
    @Request() req: any,
  ) {
    const requesterId = req.user.sub;
    if (requesterId !== userId) {
      return { error: 'Access denied' };
    }
    return this.notificationService.updatePreferences(userId, dto);
  }
}
