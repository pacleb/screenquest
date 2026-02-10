import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fonts } from '../theme';

interface QuestCardProps {
  icon: string;
  name: string;
  rewardMinutes: number;
  stackingType: 'stackable' | 'non_stackable';
  statusLabel?: string;
  available?: boolean;
  onPress?: () => void;
  compact?: boolean;
}

const STATUS_DISPLAY: Record<string, { label: string; color: string; icon: string }> = {
  available: { label: 'Available', color: colors.secondary, icon: 'checkmark-circle' },
  pending: { label: 'Pending', color: colors.accent, icon: 'hourglass' },
  completed: { label: 'Done', color: colors.textSecondary, icon: 'checkmark-done' },
  completed_today: { label: 'Done Today', color: colors.textSecondary, icon: 'checkmark-done' },
  completed_this_week: { label: 'Done This Week', color: colors.textSecondary, icon: 'checkmark-done' },
};

export function QuestCard({
  icon,
  name,
  rewardMinutes,
  stackingType,
  statusLabel = 'available',
  available = true,
  onPress,
  compact,
}: QuestCardProps) {
  const status = STATUS_DISPLAY[statusLabel] || STATUS_DISPLAY.available;
  const isStackable = stackingType === 'stackable';

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactCard}
        onPress={onPress}
        activeOpacity={0.8}
        disabled={!onPress}
      >
        <Text style={styles.compactIcon}>{icon}</Text>
        <Text style={styles.compactName} numberOfLines={1}>{name}</Text>
        <View style={styles.compactReward}>
          <Text style={styles.compactRewardText}>{rewardMinutes}m</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, !available && styles.cardDisabled]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={!onPress}
    >
      {/* Icon */}
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{icon}</Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <View style={styles.metaRow}>
          <View style={styles.rewardBadge}>
            <Text style={styles.rewardText}>{rewardMinutes} min</Text>
          </View>
          <View style={[styles.stackBadge, isStackable ? styles.stackable : styles.todayOnly]}>
            <Text style={[styles.stackText, isStackable ? styles.stackableText : styles.todayOnlyText]}>
              {isStackable ? 'Stackable' : 'Today'}
            </Text>
          </View>
        </View>
      </View>

      {/* Status indicator */}
      {statusLabel !== 'available' && (
        <View style={[styles.statusBadge, { backgroundColor: status.color + '18' }]}>
          <Ionicons name={status.icon as any} size={14} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      )}

      {available && statusLabel === 'available' && (
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary + '60'} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
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
    justifyContent: 'center',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rewardBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.primary + '12',
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
  stackable: { backgroundColor: '#E8F5E9' },
  todayOnly: { backgroundColor: '#FFF3E0' },
  stackText: { fontSize: 11, fontFamily: fonts.child.semiBold },
  stackableText: { color: '#388E3C' },
  todayOnlyText: { color: '#E65100' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
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
    alignItems: 'center',
    marginRight: spacing.sm,
    shadowColor: '#000',
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
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  compactReward: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.primary + '12',
    borderRadius: borderRadius.sm,
  },
  compactRewardText: {
    fontFamily: fonts.child.semiBold,
    fontSize: 12,
    color: colors.primary,
  },
});
