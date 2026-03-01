import * as Sentry from "@sentry/react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  ActivityIndicator,
  StatusBar,
  Image,
  Platform,
} from "react-native";
import {
  NavigationContainer,
  LinkingOptions,
  NavigationContainerRef,
} from "@react-navigation/native";
import { Linking } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "./src/store/auth";
import { useSubscriptionStore } from "./src/store/subscription";
import { useThemeStore } from "./src/store/theme";
import {
  setupNotificationHandler,
  notificationService,
  setNotificationNavigationCallback,
  setupTokenRefreshListener,
} from "./src/services/notification";
import type { NotificationData } from "./src/services/notification";
import { subscriptionService } from "./src/services/subscription";
import {
  startNotificationPoller,
  stopNotificationPoller,
} from "./src/services/notificationPoller";
import { colors, ThemeProvider } from "./src/theme";
import { ErrorBoundary, OfflineBanner, ToastProvider } from "./src/components";
import { RootNavigator } from "./src/navigation/RootNavigator";
import type { RootStackParamList } from "./src/navigation/types";

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ["screenquest://"],
  config: {
    screens: {
      Auth: {
        screens: {
          ResetPassword: "reset-password",
        },
      },
    },
  },
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    return url;
  },
  subscribe(listener) {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      listener(url);
    });
    return () => subscription.remove();
  },
};

setupNotificationHandler();

const SENTRY_DSN = process.env.SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enabled: !__DEV__,
  });
}

const isIPad = Platform.OS === "ios" && Platform.isPad;

function App() {
  const navigationRef =
    useRef<NavigationContainerRef<RootStackParamList>>(null);
  const initialize = useAuthStore((s) => s.initialize);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);
  const [fontsReady, setFontsReady] = useState(true); // Fonts are linked natively now

  const fetchSubscriptionStatus = useSubscriptionStore((s) => s.fetchStatus);
  const fetchThemes = useThemeStore((s) => s.fetchThemes);

  useEffect(() => {
    subscriptionService.initRevenueCat();
    initialize();

    // Set up notification tap navigation handler
    setNotificationNavigationCallback((data: NotificationData) => {
      const nav = navigationRef.current;
      if (!nav?.isReady()) return;

      switch (data.type) {
        case "quest_completion":
        case "quest_completed":
          // Navigate parent to Approvals tab
          nav.navigate("App" as any, {
            screen: "ParentTabs",
            params: {
              screen: "ParentTabsInner",
              params: { screen: "Approvals" },
            },
          });
          break;
        case "quest_approved":
        case "quest_denied":
          // Navigate child to their Quests tab
          nav.navigate("App" as any, {
            screen: "ChildTabs",
            params: {
              screen: "ChildTabsInner",
              params: { screen: "Quests" },
            },
          });
          break;
        case "play_request":
        case "play_started":
        case "play_approved":
        case "play_denied":
          // Navigate parent to Approvals tab for play requests too
          nav.navigate("App" as any, {
            screen: "ParentTabs",
            params: {
              screen: "ParentTabsInner",
              params: { screen: "Approvals" },
            },
          });
          break;
        case "violation":
          nav.navigate("App" as any, {
            screen: "ParentTabs",
            params: {
              screen: "ParentTabsInner",
              params: { screen: "Consequences" },
            },
          });
          break;
        case "achievement":
        case "level_up":
          nav.navigate("App" as any, {
            screen: "ChildTabs",
            params: {
              screen: "ChildTabsInner",
              params: { screen: "Trophies" },
            },
          });
          break;
        default:
          // Navigate to dashboard/home as fallback
          nav.navigate("App" as any, {
            screen: "ParentTabs",
            params: {
              screen: "ParentTabsInner",
              params: { screen: "Dashboard" },
            },
          });
          break;
      }
    });
  }, []);

  useEffect(() => {
    let unsubscribeTokenRefresh: (() => void) | undefined;

    if (user?.id) {
      notificationService.registerPushToken(user.id);
      unsubscribeTokenRefresh = setupTokenRefreshListener(user.id);
      startNotificationPoller(user.id);
      if (user.role === "child") {
        fetchThemes();
      }
    }
    if (user?.familyId) {
      subscriptionService.identifyUser(user.familyId);
      fetchSubscriptionStatus(user.familyId);
    }

    return () => {
      unsubscribeTokenRefresh?.();
      stopNotificationPoller();
    };
  }, [user?.id, user?.familyId]);

  if (!fontsReady || isAuthLoading) {
    // iPad: image is phone-sized, so contain it centered on the purple background
    // iPhone: cover the full screen with the image
    return (
      <View style={{ flex: 1, backgroundColor: "#f6f0fa" }}>
        <Image
          source={require("./assets/sq-launch.jpg")}
          style={{ flex: 1, width: "100%" }}
          resizeMode={isIPad ? "contain" : "cover"}
        />
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
            <NavigationContainer ref={navigationRef} linking={linking}>
              <RootNavigator />
            </NavigationContainer>
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default SENTRY_DSN ? Sentry.wrap(App) : App;
