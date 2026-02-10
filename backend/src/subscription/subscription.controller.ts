import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  HttpCode,
  UnauthorizedException,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionService } from './subscription.service';
import { RevenueCatWebhookEvent, ArchiveQuestsDto } from './dto/subscription.dto';

@Controller()
export class SubscriptionController {
  private readonly logger = new Logger(SubscriptionController.name);

  constructor(
    private subscriptionService: SubscriptionService,
    private configService: ConfigService,
  ) {}

  /**
   * RevenueCat webhook — public endpoint, verified via auth key
   */
  @Post('webhooks/revenuecat')
  @HttpCode(200)
  async handleWebhook(
    @Body() body: RevenueCatWebhookEvent,
    @Headers('authorization') authHeader: string,
  ) {
    const webhookAuthKey = this.configService.get<string>('REVENUECAT_WEBHOOK_AUTH_KEY');

    if (webhookAuthKey) {
      const expectedHeader = `Bearer ${webhookAuthKey}`;
      if (authHeader !== expectedHeader) {
        this.logger.warn('RevenueCat webhook: invalid auth key');
        throw new UnauthorizedException('Invalid webhook auth key');
      }
    }

    await this.subscriptionService.handleWebhookEvent(body);
    return { ok: true };
  }

  /**
   * Get subscription status for a family
   */
  @UseGuards(JwtAuthGuard)
  @Get('families/:familyId/subscription')
  async getStatus(@Param('familyId') familyId: string) {
    return this.subscriptionService.getSubscriptionStatus(familyId);
  }

  /**
   * Parent chooses which quests to keep after premium expiration
   */
  @UseGuards(JwtAuthGuard)
  @Post('families/:familyId/subscription/archive-quests')
  async archiveQuests(
    @Param('familyId') familyId: string,
    @Body() dto: ArchiveQuestsDto,
  ) {
    await this.subscriptionService.archiveExcessQuests(familyId, dto.keepQuestIds);
    return { ok: true };
  }

  /**
   * Get owned avatar packs for a user
   */
  @UseGuards(JwtAuthGuard)
  @Get('users/:userId/avatar-packs')
  async getAvatarPacks(@Param('userId') userId: string) {
    const packs = await this.subscriptionService.getOwnedPacks(userId);
    return { packs };
  }

  /**
   * Record an avatar pack purchase (called after RevenueCat confirms)
   */
  @UseGuards(JwtAuthGuard)
  @Post('users/:userId/avatar-packs')
  async recordAvatarPack(
    @Param('userId') userId: string,
    @Body() body: { packId: string },
  ) {
    await this.subscriptionService.purchaseAvatarPack(userId, body.packId);
    return { ok: true };
  }
}
