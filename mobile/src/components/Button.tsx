import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, borderRadius, spacing, fonts } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
  childFont?: boolean;
  testID?: string;
}

const variantStyles: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary: { bg: colors.primary, text: '#FFF' },
  secondary: { bg: colors.secondary, text: '#FFF' },
  danger: { bg: colors.error, text: '#FFF' },
  success: { bg: colors.secondary, text: '#FFF' },
  ghost: { bg: 'transparent', text: colors.primary, border: colors.primary + '30' },
};

const sizeStyles: Record<string, { padding: number; fontSize: number }> = {
  sm: { padding: spacing.sm + 2, fontSize: 13 },
  md: { padding: spacing.md, fontSize: 15 },
  lg: { padding: spacing.md + 4, fontSize: 17 },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  size = 'md',
  style,
  textStyle,
  childFont,
  testID,
}: ButtonProps) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];

  return (
    <TouchableOpacity
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          paddingVertical: s.padding,
          borderColor: v.border || 'transparent',
          borderWidth: v.border ? 1 : 0,
        },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              {
                color: v.text,
                fontSize: s.fontSize,
                fontFamily: childFont ? fonts.child.bold : fonts.parent.semiBold,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
  },
  disabled: { opacity: 0.5 },
  text: { fontWeight: '700' },
});
