import api from './api';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
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
    if (!Device.isDevice) return;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    const token = tokenData.data;
    const platform = Platform.OS as string;

    await api.post(`/users/${userId}/push-token`, { token, platform });
  },

  async unregisterPushToken(userId: string): Promise<void> {
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });
      await api.delete(`/users/${userId}/push-token`, {
        data: { token: tokenData.data },
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
export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
