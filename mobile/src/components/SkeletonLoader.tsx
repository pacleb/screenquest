import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  AccessibilityInfo,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { spacing, borderRadius, fonts } from "../theme";

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

/**
 * Shimmer skeleton placeholder shown while content is loading.
 * Respects reduced motion preferences.
 */
export function SkeletonLoader({
  width = "100%",
  height = 20,
  borderRadius: br = borderRadius.md,
  style,
}: SkeletonLoaderProps) {
  const shimmer = useSharedValue(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!reduceMotion) {
      shimmer.value = withRepeat(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    }
  }, [reduceMotion]);

  const animStyle = useAnimatedStyle(() => {
    const opacity = interpolate(shimmer.value, [0, 1], [0.3, 0.7]);
    return { opacity };
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: br,
          backgroundColor: "#E0E0E0",
        },
        animStyle,
        style,
      ]}
      accessibilityLabel="Loading..."
      accessibilityRole="progressbar"
    />
  );
}

/* ── Preset skeleton layouts ──────────────────────────────── */

export function SkeletonQuestCard() {
  return (
    <View style={skeletonStyles.questCard}>
      <SkeletonLoader width={48} height={48} borderRadius={12} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonLoader width="70%" height={16} />
        <SkeletonLoader width="40%" height={12} />
      </View>
    </View>
  );
}

export function SkeletonDashboard() {
  return (
    <View style={skeletonStyles.dashboard}>
      {/* Header placeholder */}
      <SkeletonLoader height={140} borderRadius={borderRadius.xl} />
      {/* Stats row */}
      <View style={skeletonStyles.row}>
        <SkeletonLoader width={100} height={36} borderRadius={18} />
        <SkeletonLoader width={80} height={36} borderRadius={18} />
        <SkeletonLoader width={70} height={36} borderRadius={18} />
      </View>
      {/* Chart placeholder */}
      <SkeletonLoader height={150} borderRadius={borderRadius.lg} />
      {/* Quest cards */}
      <SkeletonQuestCard />
      <SkeletonQuestCard />
      <SkeletonQuestCard />
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  questCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: "#F5F5F5",
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  dashboard: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
});
