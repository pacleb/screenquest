import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Hook that checks if the user prefers reduced motion.
 * Use this to conditionally disable animations.
 *
 * Usage:
 *   const reduceMotion = useReducedMotion();
 *   // if (reduceMotion) skip animation
 */
export function useReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => sub.remove();
  }, []);

  return reduceMotion;
}

/**
 * Hook that returns the appropriate haptic feedback function.
 * Wraps expo-haptics with error handling and accessibility awareness.
 */
export function useHaptics() {
  const reduceMotion = useReducedMotion();

  const impact = async (style?: "light" | "medium" | "heavy") => {
    if (reduceMotion) return;
    try {
      const Haptics = await import("expo-haptics");
      const feedbackStyle = {
        light: Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy: Haptics.ImpactFeedbackStyle.Heavy,
      };
      await Haptics.impactAsync(feedbackStyle[style ?? "medium"]);
    } catch {
      // Haptics not available
    }
  };

  const notification = async (
    type?: "success" | "warning" | "error",
  ) => {
    if (reduceMotion) return;
    try {
      const Haptics = await import("expo-haptics");
      const feedbackType = {
        success: Haptics.NotificationFeedbackType.Success,
        warning: Haptics.NotificationFeedbackType.Warning,
        error: Haptics.NotificationFeedbackType.Error,
      };
      await Haptics.notificationAsync(feedbackType[type ?? "success"]);
    } catch {
      // Haptics not available
    }
  };

  return { impact, notification };
}
