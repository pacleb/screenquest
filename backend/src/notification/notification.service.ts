import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private fcmEnabled = false;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    const serviceAccountJson = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT');
    if (!serviceAccountJson) {
      this.logger.warn('FIREBASE_SERVICE_ACCOUNT not set — push notifications disabled');
      return;
    }

    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      }
      this.fcmEnabled = true;
      this.logger.log('Firebase Admin initialized — push notifications enabled');
    } catch (error) {
      this.logger.warn(`Failed to initialize Firebase Admin: ${error}`);
    }
  }

  /**
   * Check if FCM push notifications are enabled (Firebase Admin initialized)
   */
  isFcmEnabled(): boolean {
    return this.fcmEnabled;
  }

  /**
   * Get the count of registered push tokens
   */
  async getPushTokenCount(): Promise<number> {
    return this.prisma.pushToken.count();
  }

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
   * Send notification to a specific user.
   * Always persists as an in-app notification; also sends FCM push if tokens exist.
   */
  async sendToUser(userId: string, payload: PushPayload, category?: string) {
    if (category) {
      const shouldSend = await this.checkPreference(userId, category);
      if (!shouldSend) {
        this.logger.debug(`Notification skipped for user ${userId} — category "${category}" opted out`);
        return;
      }
    }

    // Always persist in-app notification
    const inAppNotif = await this.prisma.inAppNotification.create({
      data: {
        userId,
        title: payload.title,
        body: payload.body,
        type: payload.data?.type || 'general',
        data: payload.data || {},
      },
    });

    // Also try FCM push — include the in-app notification ID so mobile can deduplicate
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId },
      select: { token: true },
    });

    if (tokens.length === 0) {
      this.logger.debug(`No push tokens for user ${userId} — in-app notification stored, no FCM sent`);
      return;
    }

    // Merge the in-app notification ID into the FCM data so the mobile client
    // can mark it as "seen" immediately and the poller won't show a duplicate.
    const fcmPayload: PushPayload = {
      ...payload,
      data: { ...(payload.data || {}), notificationId: inAppNotif.id },
    };

    this.logger.log(`Sending push "${payload.title}" to user ${userId} (${tokens.length} token(s))`);
    await this.sendFCM(
      tokens.map((t: { token: string }) => t.token),
      fcmPayload,
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

    if (parents.length === 0) {
      this.logger.warn(`No parents/guardians found in family ${familyId} — notification "${payload.title}" not delivered`);
      return;
    }

    this.logger.log(`Sending "${payload.title}" to ${parents.length} parent(s) in family ${familyId}`);
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

  // --- In-App Notification methods ---

  /**
   * Get recent unread notifications for a user (for polling)
   */
  async getUnread(userId: string, limit = 20) {
    return this.prisma.inAppNotification.findMany({
      where: { userId, read: false },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get all notifications for a user (paginated)
   */
  async getAll(userId: string, limit = 50, cursor?: string) {
    return this.prisma.inAppNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
  }

  /**
   * Mark specific notifications as read
   */
  async markAsRead(userId: string, notificationIds: string[]) {
    await this.prisma.inAppNotification.updateMany({
      where: { id: { in: notificationIds }, userId },
      data: { read: true },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    await this.prisma.inAppNotification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.inAppNotification.count({
      where: { userId, read: false },
    });
  }

  // --- Private helpers ---

  private async checkPreference(userId: string, category: string): Promise<boolean> {
    const prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs) return true;

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
   * Send push notifications via Firebase Cloud Messaging
   */
  private async sendFCM(tokens: string[], payload: PushPayload) {
    if (!this.fcmEnabled) {
      this.logger.debug('FCM disabled — skipping push notification');
      return;
    }

    const messages: admin.messaging.Message[] = tokens.map((token) => ({
      token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          channelId: 'default',
        },
      },
      apns: {
        headers: {
          'apns-priority': '10',
        },
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            'content-available': 1,
            'mutable-content': 1,
          },
        },
      },
    }));

    try {
      const response = await admin.messaging().sendEach(messages);

      // Clean up stale tokens
      const staleTokens: string[] = [];
      response.responses.forEach((result, index) => {
        if (
          result.error &&
          (result.error.code === 'messaging/registration-token-not-registered' ||
            result.error.code === 'messaging/invalid-registration-token')
        ) {
          staleTokens.push(tokens[index]);
        }
      });

      if (staleTokens.length > 0) {
        await this.prisma.pushToken.deleteMany({
          where: { token: { in: staleTokens } },
        });
        this.logger.log(`Cleaned up ${staleTokens.length} stale push token(s)`);
      }

      if (response.failureCount > staleTokens.length) {
        this.logger.warn(
          `FCM: ${response.successCount} sent, ${response.failureCount} failed`,
        );
      }
    } catch (error) {
      this.logger.warn(`Failed to send push notification: ${error}`);
    }
  }
}
