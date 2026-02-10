import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Register a push token for a user
   */
  async registerToken(userId: string, token: string, platform: string) {
    await this.prisma.pushToken.upsert({
      where: { userId_token: { userId, token } },
      create: { userId, token, platform },
      update: { platform },
    });
  }

  /**
   * Unregister a push token for a user
   */
  async unregisterToken(userId: string, token: string) {
    await this.prisma.pushToken.deleteMany({
      where: { userId, token },
    });
  }

  /**
   * Unregister all tokens for a user (on logout)
   */
  async unregisterAllTokens(userId: string) {
    await this.prisma.pushToken.deleteMany({ where: { userId } });
  }

  /**
   * Send notification to a specific user
   */
  async sendToUser(userId: string, payload: PushPayload, category?: string) {
    // Check notification preferences
    if (category) {
      const shouldSend = await this.checkPreference(userId, category);
      if (!shouldSend) return;
    }

    const tokens = await this.prisma.pushToken.findMany({
      where: { userId },
      select: { token: true },
    });

    if (tokens.length === 0) return;

    await this.sendExpoPush(
      tokens.map((t: { token: string }) => t.token),
      payload,
    );
  }

  /**
   * Send notification to all parents/guardians in a family
   */
  async sendToParents(familyId: string, payload: PushPayload, category?: string) {
    const parents = await this.prisma.user.findMany({
      where: {
        familyId,
        role: { in: ['parent', 'guardian'] },
      },
      select: { id: true },
    });

    for (const parent of parents) {
      await this.sendToUser(parent.id, payload, category);
    }
  }

  /**
   * Send notification to all members in a family
   */
  async sendToFamily(familyId: string, payload: PushPayload, category?: string) {
    const members = await this.prisma.user.findMany({
      where: { familyId },
      select: { id: true },
    });

    for (const member of members) {
      await this.sendToUser(member.id, payload, category);
    }
  }

  /**
   * Get notification preferences for a user
   */
  async getPreferences(userId: string) {
    let prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      prefs = await this.prisma.notificationPreference.create({
        data: { userId },
      });
    }

    return prefs;
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(userId: string, updates: Partial<{
    questCompletions: boolean;
    playRequests: boolean;
    playStateChanges: boolean;
    violations: boolean;
    dailySummary: boolean;
    weeklySummary: boolean;
  }>) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...updates },
      update: { ...updates, updatedAt: new Date() },
    });
  }

  // --- Private helpers ---

  private async checkPreference(userId: string, category: string): Promise<boolean> {
    const prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs) return true; // Default: all enabled

    const categoryMap: Record<string, keyof typeof prefs> = {
      quest_completions: 'questCompletions',
      play_requests: 'playRequests',
      play_state_changes: 'playStateChanges',
      violations: 'violations',
      daily_summary: 'dailySummary',
      weekly_summary: 'weeklySummary',
    };

    const field = categoryMap[category];
    if (!field) return true;

    return prefs[field] as boolean;
  }

  /**
   * Send push notifications via Expo Push API
   */
  private async sendExpoPush(tokens: string[], payload: PushPayload) {
    const messages = tokens
      .filter((token) => token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken'))
      .map((token) => ({
        to: token,
        sound: 'default' as const,
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
      }));

    if (messages.length === 0) return;

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        this.logger.warn(`Expo push failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to send push notification: ${error}`);
    }
  }
}
