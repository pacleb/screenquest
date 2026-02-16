/**
 * Notification Poller — polls the backend for unread in-app notifications
 * and displays them as local push notifications via Notifee.
 *
 * This works WITHOUT Firebase config files (GoogleService-Info.plist / google-services.json).
 * When Firebase is configured, FCM push will also work alongside this.
 */
import { AppState, Platform } from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';
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
  await ensureChannel();

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
    },
  });
}

async function pollForNotifications() {
  if (!currentUserId) return;
  // Don't poll when app is in background (saves battery)
  if (AppState.currentState !== 'active') return;

  try {
    const { data: notifications } = await api.get<InAppNotification[]>(
      `/users/${currentUserId}/notifications/unread`,
    );

    for (const notification of notifications) {
      if (!SEEN_NOTIFICATION_IDS.has(notification.id)) {
        SEEN_NOTIFICATION_IDS.add(notification.id);
        await showLocalNotification(notification);
      }
    }
  } catch {
    // Silent — network errors are expected when offline
  }
}

/**
 * Start polling for notifications for the given user.
 * Call this after the user logs in.
 */
export function startNotificationPoller(userId: string) {
  stopNotificationPoller();
  currentUserId = userId;
  SEEN_NOTIFICATION_IDS.clear();

  // Do an initial fetch to seed the seen set (don't display existing ones)
  api
    .get<InAppNotification[]>(`/users/${userId}/notifications/unread`)
    .then(({ data }) => {
      for (const n of data) {
        SEEN_NOTIFICATION_IDS.add(n.id);
      }
    })
    .catch(() => {});

  // Start polling after a short delay (let initial fetch finish first)
  setTimeout(() => {
    pollerInterval = setInterval(pollForNotifications, POLL_INTERVAL_MS);
  }, 3000);
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
