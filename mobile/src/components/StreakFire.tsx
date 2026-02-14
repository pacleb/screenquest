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
}

const sizeMap = {
  sm: { fire: 20, text: 13, container: 28 },
  md: { fire: 32, text: 16, container: 44 },
  lg: { fire: 56, text: 24, container: 72 },
};

export function StreakFire({ streak, size = "md" }: StreakFireProps) {
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
      style={[
        styles.container,
        { width: dims.container, height: dims.container },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`${streak} day streak`}
    >
      {/* Glow background for high streaks */}
      {streak >= 7 && (
        <Animated.View
          style={[
            styles.glowCircle,
            glowStyle,
            {
              backgroundColor: getStreakColor(),
              width: dims.container * 1.5,
              height: dims.container * 1.5,
              borderRadius: dims.container,
            },
          ]}
        />
      )}
      <Animated.View style={fireStyle}>
        <Text style={{ fontSize: dims.fire }}>{getFireEmoji()}</Text>
      </Animated.View>
      <Text
        style={[
          styles.streakCount,
          { fontSize: dims.text, color: getStreakColor() },
        ]}
      >
        {streak}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  glowCircle: {
    position: "absolute",
    opacity: 0.2,
  },
  streakCount: {
    fontFamily: fonts.child.extraBold,
    marginTop: -4,
  },
});
