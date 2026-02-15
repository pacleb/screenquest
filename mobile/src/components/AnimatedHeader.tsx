import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "../theme/ThemeContext";
import { fonts, spacing, borderRadius } from "../theme";
import { StreakFire } from "./StreakFire";
import { ProgressBar } from "./ProgressBar";

interface AnimatedHeaderProps {
  name?: string;
  level?: number;
  levelName?: string;
  xpProgress?: number;
  xpToNext?: number;
  totalXp?: number;
  streak?: number;
  weeklyXp?: number;
  avatarEmoji?: string;
  onThemePress?: () => void;
  onAvatarPress?: () => void;
}

function getGreetingIcon(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "🌙";
  if (hour < 12) return "☀️";
  if (hour < 17) return "🌤️";
  if (hour < 20) return "🌅";
  return "🌙";
}

function getGreetingText(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Night owl!";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 20) return "Good evening";
  return "Night owl!";
}

export function AnimatedHeader({
  name,
  level = 1,
  levelName = "Starter",
  xpProgress = 0,
  xpToNext = 0,
  totalXp = 0,
  streak = 0,
  weeklyXp = 0,
  avatarEmoji = "😊",
  onThemePress,
  onAvatarPress,
}: AnimatedHeaderProps) {
  const { colors: themeColors, gradients, isAnimated } = useTheme();
  const shimmer = useSharedValue(0);

  useEffect(() => {
    if (isAnimated) {
      shimmer.value = withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    }
  }, [isAnimated]);

  const shimmerStyle = useAnimatedStyle(() => {
    if (!isAnimated) return {};
    const opacity = interpolate(shimmer.value, [0, 0.5, 1], [0, 0.15, 0]);
    return {
      position: "absolute" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "#FFF",
      opacity,
    };
  });

  const headerGradient = gradients?.header ?? ["#6B2FA0", "#5A2690"];

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={headerGradient as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: borderRadius.xl }]}
      />
      {isAnimated && <Animated.View style={shimmerStyle} />}

      {/* Top Row: Greeting + Theme button */}
      <View style={styles.topRow}>
        <View style={styles.greetingCol}>
          <Text style={styles.greetingText}>
            {getGreetingIcon()} {getGreetingText()}, {name ?? "adventurer"}!
          </Text>
        </View>
        {onThemePress && (
          <TouchableOpacity
            style={styles.themeBtn}
            onPress={onThemePress}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 14 }}>🎨</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Avatar + Level Info Row */}
      <View style={styles.infoRow}>
        <TouchableOpacity
          style={styles.avatarCircle}
          onPress={onAvatarPress}
          activeOpacity={0.85}
        >
          <Text style={styles.avatarEmoji}>{avatarEmoji}</Text>
        </TouchableOpacity>

        <View style={styles.levelCol}>
          <View style={styles.levelRow}>
            <Text style={styles.levelBadge}>
              ⭐ Lv.{level} {levelName}
            </Text>
            {streak > 0 && <StreakFire streak={streak} size="sm" />}
          </View>

          {/* XP Bar */}
          <View style={styles.xpBarRow}>
            <ProgressBar
              progress={xpProgress}
              color="#FFD700"
              trackColor="rgba(255,255,255,0.25)"
              height={8}
            />
            <Text style={styles.xpText}>
              {xpToNext > 0 ? `${xpToNext} XP to next level` : "Max level!"}
            </Text>
          </View>
        </View>
      </View>

      {/* Weekly XP pill */}
      {weeklyXp > 0 && (
        <View style={styles.weeklyPill}>
          <Text style={styles.weeklyText}>This week: {weeklyXp} XP</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg + 8,
    marginBottom: spacing.md,
    overflow: "visible",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  greetingCol: { flex: 1 },
  greetingText: {
    fontFamily: fonts.child.bold,
    fontSize: 18,
    color: "#FFF",
  },
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarEmoji: { fontSize: 32 },
  levelCol: { flex: 1 },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  levelBadge: {
    fontFamily: fonts.child.extraBold,
    fontSize: 14,
    color: "#FFF",
  },
  xpBarRow: {
    gap: 2,
  },
  xpText: {
    fontFamily: fonts.child.semiBold,
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  weeklyPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  weeklyText: {
    fontFamily: fonts.child.semiBold,
    fontSize: 12,
    color: "#FFF",
  },
});
