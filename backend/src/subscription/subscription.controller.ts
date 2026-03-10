import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  HttpCode,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionService } from './subscription.service';
import { RevenueCatWebhookEvent, ArchiveQuestsDto, SyncSubscriptionDto } from './dto/subscription.dto';

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

    // Fail-closed: reject if auth key is not configured
    if (!webhookAuthKey) {
      this.logger.error('REVENUECAT_WEBHOOK_AUTH_KEY is not configured');
      throw new InternalServerErrorException('Webhook auth key not configured');
    }

    const expectedHeader = `Bearer ${webhookAuthKey}`;
    if (authHeader !== expectedHeader) {
      this.logger.warn('RevenueCat webhook: invalid auth key');
      throw new UnauthorizedException('Invalid webhook auth key');
    }

    await this.subscriptionService.handleWebhookEvent(body);
    return { ok: true };
  }

  /**
   * Get subscription status for a family
   */
  @UseGuards(JwtAuthGuard)
  @Get('families/:familyId/subscription')
  async getStatus(@Param('familyId') familyId: string, @Request() req: any) {
    if (req.user.familyId !== familyId) {
      throw new ForbiddenException('Access denied');
    }
    return this.subscriptionService.getSubscriptionStatus(familyId);
  }

  /**
   * Sync subscription status directly from RevenueCat REST API.
   * Called by the mobile app when RevenueCat SDK reports premium but the backend
   * does not (common in sandbox/TestFlight where webhooks may be delayed or
   * sandbox subscriptions expire before the next backend check).
   */
  @UseGuards(JwtAuthGuard)
  @Post('families/:familyId/subscription/sync')
  @HttpCode(200)
  async syncSubscription(
    @Param('familyId') familyId: string,
    @Body() body: SyncSubscriptionDto,
    @Request() req: any,
  ) {
    if (req.user.familyId !== familyId) {
      throw new ForbiddenException('Access denied');
    }

    // RevenueCat V1 REST API requires the public API key, not the V2 secret key.
    const publicKey = this.configService.get<string>('REVENUECAT_WEBHOOK_AUTH_KEY');
    if (!publicKey) {
      this.logger.warn('REVENUECAT_WEBHOOK_AUTH_KEY not configured — sync skipped');
      return { synced: false };
    }

    const synced = await this.subscriptionService.syncFromRevenueCat(
      familyId,
      publicKey,
      body?.appUserId,
    );
    return { synced };
  }

  /**
   * Parent chooses which quests to keep after premium expiration
   */
  @UseGuards(JwtAuthGuard)
  @Post('families/:familyId/subscription/archive-quests')
  async archiveQuests(
    @Param('familyId') familyId: string,
    @Body() dto: ArchiveQuestsDto,
    @Request() req: any,
  ) {
    if (req.user.familyId !== familyId) {
      throw new ForbiddenException('Access denied');
    }
    await this.subscriptionService.archiveExcessQuests(familyId, dto.keepQuestIds);
    return { ok: true };
  }

  /**
   * Get owned avatar packs for a user
   */
  @UseGuards(JwtAuthGuard)
  @Get('users/:userId/avatar-packs')
  async getAvatarPacks(@Param('userId') userId: string, @Request() req: any) {
    if (req.user.id !== userId) {
      throw new ForbiddenException('Access denied');
    }
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
    @Request() req: any,
  ) {
    if (req.user.id !== userId) {
      throw new ForbiddenException('Access denied');
    }
    await this.subscriptionService.purchaseAvatarPack(userId, body.packId);
    return { ok: true };
  }
}
