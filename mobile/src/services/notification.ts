import api from './api';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { getApp } from '@react-native-firebase/app';
import { Platform } from 'react-native';
import { emitEventsForNotificationType } from '../utils/eventBus';
import { addSeenNotificationId } from './notificationPoller';

export interface NotificationPreferences {
  userId: string;
  questCompletions: boolean;
  playRequests: boolean;
  playStateChanges: boolean;
  violations: boolean;
  dailySummary: boolean;
  weeklySummary: boolean;
}

export interface NotificationData {
  type?: string;
  questId?: string;
  completionId?: string;
  sessionId?: string;
  childId?: string;
  [key: string]: string | undefined;
}

type NavigationCallback = (data: NotificationData) => void;

let navigationCallback: NavigationCallback | null = null;
let pendingInitialNotification: FirebaseMessagingTypes.RemoteMessage | null = null;

/**
 * Check if Firebase is configured (GoogleService-Info.plist / google-services.json exists).
 */
function isFirebaseAvailable(): boolean {
  try {
    getApp();
    return true;
  } catch {
    return false;
  }
}

export const notificationService = {
  async registerPushToken(userId: string): Promise<void> {
    if (!isFirebaseAvailable()) {
      console.warn('[FCM] Firebase not available — skipping push token registration');
      return;
    }

    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.warn('[FCM] Push notification permission denied by user');
        return;
      }

      const token = await messaging().getToken();
      const platform = Platform.OS as string;

      console.log('[FCM] Token obtained, registering with backend...');
      if (__DEV__) {
        console.log('[FCM DEBUG] Token:', token);
      }

      await api.post(`/users/${userId}/push-token`, { token, platform });
      console.log('[FCM] ✅ Push token registered successfully');
    } catch (err: any) {
      console.error(
        '[FCM] ❌ Failed to register push token:',
        err?.response?.status,
        err?.response?.data || err?.message || err,
      );
    }
  },

  async unregisterPushToken(userId: string): Promise<void> {
    if (!isFirebaseAvailable()) return;

    try {
      const token = await messaging().getToken();
      await api.delete(`/users/${userId}/push-token`, {
        data: { token },
      });
      console.log('[FCM] Push token unregistered');
    } catch (err: any) {
      console.warn('[FCM] Failed to unregister push token:', err?.message || err);
    }
  },

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const { data } = await api.get(`/users/${userId}/notification-preferences`);
    return data;
  },

  async updatePreferences(
    userId: string,
    updates: Partial<Omit<NotificationPreferences, 'userId'>>,
  ): Promise<NotificationPreferences> {
    const { data } = await api.put(`/users/${userId}/notification-preferences`, updates);
    return data;
  },
};

/**
 * Set callback for handling notification taps that require navigation.
 * Should be called once from App.tsx with the navigation ref.
 */
export function setNotificationNavigationCallback(callback: NavigationCallback) {
  navigationCallback = callback;
  // Consume any cold-start notification stored before navigation was ready.
  // React effects run children-first, so NavigationContainer is ready by the
  // time this (parent) useEffect runs — nav.isReady() will return true.
  if (pendingInitialNotification) {
    handleNotificationData(pendingInitialNotification);
    pendingInitialNotification = null;
  }
}

function handleNotificationData(remoteMessage: FirebaseMessagingTypes.RemoteMessage | null) {
  if (!remoteMessage?.data || !navigationCallback) return;
  navigationCallback(remoteMessage.data as NotificationData);
}

function handleNotifeeData(data: Record<string, string> | undefined) {
  if (!data || !navigationCallback) return;
  navigationCallback(data as NotificationData);
}

/**
 * Configure notification handlers for foreground display, background/killed-state taps,
 * and token refresh.
 */
export async function setupNotificationHandler() {
  if (!isFirebaseAvailable()) {
    if (__DEV__) {
      console.log('[Notifications] Firebase not configured — push notifications disabled');
    }
    return;
  }

  // Create a default channel for Android
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: 'default',
      name: 'Default',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  // Handle taps on local notifications (displayed by poller or foreground FCM handler)
  notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS && detail.notification?.data) {
      handleNotifeeData(detail.notification.data as Record<string, string>);
    }
  });

  // Note: notifee.onBackgroundEvent is registered in index.js (module level) so it
  // runs even when the app is killed. Navigation from background taps is handled
  // via getInitialNotification / onNotificationOpenedApp when the app opens.

  try {
    // Handle foreground messages — display as local notification and trigger UI refresh
    messaging().onMessage(async (remoteMessage) => {
      // Mark the server-side notification ID as "seen" so the poller
      // won't display a duplicate local notification for the same event.
      const notificationId = remoteMessage.data?.notificationId as string | undefined;
      if (notificationId) {
        addSeenNotificationId(notificationId);
      }

      await notifee.displayNotification({
        title: remoteMessage.notification?.title ?? 'ScreenQuest',
        body: remoteMessage.notification?.body ?? '',
        data: remoteMessage.data,
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
      // Immediately refresh the relevant screen via EventBus
      emitEventsForNotificationType(remoteMessage.data?.type as string | undefined);
    });

    // Handle notification tap when app is in background
    messaging().onNotificationOpenedApp((remoteMessage) => {
      handleNotificationData(remoteMessage);
    });

    // Handle notification tap when app was killed (cold start).
    // Store it so setNotificationNavigationCallback() can consume it once
    // the navigation callback and NavigationContainer are both ready.
    const initialNotification = await messaging().getInitialNotification();
    if (initialNotification) {
      pendingInitialNotification = initialNotification;
      // If the callback was already set (rare but possible), consume immediately.
      if (navigationCallback) {
        handleNotificationData(initialNotification);
        pendingInitialNotification = null;
      }
    }
  } catch (err: any) {
    console.error('[FCM] Firebase messaging setup failed:', err?.message || err);
  }
}

/**
 * Listen for FCM token refresh and re-register with backend.
 * Should be called when user is authenticated.
 */
export function setupTokenRefreshListener(userId: string): () => void {
  if (!isFirebaseAvailable()) return () => {};

  try {
    const unsubscribe = messaging().onTokenRefresh(async (newToken) => {
      try {
        const platform = Platform.OS as string;
        await api.post(`/users/${userId}/push-token`, { token: newToken, platform });
      } catch {
        // best effort
      }
    });

    return unsubscribe;
  } catch {
    return () => {};
  }
}
