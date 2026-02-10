import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, borderRadius } from '../theme';

interface ProgressBarProps {
  progress: number; // 0-1
  color?: string;
  trackColor?: string;
  height?: number;
}

export function ProgressBar({
  progress,
  color = colors.primary,
  trackColor = colors.border,
  height = 8,
}: ProgressBarProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  return (
    <View style={[styles.track, { backgroundColor: trackColor, height }]}>
      <View
        style={[
          styles.fill,
          {
            backgroundColor: color,
            width: `${clampedProgress * 100}%`,
            height,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: borderRadius.sm,
  },
});
