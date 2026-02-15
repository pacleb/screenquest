import * as Sentry from "@sentry/react-native";
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "./src/store/auth";
import { useSubscriptionStore } from "./src/store/subscription";
import { useThemeStore } from "./src/store/theme";
import {
  setupNotificationHandler,
  notificationService,
} from "./src/services/notification";
import { subscriptionService } from "./src/services/subscription";
import { colors, ThemeProvider } from "./src/theme";
import { ErrorBoundary, OfflineBanner, ToastProvider } from "./src/components";
import { RootNavigator } from "./src/navigation/RootNavigator";

setupNotificationHandler();

const SENTRY_DSN = process.env.SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enabled: !__DEV__,
  });
}

function App() {
  const initialize = useAuthStore((s) => s.initialize);
  const user = useAuthStore((s) => s.user);
  const [fontsReady, setFontsReady] = useState(true); // Fonts are linked natively now

  const fetchSubscriptionStatus = useSubscriptionStore((s) => s.fetchStatus);
  const fetchThemes = useThemeStore((s) => s.fetchThemes);

  useEffect(() => {
    subscriptionService.initRevenueCat();
    initialize();
  }, []);

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

  if (!fontsReady) {
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
      <SafeAreaProvider>
        <ThemeProvider>
          <ToastProvider>
            <StatusBar barStyle="dark-content" />
            <OfflineBanner />
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default SENTRY_DSN ? Sentry.wrap(App) : App;
