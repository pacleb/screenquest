import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  withRepeat,
  Easing,
} from "react-native-reanimated";
import { colors, spacing, borderRadius, fonts } from "../theme";
import { useTheme } from "../theme/ThemeContext";

interface MascotWidgetProps {
  name?: string;
  size?: "sm" | "md" | "lg";
  /** Number of quests done today */
  questsDone?: number;
  /** Total quests assigned today */
  totalQuests?: number;
  /** Current streak days */
  streak?: number;
  /** Whether the streak was just lost */
  lostStreak?: boolean;
  /** XP to next level */
  xpToNext?: number;
  /** Current level */
  level?: number;
  /** Callback when mascot is tapped (for Easter egg) */
  onTap?: () => void;
}

const TIPS = [
  "Tip: Complete all quests to earn bonus XP! 🎯",
  "Did you know? Streaks boost your XP! 🔥",
  "Fun fact: You unlock themes at higher levels! 🎨",
  "Pro tip: The trophy room shows all your badges! 🏆",
  "Try customizing your avatar — it's fun! 🎭",
  "Keep up the great work! You're awesome! 💪",
];

function getContextMessage(props: MascotWidgetProps): string {
  const {
    name,
    questsDone = 0,
    totalQuests = 0,
    streak = 0,
    lostStreak,
    xpToNext,
    level,
  } = props;
  const displayName = name || "adventurer";

  // Priority-ordered context messages
  if (lostStreak) {
    return `No worries, ${displayName}! Let's start a new streak today! 💪`;
  }
  if (totalQuests > 0 && questsDone >= totalQuests) {
    return `Amazing work today, ${displayName}! You're a STAR! ⭐`;
  }
  if (streak >= 14) {
    return `🔥 Day ${streak}! You're LEGENDARY, ${displayName}!`;
  }
  if (streak >= 7) {
    return `🔥 Day ${streak}! You're on FIRE, ${displayName}!`;
  }
  if (xpToNext && xpToNext <= 30 && level) {
    return `Almost there! Just ${xpToNext} XP to Level ${level + 1}! 🎯`;
  }
  if (questsDone === 0 && totalQuests > 0) {
    return `Let's get started, ${displayName}! Pick a quest! 🚀`;
  }
  if (questsDone > 0 && questsDone < totalQuests) {
    return `${questsDone}/${totalQuests} done! Keep going, ${displayName}! 💪`;
  }

  // Fallback time-based greeting
  const hour = new Date().getHours();
  if (hour < 12)
    return `Good morning, ${displayName}! Ready for today's quests? ☀️`;
  if (hour < 17) return `Hey ${displayName}! Great day for quests! 🌤️`;
  return `Good evening, ${displayName}! Great job today! 🌙`;
}

export function MascotWidget(props: MascotWidgetProps) {
  const { size = "md", onTap } = props;
  const { colors: themeColors } = useTheme();
  const [showTip, setShowTip] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const tapTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  const mascotSize = size === "sm" ? 40 : size === "md" ? 56 : 72;
  const fontSize = size === "sm" ? 24 : size === "md" ? 36 : 48;

  // Bounce animation
  const bounce = useSharedValue(0);

  useEffect(() => {
    bounce.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounce.value }],
  }));

  const handleTap = () => {
    setTapCount((c) => c + 1);

    // Reset count after 3 seconds of no tapping
    if (tapTimeout.current) clearTimeout(tapTimeout.current);
    tapTimeout.current = setTimeout(() => setTapCount(0), 3000);

    // Easter egg: tap 10 times
    if (tapCount + 1 >= 10) {
      onTap?.();
      setTapCount(0);
    }

    // Show a random tip on normal tap
    setShowTip(true);
    setTimeout(() => setShowTip(false), 3000);
  };

  const message = showTip
    ? TIPS[Math.floor(Math.random() * TIPS.length)]
    : getContextMessage(props);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handleTap}
        activeOpacity={0.8}
        accessibilityLabel="ScreenQuest mascot"
        accessibilityHint="Tap for tips and encouragement"
      >
        <Animated.View
          style={[
            styles.mascot,
            { width: mascotSize, height: mascotSize },
            mascotStyle,
          ]}
        >
          <Text style={{ fontSize }}>🦊</Text>
        </Animated.View>
      </TouchableOpacity>
      <View style={[styles.bubble, { backgroundColor: themeColors.card }]}>
        <View
          style={[styles.bubbleArrow, { backgroundColor: themeColors.card }]}
        />
        <Text style={[styles.greeting, { color: themeColors.textPrimary }]}>
          {message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
  mascot: {
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  bubble: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleArrow: {
    position: "absolute",
    left: -6,
    top: 14,
    width: 12,
    height: 12,
    backgroundColor: colors.card,
    transform: [{ rotate: "45deg" }],
  },
  greeting: {
    fontFamily: fonts.child.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
  },
});
