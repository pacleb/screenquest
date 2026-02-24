import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { fonts } from "../theme";

interface StreakFireProps {
  streak: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const sizeMap = {
  sm: { fire: 20, text: 13, label: 9, glow: 40, gap: 4 },
  md: { fire: 32, text: 16, label: 11, glow: 64, gap: 6 },
  lg: { fire: 56, text: 24, label: 14, glow: 108, gap: 8 },
};

export function StreakFire({ streak, size = "md", showLabel = true }: StreakFireProps) {
  const dims = sizeMap[size];
  const pulse = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    // Continuous pulsing flame
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    // Glow effect for high streaks
    if (streak >= 7) {
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    }
  }, [streak]);

  const fireStyle = useAnimatedStyle(() => {
    const scale = interpolate(pulse.value, [0, 1], [1, 1.15]);
    const translateY = interpolate(pulse.value, [0, 1], [0, -2]);
    return {
      transform: [{ scale }, { translateY }],
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    const opacity = interpolate(glow.value, [0, 1], [0, 0.4]);
    return {
      opacity,
      transform: [{ scale: interpolate(glow.value, [0, 1], [0.8, 1.3]) }],
    };
  });

  const getFireEmoji = () => {
    if (streak >= 30) return "💎🔥";
    if (streak >= 14) return "⚡🔥";
    if (streak >= 7) return "🔥🔥";
    return "🔥";
  };

  const getStreakColor = () => {
    if (streak >= 30) return "#00BCD4";
    if (streak >= 14) return "#FF6B35";
    if (streak >= 7) return "#F44336";
    return "#FF9800";
  };

  return (
    <View
      style={[styles.container, { gap: dims.gap }]}
      accessibilityRole="text"
      accessibilityLabel={`${streak} day streak`}
    >
      {/* Fire emoji with optional glow */}
      <View style={styles.fireWrapper}>
        {streak >= 7 && (
          <Animated.View
            style={[
              styles.glowCircle,
              glowStyle,
              {
                backgroundColor: getStreakColor(),
                width: dims.glow,
                height: dims.glow,
                borderRadius: dims.glow / 2,
              },
            ]}
          />
        )}
        <Animated.View style={fireStyle}>
          <Text style={{ fontSize: dims.fire }}>{getFireEmoji()}</Text>
        </Animated.View>
      </View>

      {/* Number + label */}
      <View style={styles.textGroup}>
        <Text
          style={[
            styles.streakCount,
            { fontSize: dims.text, color: getStreakColor() },
          ]}
        >
          {streak}
        </Text>
        {showLabel && (
          <Text style={[styles.streakLabel, { fontSize: dims.label }]}>
            streak
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  fireWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  glowCircle: {
    position: "absolute",
    opacity: 0.2,
  },
  textGroup: {
    alignItems: "flex-start",
  },
  streakCount: {
    fontFamily: fonts.child.extraBold,
    lineHeight: undefined,
  },
  streakLabel: {
    fontFamily: fonts.child.regular,
    color: "#999",
    letterSpacing: 0.3,
    marginTop: -1,
  },
});
