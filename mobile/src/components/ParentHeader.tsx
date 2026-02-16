import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useTheme } from "../theme/ThemeContext";
import { spacing } from "../theme";

interface ParentHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Remove horizontal padding (e.g. for toolbar-style headers that handle their own padding) */
  noPadding?: boolean;
}

/**
 * Shared purple gradient header for parent screens.
 * Matches the child AnimatedHeader color scheme.
 */
export function ParentHeader({
  children,
  style,
  noPadding,
}: ParentHeaderProps) {
  const { gradients } = useTheme();

  return (
    <LinearGradient
      colors={gradients.header as [string, string]}
      style={[styles.gradient, noPadding && styles.noPadding, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  noPadding: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
});
