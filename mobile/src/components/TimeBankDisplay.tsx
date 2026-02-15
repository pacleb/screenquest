import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, borderRadius, fonts, typography } from "../theme";

function formatTime(seconds: number): { value: string; unit: string } {
  const abs = Math.abs(seconds);
  const sign = seconds < 0 ? "-" : "";
  if (abs >= 3600) {
    const h = Math.floor(abs / 3600);
    const m = Math.floor((abs % 3600) / 60);
    const s = abs % 60;
    return {
      value: `${sign}${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`,
      unit: "hours",
    };
  }
  if (abs >= 60) {
    const m = Math.floor(abs / 60);
    const s = abs % 60;
    return {
      value: `${sign}${m}:${s.toString().padStart(2, "0")}`,
      unit: "minutes",
    };
  }
  return { value: `${sign}${abs}`, unit: abs === 1 ? "second" : "seconds" };
}

function formatShort(seconds: number): string {
  const abs = Math.abs(seconds);
  const sign = seconds < 0 ? "-" : "";
  if (abs >= 3600) {
    const h = Math.floor(abs / 3600);
    const m = Math.floor((abs % 3600) / 60);
    const s = abs % 60;
    return s > 0
      ? `${sign}${h}h ${m}m ${s}s`
      : m > 0
        ? `${sign}${h}h ${m}m`
        : `${sign}${h}h`;
  }
  if (abs >= 60) {
    const m = Math.floor(abs / 60);
    const s = abs % 60;
    return s > 0 ? `${sign}${m}m ${s}s` : `${sign}${m}m`;
  }
  return `${sign}${abs}s`;
}

interface TimeBankDisplayProps {
  stackableSeconds: number;
  nonStackableSeconds: number;
  totalSeconds: number;
  compact?: boolean;
}

export function TimeBankDisplay({
  stackableSeconds,
  nonStackableSeconds,
  totalSeconds,
  compact,
}: TimeBankDisplayProps) {
  const isNegative = totalSeconds < 0;
  const deficit = Math.abs(totalSeconds);
  const maxDisplay = Math.max(stackableSeconds + nonStackableSeconds, 7200); // 2h baseline
  const stackFill = isNegative ? 0 : Math.min(stackableSeconds / maxDisplay, 1);
  const nonStackFill = isNegative
    ? 0
    : Math.min(nonStackableSeconds / maxDisplay, 1);

  if (compact) {
    return (
      <View
        style={styles.compactContainer}
        accessibilityRole="text"
        accessibilityLabel={`Time bank: ${formatShort(totalSeconds)}`}
      >
        <Text
          style={[styles.compactValue, isNegative && { color: colors.error }]}
        >
          {formatShort(totalSeconds)}
        </Text>
      </View>
    );
  }

  const display = formatTime(totalSeconds);

  return (
    <View
      style={[styles.container, isNegative && styles.containerNegative]}
      accessibilityRole="summary"
      accessibilityLabel={`Time bank: ${formatShort(totalSeconds)}. ${formatShort(stackableSeconds)} saved, ${formatShort(nonStackableSeconds)} expiring today`}
    >
      <Text style={styles.label}>Time Bank</Text>

      {/* Large balance display */}
      <Text
        style={[styles.balanceValue, isNegative && { color: colors.error }]}
      >
        {display.value}
      </Text>
      <Text style={styles.balanceUnit}>{display.unit}</Text>

      {/* Visual bar */}
      <View style={styles.barContainer}>
        <View style={styles.barTrack}>
          <View
            style={[styles.barFillStackable, { width: `${stackFill * 100}%` }]}
          />
          <View
            style={[
              styles.barFillNonStackable,
              { width: `${nonStackFill * 100}%` },
            ]}
          />
        </View>
      </View>

      {/* Legend */}
      {!isNegative && totalSeconds > 0 && (
        <View style={styles.legendRow}>
          {stackableSeconds > 0 && (
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: colors.primary }]}
              />
              <Text style={styles.legendText}>
                {formatShort(stackableSeconds)} saved
              </Text>
            </View>
          )}
          {nonStackableSeconds > 0 && (
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: colors.accent }]}
              />
              <Text style={styles.legendText}>
                {formatShort(nonStackableSeconds)} today
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Deficit info */}
      {isNegative && (
        <View style={styles.deficitRow}>
          <Text style={styles.deficitText}>
            Earn {formatShort(deficit)} more to play!
          </Text>
        </View>
      )}

      {/* Expiring hint */}
      {!isNegative && nonStackableSeconds > 0 && (
        <View style={styles.expiringBadge}>
          <Text style={styles.expiringText}>
            {formatShort(nonStackableSeconds)} expires tonight
          </Text>
        </View>
      )}

      {/* Zero balance hint */}
      {!isNegative && totalSeconds === 0 && (
        <Text style={styles.hintText}>Complete quests to earn time!</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  containerNegative: {
    shadowColor: colors.error,
    borderWidth: 1.5,
    borderColor: colors.error + "25",
  },
  label: {
    ...typography.childCaption,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  balanceValue: {
    fontFamily: fonts.child.extraBold,
    fontSize: 56,
    lineHeight: 64,
    color: colors.primary,
  },
  balanceUnit: {
    ...typography.childBody,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  barContainer: {
    width: "100%",
    marginBottom: spacing.sm,
  },
  barTrack: {
    flexDirection: "row",
    height: 10,
    backgroundColor: colors.border,
    borderRadius: 5,
    overflow: "hidden",
  },
  barFillStackable: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 5,
  },
  barFillNonStackable: {
    height: "100%",
    backgroundColor: colors.accent,
  },
  legendRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: fonts.child.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  deficitRow: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.error + "12",
    borderRadius: borderRadius.xl,
  },
  deficitText: {
    fontFamily: fonts.child.semiBold,
    fontSize: 13,
    color: colors.error,
  },
  expiringBadge: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.accent + "15",
    borderRadius: borderRadius.xl,
  },
  expiringText: {
    fontFamily: fonts.child.semiBold,
    fontSize: 13,
    color: colors.accent,
  },
  hintText: {
    ...typography.childCaption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  compactContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  compactValue: {
    fontFamily: fonts.parent.bold,
    fontSize: 24,
    color: colors.primary,
  },
  compactUnit: {
    fontFamily: fonts.parent.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
