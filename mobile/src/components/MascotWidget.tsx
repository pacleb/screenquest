import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, fonts } from '../theme';

interface MascotWidgetProps {
  name?: string;
  size?: 'sm' | 'md' | 'lg';
}

function getGreeting(name?: string): string {
  const hour = new Date().getHours();
  const displayName = name || 'adventurer';

  if (hour < 12) {
    const mornings = [
      `Good morning, ${displayName}! Ready for today's quests?`,
      `Rise and shine, ${displayName}! Adventures await!`,
      `Morning, ${displayName}! Let's earn some time!`,
    ];
    return mornings[Math.floor(Math.random() * mornings.length)];
  }
  if (hour < 17) {
    const afternoons = [
      `Hey ${displayName}! How's your day going?`,
      `What's up, ${displayName}? Got quests to do?`,
      `Great day for quests, ${displayName}!`,
    ];
    return afternoons[Math.floor(Math.random() * afternoons.length)];
  }
  const evenings = [
    `Good evening, ${displayName}! Still earning time?`,
    `Hey ${displayName}! Wrapping up for today?`,
    `Evening, ${displayName}! Great job today!`,
  ];
  return evenings[Math.floor(Math.random() * evenings.length)];
}

export function MascotWidget({ name, size = 'md' }: MascotWidgetProps) {
  const greeting = getGreeting(name);
  const mascotSize = size === 'sm' ? 40 : size === 'md' ? 56 : 72;
  const fontSize = size === 'sm' ? 24 : size === 'md' ? 36 : 48;

  return (
    <View style={styles.container}>
      <View style={[styles.mascot, { width: mascotSize, height: mascotSize }]}>
        <Text style={{ fontSize }}>🦊</Text>
      </View>
      <View style={styles.bubble}>
        <View style={styles.bubbleArrow} />
        <Text style={styles.greeting}>{greeting}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  mascot: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  bubble: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleArrow: {
    position: 'absolute',
    left: -6,
    top: 14,
    width: 12,
    height: 12,
    backgroundColor: colors.card,
    transform: [{ rotate: '45deg' }],
  },
  greeting: {
    fontFamily: fonts.child.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
  },
});
