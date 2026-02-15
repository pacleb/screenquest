import api from './api';
import notifee, { AndroidImportance } from '@notifee/react-native';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

export interface NotificationPreferences {
  userId: string;
  questCompletions: boolean;
  playRequests: boolean;
  playStateChanges: boolean;
  violations: boolean;
  dailySummary: boolean;
  weeklySummary: boolean;
}

export const notificationService = {
  async registerPushToken(userId: string): Promise<void> {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) return;

    const token = await messaging().getToken();
    const platform = Platform.OS as string;

    await api.post(`/users/${userId}/push-token`, { token, platform });
  },

  async unregisterPushToken(userId: string): Promise<void> {
    try {
      const token = await messaging().getToken();
      await api.delete(`/users/${userId}/push-token`, {
        data: { token },
      });
    } catch {
      // best effort
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
 * Configure notification handler for foreground notifications
 */
export async function setupNotificationHandler() {
  // Create a default channel for Android
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: 'default',
      name: 'Default',
      importance: AndroidImportance.HIGH,
    });
  }

  // Handle foreground messages
  messaging().onMessage(async (remoteMessage) => {
    await notifee.displayNotification({
      title: remoteMessage.notification?.title ?? 'ScreenQuest',
      body: remoteMessage.notification?.body ?? '',
      android: {
        channelId: 'default',
        smallIcon: 'ic_launcher',
        pressAction: { id: 'default' },
      },
    });
  });
}
