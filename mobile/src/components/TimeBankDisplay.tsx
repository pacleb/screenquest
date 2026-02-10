import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, fonts, typography } from '../theme';

interface TimeBankDisplayProps {
  stackableMinutes: number;
  nonStackableMinutes: number;
  totalMinutes: number;
  compact?: boolean;
}

export function TimeBankDisplay({
  stackableMinutes,
  nonStackableMinutes,
  totalMinutes,
  compact,
}: TimeBankDisplayProps) {
  const isNegative = totalMinutes < 0;
  const deficit = Math.abs(totalMinutes);
  const maxDisplay = Math.max(stackableMinutes + nonStackableMinutes, 120); // 2h baseline
  const stackFill = isNegative ? 0 : Math.min(stackableMinutes / maxDisplay, 1);
  const nonStackFill = isNegative ? 0 : Math.min(nonStackableMinutes / maxDisplay, 1);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Text
          style={[
            styles.compactValue,
            isNegative && { color: colors.error },
          ]}
        >
          {totalMinutes}
        </Text>
        <Text style={styles.compactUnit}>min</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isNegative && styles.containerNegative]}>
      <Text style={styles.label}>Time Bank</Text>

      {/* Large balance display */}
      <Text
        style={[
          styles.balanceValue,
          isNegative && { color: colors.error },
        ]}
      >
        {totalMinutes}
      </Text>
      <Text style={styles.balanceUnit}>minutes</Text>

      {/* Visual bar */}
      <View style={styles.barContainer}>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFillStackable,
              { width: `${stackFill * 100}%` },
            ]}
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
      {!isNegative && totalMinutes > 0 && (
        <View style={styles.legendRow}>
          {stackableMinutes > 0 && (
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.legendText}>{stackableMinutes}m saved</Text>
            </View>
          )}
          {nonStackableMinutes > 0 && (
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
              <Text style={styles.legendText}>{nonStackableMinutes}m today</Text>
            </View>
          )}
        </View>
      )}

      {/* Deficit info */}
      {isNegative && (
        <View style={styles.deficitRow}>
          <Text style={styles.deficitText}>
            Earn {deficit} more minutes to play!
          </Text>
        </View>
      )}

      {/* Expiring hint */}
      {!isNegative && nonStackableMinutes > 0 && (
        <View style={styles.expiringBadge}>
          <Text style={styles.expiringText}>
            {nonStackableMinutes} min expires tonight
          </Text>
        </View>
      )}

      {/* Zero balance hint */}
      {!isNegative && totalMinutes === 0 && (
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
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  containerNegative: {
    shadowColor: colors.error,
    borderWidth: 1.5,
    borderColor: colors.error + '25',
  },
  label: {
    ...typography.childCaption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
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
    width: '100%',
    marginBottom: spacing.sm,
  },
  barTrack: {
    flexDirection: 'row',
    height: 10,
    backgroundColor: colors.border,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFillStackable: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 5,
  },
  barFillNonStackable: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  legendRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: colors.error + '12',
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
    backgroundColor: colors.accent + '15',
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
    flexDirection: 'row',
    alignItems: 'baseline',
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
