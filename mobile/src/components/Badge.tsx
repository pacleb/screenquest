import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, spacing, fonts } from '../theme';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'muted' | 'purple';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: string;
}

const badgeColors: Record<BadgeVariant, { bg: string; text: string }> = {
  primary: { bg: colors.primary + '18', text: colors.primary },
  success: { bg: colors.secondary + '18', text: colors.secondary },
  warning: { bg: colors.accent + '18', text: colors.accent },
  danger: { bg: colors.error + '18', text: colors.error },
  muted: { bg: colors.textSecondary + '15', text: colors.textSecondary },
  purple: { bg: colors.purple + '18', text: colors.purple },
};

export function Badge({ label, variant = 'primary', icon }: BadgeProps) {
  const c = badgeColors[variant];

  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={[styles.text, { color: c.text, fontFamily: fonts.parent.semiBold }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xl,
  },
  icon: { fontSize: 12 },
  text: { fontSize: 11, fontWeight: '700' },
});
