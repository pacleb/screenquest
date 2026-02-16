/**
 * Notification Poller — polls the backend for unread in-app notifications
 * and displays them as local push notifications via Notifee.
 *
 * This works WITHOUT Firebase config files (GoogleService-Info.plist / google-services.json).
 * When Firebase is configured, FCM push will also work alongside this.
 */
import { AppState, Platform } from 'react-native';
import notifee, { AndroidImportance, AuthorizationStatus } from '@notifee/react-native';
import api from './api';

export interface InAppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  data: Record<string, string> | null;
  read: boolean;
  createdAt: string;
}

const POLL_INTERVAL_MS = 10_000; // 10 seconds
const SEEN_NOTIFICATION_IDS = new Set<string>();

let pollerInterval: ReturnType<typeof setInterval> | null = null;
let currentUserId: string | null = null;
let channelCreated = false;
let permissionGranted = false;

/**
 * Request notification permission from the OS (required on iOS for local notifications).
 */
async function requestPermission(): Promise<boolean> {
  try {
    const settings = await notifee.requestPermission();
    const granted =
      settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      settings.authorizationStatus === AuthorizationStatus.PROVISIONAL;

    if (__DEV__) {
      console.log(
        `[NotifPoller] Permission ${granted ? 'GRANTED' : 'DENIED'} (status=${settings.authorizationStatus})`,
      );
    }
    return granted;
  } catch (err) {
    if (__DEV__) console.warn('[NotifPoller] Permission request failed:', err);
    return false;
  }
}

async function ensureChannel() {
  if (channelCreated) return;
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: 'screenquest',
      name: 'ScreenQuest Notifications',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });
  }
  channelCreated = true;
}

async function showLocalNotification(notification: InAppNotification) {
  if (!permissionGranted) return;
  await ensureChannel();

  if (__DEV__) {
    console.log(`[NotifPoller] Showing local notification: "${notification.title}"`);
  }

  await notifee.displayNotification({
    title: notification.title,
    body: notification.body,
    data: {
      ...(notification.data || {}),
      notificationId: notification.id,
    },
    android: {
      channelId: 'screenquest',
      smallIcon: 'ic_launcher',
      pressAction: { id: 'default' },
      sound: 'default',
    },
    ios: {
      sound: 'default',
      // Critical: show banner + badge + sound even when app is in the foreground
      foregroundPresentationOptions: {
        alert: true,
        badge: true,
        sound: true,
      },
    },
  });
}

async function pollForNotifications() {
  if (!currentUserId) return;

  try {
    const { data: notifications } = await api.get<InAppNotification[]>(
      `/users/${currentUserId}/notifications/unread`,
    );

    if (__DEV__ && notifications.length > 0) {
      const newCount = notifications.filter((n) => !SEEN_NOTIFICATION_IDS.has(n.id)).length;
      if (newCount > 0) {
        console.log(`[NotifPoller] ${newCount} NEW notification(s) to display`);
      }
    }

    for (const notification of notifications) {
      if (!SEEN_NOTIFICATION_IDS.has(notification.id)) {
        SEEN_NOTIFICATION_IDS.add(notification.id);
        await showLocalNotification(notification);
      }
    }
  } catch (err) {
    if (__DEV__) {
      console.warn('[NotifPoller] Poll failed:', (err as any)?.message || err);
    }
  }
}

/**
 * Start polling for notifications for the given user.
 * Call this after the user logs in.
 */
export async function startNotificationPoller(userId: string) {
  stopNotificationPoller();
  currentUserId = userId;
  SEEN_NOTIFICATION_IDS.clear();

  // Request notification permission (critical on iOS)
  permissionGranted = await requestPermission();

  if (__DEV__) {
    console.log(`[NotifPoller] Starting for user ${userId} (permission=${permissionGranted})`);
  }

  // Do an initial fetch to seed the seen set (don't display existing ones)
  try {
    const { data } = await api.get<InAppNotification[]>(
      `/users/${userId}/notifications/unread`,
    );
    for (const n of data) {
      SEEN_NOTIFICATION_IDS.add(n.id);
    }
    if (__DEV__) {
      console.log(`[NotifPoller] Seeded ${data.length} existing notification(s)`);
    }
  } catch (err) {
    if (__DEV__) {
      console.warn('[NotifPoller] Initial seed failed:', (err as any)?.message || err);
    }
  }

  // Start polling
  pollerInterval = setInterval(pollForNotifications, POLL_INTERVAL_MS);
}

/**
 * Stop polling for notifications.
 * Call this on logout.
 */
export function stopNotificationPoller() {
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = null;
  }
  currentUserId = null;
}

/**
 * Mark notifications as read on the server.
 */
export async function markNotificationsAsRead(userId: string, notificationIds: string[]) {
  try {
    await api.post(`/users/${userId}/notifications/mark-read`, { notificationIds });
  } catch {
    // best effort
  }
}

/**
 * Mark all notifications as read on the server.
 */
export async function markAllNotificationsAsRead(userId: string) {
  try {
    await api.post(`/users/${userId}/notifications/mark-all-read`);
  } catch {
    // best effort
  }
}

/**
 * Get unread notification count.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const { data } = await api.get<{ count: number }>(
      `/users/${userId}/notifications/unread-count`,
    );
    return data.count;
  } catch {
    return 0;
  }
}
