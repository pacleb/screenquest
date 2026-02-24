import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';

interface AvatarProps {
  name: string;
  url?: string | null;
  size?: number;
  bgColor?: string;
}

export function Avatar({ name, url, size = 40, bgColor }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const bg = bgColor || colors.primary + '20';

  // Emoji avatar: url is set but doesn't start with "http" (it's an emoji string)
  if (url && !url.startsWith('http')) {
    return (
      <View
        style={[
          styles.fallback,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        ]}
      >
        <Text style={{ fontSize: size * 0.55 }}>{url}</Text>
      </View>
    );
  }

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      <Text
        style={[
          styles.initials,
          { fontSize: size * 0.4, fontFamily: fonts.child.bold },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { resizeMode: 'cover' },
  fallback: { justifyContent: 'center', alignItems: 'center' },
  initials: { color: colors.primary, fontWeight: '700' },
});
