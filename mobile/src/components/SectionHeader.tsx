import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, fonts } from '../theme';

interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
  childUI?: boolean;
}

export function SectionHeader({ title, action, onAction, childUI }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.title,
          { fontFamily: childUI ? fonts.child.bold : fonts.parent.semiBold },
        ]}
      >
        {title}
      </Text>
      {action && onAction && (
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.action}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    color: colors.textPrimary,
  },
  action: {
    fontFamily: fonts.parent.semiBold,
    fontSize: 14,
    color: colors.primary,
  },
});
