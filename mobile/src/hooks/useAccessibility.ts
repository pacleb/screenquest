import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";

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
 * Wraps react-native-haptic-feedback with error handling and accessibility awareness.
 */
export function useHaptics() {
  const reduceMotion = useReducedMotion();

  const impact = async (style?: "light" | "medium" | "heavy") => {
    if (reduceMotion) return;
    try {
      const triggerType = {
        light: "impactLight" as const,
        medium: "impactMedium" as const,
        heavy: "impactHeavy" as const,
      };
      ReactNativeHapticFeedback.trigger(triggerType[style ?? "medium"]);
    } catch {
      // Haptics not available
    }
  };

  const notification = async (
    type?: "success" | "warning" | "error",
  ) => {
    if (reduceMotion) return;
    try {
      const triggerType = {
        success: "notificationSuccess" as const,
        warning: "notificationWarning" as const,
        error: "notificationError" as const,
      };
      ReactNativeHapticFeedback.trigger(triggerType[type ?? "success"]);
    } catch {
      // Haptics not available
    }
  };

  return { impact, notification };
}
