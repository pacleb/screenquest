import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { colors, spacing, borderRadius, fonts } from "../theme";

interface QuestCardProps {
  icon: string;
  name: string;
  rewardMinutes: number;
  stackingType: "stackable" | "non_stackable";
  category?: string;
  statusLabel?: string;
  available?: boolean;
  onPress?: () => void;
  compact?: boolean;
}

/** Category → color mapping for visual coding */
const CATEGORY_COLORS: Record<
  string,
  { bg: string; border: string; label: string }
> = {
  chores: { bg: "#E8F5E9", border: "#4CAF50", label: "🟢 Chores" },
  learning: { bg: "#E3F2FD", border: "#2196F3", label: "🔵 Learning" },
  exercise: { bg: "#FFF3E0", border: "#FF9800", label: "🟠 Exercise" },
  creative: { bg: "#F3E5F5", border: "#9C27B0", label: "🟣 Creative" },
  kindness: { bg: "#FCE4EC", border: "#E91E63", label: "🩷 Kindness" },
  custom: { bg: "#F5F5F5", border: "#9E9E9E", label: "⚪ Custom" },
};

const STATUS_DISPLAY: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  available: {
    label: "Available",
    color: colors.secondary,
    icon: "checkmark-circle",
  },
  pending: { label: "Pending", color: colors.accent, icon: "hourglass" },
  completed: {
    label: "Done",
    color: colors.textSecondary,
    icon: "checkmark-done",
  },
  completed_today: {
    label: "Done Today",
    color: colors.textSecondary,
    icon: "checkmark-done",
  },
  completed_this_week: {
    label: "Done This Week",
    color: colors.textSecondary,
    icon: "checkmark-done",
  },
};

export function QuestCard({
  icon,
  name,
  rewardMinutes,
  stackingType,
  category,
  statusLabel = "available",
  available = true,
  onPress,
  compact,
}: QuestCardProps) {
  const status = STATUS_DISPLAY[statusLabel] || STATUS_DISPLAY.available;
  const isStackable = stackingType === "stackable";
  const catColor = category
    ? CATEGORY_COLORS[category.toLowerCase()]
    : undefined;
  const difficulty = rewardMinutes <= 5 ? 1 : rewardMinutes <= 15 ? 2 : 3;
  const stars = Array(difficulty).fill("⭐").join("");

  if (compact) {
    return (
      <TouchableOpacity
        style={[
          styles.compactCard,
          catColor && { borderLeftWidth: 4, borderLeftColor: catColor.border },
        ]}
        onPress={onPress}
        activeOpacity={0.8}
        disabled={!onPress}
        accessibilityLabel={`Quest: ${name}, ${rewardMinutes} minutes reward`}
        accessibilityRole="button"
      >
        <Text style={styles.compactIcon}>{icon}</Text>
        <Text style={styles.compactName} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.compactRewardRow}>
          <View style={styles.compactReward}>
            <Text style={styles.compactRewardText}>🕐 +{rewardMinutes}m</Text>
          </View>
        </View>
        <Text style={styles.compactDifficulty}>{stars}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.card,
        !available && styles.cardDisabled,
        catColor && { borderLeftWidth: 4, borderLeftColor: catColor.border },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={!onPress}
      accessibilityLabel={`Quest: ${name}, ${rewardMinutes} minutes reward, difficulty ${difficulty}`}
      accessibilityRole="button"
    >
      {/* Icon */}
      <View
        style={[
          styles.iconContainer,
          catColor && { backgroundColor: catColor.bg },
        ]}
      >
        <Text style={styles.icon}>{icon}</Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.rewardBadge}>
            <Text style={styles.rewardText}>🕐 +{rewardMinutes} min</Text>
          </View>
          <View
            style={[
              styles.stackBadge,
              isStackable ? styles.stackable : styles.todayOnly,
            ]}
          >
            <Text
              style={[
                styles.stackText,
                isStackable ? styles.stackableText : styles.todayOnlyText,
              ]}
            >
              {isStackable ? "Stackable" : "Today"}
            </Text>
          </View>
          <Text style={styles.difficultyStars}>{stars}</Text>
        </View>
      </View>

      {/* Status indicator */}
      {statusLabel !== "available" && (
        <View
          style={[styles.statusBadge, { backgroundColor: status.color + "18" }]}
        >
          <Icon name={status.icon as any} size={14} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
      )}

      {available && statusLabel === "available" && (
        <Icon
          name="chevron-forward"
          size={20}
          color={colors.textSecondary + "60"}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardDisabled: { opacity: 0.55 },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.questCard,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  icon: { fontSize: 26 },
  info: { flex: 1 },
  name: {
    fontFamily: fonts.child.bold,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  rewardBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.primary + "12",
    borderRadius: borderRadius.sm,
  },
  rewardText: {
    fontFamily: fonts.child.semiBold,
    fontSize: 12,
    color: colors.primary,
  },
  stackBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  stackable: { backgroundColor: "#E8F5E9" },
  todayOnly: { backgroundColor: "#FFF3E0" },
  stackText: { fontSize: 11, fontFamily: fonts.child.semiBold },
  stackableText: { color: "#388E3C" },
  todayOnlyText: { color: "#E65100" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontFamily: fonts.child.semiBold,
  },
  // Compact variant
  compactCard: {
    width: 130,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: "center",
    marginRight: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  compactIcon: { fontSize: 36, marginBottom: spacing.sm },
  compactName: {
    fontFamily: fonts.child.bold,
    fontSize: 13,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  compactReward: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.primary + "12",
    borderRadius: borderRadius.sm,
  },
  compactRewardText: {
    fontFamily: fonts.child.semiBold,
    fontSize: 12,
    color: colors.primary,
  },
  compactRewardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  compactDifficulty: {
    fontSize: 10,
    marginTop: 4,
  },
  difficultyStars: {
    fontSize: 10,
    marginLeft: 2,
  },
});
