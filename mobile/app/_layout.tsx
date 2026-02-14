import * as Sentry from "@sentry/react-native";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from "@expo-google-fonts/nunito";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useAuthStore } from "../src/store/auth";
import { useSubscriptionStore } from "../src/store/subscription";
import { useThemeStore } from "../src/store/theme";
import {
  setupNotificationHandler,
  notificationService,
} from "../src/services/notification";
import { subscriptionService } from "../src/services/subscription";
import { colors, ThemeProvider } from "../src/theme";
import { ErrorBoundary, OfflineBanner, ToastProvider } from "../src/components";

setupNotificationHandler();

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enabled: !__DEV__,
  });
}

function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const user = useAuthStore((s) => s.user);

  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const fetchSubscriptionStatus = useSubscriptionStore((s) => s.fetchStatus);
  const fetchThemes = useThemeStore((s) => s.fetchThemes);

  useEffect(() => {
    subscriptionService.initRevenueCat();
    initialize();
  }, []);

  // Register push token + identify RevenueCat user when logged in
  // Also load themes for child users
  useEffect(() => {
    if (user?.id) {
      notificationService.registerPushToken(user.id);
      if (user.role === "child") {
        fetchThemes();
      }
    }
    if (user?.familyId) {
      subscriptionService.identifyUser(user.familyId);
      fetchSubscriptionStatus(user.familyId);
    }
  }, [user?.id, user?.familyId]);

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <StatusBar style="dark" />
          <OfflineBanner />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
          </Stack>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default SENTRY_DSN ? Sentry.wrap(RootLayout) : RootLayout;
