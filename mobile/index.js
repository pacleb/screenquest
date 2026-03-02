import { AppRegistry } from "react-native";
import { registerRootComponent } from "expo";
import App from "./App";
import messaging from "@react-native-firebase/messaging";
import notifee from "@notifee/react-native";

// Must be registered before AppRegistry so Firebase can wake up a headless JS
// context and deliver notifications when the app is in the background or killed.
// FCM auto-displays the notification natively (using the system channel); this
// handler is required by react-native-firebase and lets us do any extra processing.
try {
  messaging().setBackgroundMessageHandler(async (_remoteMessage) => {
    // Notification is already shown natively by Firebase when a `notification`
    // payload is present. No manual display needed here.
  });
} catch {
  // Firebase not configured — background message handler skipped
}

// Notifee background event handler — must also be at module level so taps on
// Notifee-displayed notifications are captured in the background/killed state.
// Navigation cannot happen here; the tap is picked up on app open via
// getInitialNotification / onNotificationOpenedApp.
try {
  notifee.onBackgroundEvent(async ({ type: _type, detail: _detail }) => {});
} catch {
  // Notifee not configured — background event handler skipped
}

// Register with Expo's registerRootComponent which uses module name "main"
// to match the AppDelegate's moduleName.
registerRootComponent(App);
