import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Dimensions,
  ViewToken,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, fonts } from '../../src/theme';
import { Button } from '../../src/components';

const { width } = Dimensions.get('window');

const ONBOARDING_SLIDES = [
  {
    emoji: '🏰',
    title: 'Welcome to ScreenQuest!',
    description: 'Help your kids earn screen time through real-world quests and adventures!',
  },
  {
    emoji: '🎯',
    title: 'Parents Set Quests',
    description: 'Create custom quests like chores, homework, or exercise. Kids complete them to earn time!',
  },
  {
    emoji: '🚀',
    title: 'Everyone Wins!',
    description: 'Kids learn responsibility. Parents stay in control. Get started in just 2 minutes!',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const isLastSlide = currentIndex === ONBOARDING_SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Carousel */}
        <FlatList
          ref={flatListRef}
          data={ONBOARDING_SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width }]}>
              <Text style={styles.emoji}>{item.emoji}</Text>
              <Text style={styles.slideTitle}>{item.title}</Text>
              <Text style={styles.slideDesc}>{item.description}</Text>
            </View>
          )}
        />

        {/* Dots */}
        <View style={styles.dotsRow}>
          {ONBOARDING_SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentIndex && styles.dotActive]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <Button
            title={isLastSlide ? 'Get Started' : 'Next'}
            onPress={() => {
              if (isLastSlide) {
                router.push('/(auth)/register');
              } else {
                flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
              }
            }}
            size="lg"
            style={styles.primaryBtn}
          />

          <Button
            title="I already have an account"
            onPress={() => router.push('/(auth)/login')}
            variant="ghost"
            size="md"
          />

          <Button
            title="I'm a kid"
            onPress={() => router.push('/(auth)/login')}
            variant="ghost"
            size="sm"
            textStyle={{ color: colors.purple }}
            childFont
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: 'space-between' },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emoji: {
    fontSize: 96,
    marginBottom: spacing.lg,
  },
  slideTitle: {
    fontFamily: fonts.child.extraBold,
    fontSize: 28,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  slideDesc: {
    fontFamily: fonts.parent.regular,
    fontSize: 17,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: spacing.md,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  buttons: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  primaryBtn: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
