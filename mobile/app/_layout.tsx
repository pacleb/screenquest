import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/auth';
import { setupNotificationHandler, notificationService } from '../src/services/notification';

setupNotificationHandler();

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    initialize();
  }, []);

  // Register push token when user is logged in
  useEffect(() => {
    if (user?.id) {
      notificationService.registerPushToken(user.id);
    }
  }, [user?.id]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </>
  );
}
