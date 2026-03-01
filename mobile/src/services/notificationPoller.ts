/**
 * Notification Poller — polls the backend for unread in-app notifications
 * and displays them as local push notifications via Notifee.
 *
 * This works WITHOUT Firebase config files (GoogleService-Info.plist / google-services.json).
 * When Firebase is configured, FCM push will also work alongside this.
 */
import { AppState, AppStateStatus, Platform } from 'react-native';
import notifee, { AndroidImportance, AuthorizationStatus } from '@notifee/react-native';
import api from './api';
import { emitEventsForNotificationType } from '../utils/eventBus';

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
let appStateSubscription: { remove: () => void } | null = null;

/**
 * Mark a notification ID as "seen" so the poller won't show it again.
 * Called from the FCM foreground handler to prevent duplicate display.
 */
export function addSeenNotificationId(id: string) {
  SEEN_NOTIFICATION_IDS.add(id);
}

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
      id: 'default',
      name: 'ScreenQuest Notifications',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });
  }
  channelCreated = true;
}

async function showLocalNotification(notification: InAppNotification) {
  if (!permissionGranted) {
    if (__DEV__) console.warn('[NotifPoller] Cannot show notification — permission not granted');
    return;
  }
  await ensureChannel();

  if (__DEV__) {
    console.log(`[NotifPoller] Displaying local notification: "${notification.title}" / "${notification.body}"`);
  }

  try {
    const id = await notifee.displayNotification({
      title: notification.title,
      body: notification.body,
      data: {
        ...(notification.data || {}),
        notificationId: notification.id,
      },
      android: {
        channelId: 'default',
        smallIcon: 'ic_launcher',
        pressAction: { id: 'default' },
        sound: 'default',
      },
      ios: {
        sound: 'default',
        foregroundPresentationOptions: {
          alert: true,
          badge: true,
          sound: true,
        },
      },
    });
    if (__DEV__) {
      console.log(`[NotifPoller] ✅ Notification displayed with id: ${id}`);
    }
  } catch (err) {
    if (__DEV__) {
      console.error('[NotifPoller] ❌ Failed to display notification:', err);
    }
  }
}

async function pollForNotifications() {
  if (!currentUserId) return;

  try {
    if (__DEV__) {
      console.log(`[NotifPoller] Polling for user ${currentUserId}...`);
    }

    const { data: notifications } = await api.get<InAppNotification[]>(
      `/users/${currentUserId}/notifications/unread`,
    );

    if (__DEV__) {
      console.log(
        `[NotifPoller] Got ${notifications.length} unread, seenSet size=${SEEN_NOTIFICATION_IDS.size}`,
      );
    }

    let displayedCount = 0;
    for (const notification of notifications) {
      if (!SEEN_NOTIFICATION_IDS.has(notification.id)) {
        SEEN_NOTIFICATION_IDS.add(notification.id);
        // Trigger immediate UI refresh on the correct screen based on notification type
        const notifType = notification.type || (notification.data?.type as string | undefined);
        emitEventsForNotificationType(notifType);
        await showLocalNotification(notification);
        displayedCount++;
      }
    }

    if (__DEV__ && displayedCount > 0) {
      console.log(`[NotifPoller] Displayed ${displayedCount} new notification(s)`);
    }
  } catch (err) {
    if (__DEV__) {
      console.warn('[NotifPoller] Poll failed:', (err as any)?.response?.status, (err as any)?.message || err);
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
  await seedSeenSet(userId);

  // Start polling
  pollerInterval = setInterval(pollForNotifications, POLL_INTERVAL_MS);

  // Pause polling when app goes to background, re-seed & resume on foreground.
  // This prevents wasted network calls while backgrounded and prevents
  // duplicate local notifications for push-delivered items on resume.
  appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

  // In dev, fire a test notification to verify Notifee works on this device
  if (__DEV__ && permissionGranted) {
    setTimeout(async () => {
      try {
        await ensureChannel();
        const testId = await notifee.displayNotification({
          title: '🔔 ScreenQuest Notifications Active',
          body: 'You will receive play session alerts here.',
          android: {
            channelId: 'default',
            smallIcon: 'ic_launcher',
            pressAction: { id: 'default' },
          },
          ios: {
            sound: 'default',
            foregroundPresentationOptions: {
              alert: true,
              badge: true,
              sound: true,
            },
          },
        });
        console.log(`[NotifPoller] ✅ Test notification sent (id=${testId})`);
      } catch (err) {
        console.error('[NotifPoller] ❌ Test notification FAILED:', err);
      }
    }, 2000);
  }
}

/**
 * Seed the seen set from current unread notifications so we don't re-display them.
 */
async function seedSeenSet(userId: string) {
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
}

/**
 * Handle app state changes — pause polling in background, re-seed on foreground.
 */
async function handleAppStateChange(nextState: AppStateStatus) {
  if (nextState === 'active') {
    // App came to foreground — re-seed the seen set so that notifications
    // already delivered by native FCM push aren't shown again by the poller.
    if (currentUserId) {
      await seedSeenSet(currentUserId);
    }
    // Restart polling interval
    if (!pollerInterval && currentUserId) {
      pollerInterval = setInterval(pollForNotifications, POLL_INTERVAL_MS);
      if (__DEV__) console.log('[NotifPoller] Resumed polling (app active)');
    }
  } else if (nextState === 'background') {
    // Pause polling — saves battery and network; FCM push handles background delivery
    if (pollerInterval) {
      clearInterval(pollerInterval);
      pollerInterval = null;
      if (__DEV__) console.log('[NotifPoller] Paused polling (app backgrounded)');
    }
  }
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
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
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
