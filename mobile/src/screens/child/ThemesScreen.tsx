import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  RefreshControl,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useThemeStore } from "../../store/theme";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, borderRadius, fonts, typography } from "../../theme";
import type { ThemeData } from "../../services/theme";

const { width } = Dimensions.get("window");
const CARD_W = (width - spacing.lg * 2 - spacing.md) / 2;

export default function ThemeSelectionScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { themes, activeTheme, fetchThemes, setActiveTheme, loading } =
    useThemeStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchThemes();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchThemes();
    setRefreshing(false);
  }, []);

  const handleSelectTheme = async (theme: ThemeData) => {
    if (!theme.isUnlocked) {
      Alert.alert("🔒 Theme Locked", getUnlockHint(theme), [{ text: "OK" }]);
      return;
    }
    try {
      await ReactNativeHapticFeedback.trigger("impactMedium");
      await setActiveTheme(theme.id);
    } catch {
      Alert.alert("Oops", "Could not change theme. Try again!");
    }
  };

  const getUnlockHint = (theme: ThemeData): string => {
    switch (theme.unlockType) {
      case "level":
        return `Reach Level ${theme.unlockValue} to unlock this theme!`;
      case "streak":
        return `Get a ${theme.unlockValue}-day streak to unlock!`;
      case "achievement":
        return "Earn a special achievement to unlock!";
      case "premium":
        return "This is a premium theme — ask your parents!";
      default:
        return "Keep playing to unlock!";
    }
  };

  const unlockedThemes = themes.filter((t) => t.isUnlocked);
  const lockedThemes = themes.filter((t) => !t.isUnlocked);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[typography.childH2, { color: colors.textPrimary }]}>
          🎨 Themes
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Active Theme Preview */}
        {activeTheme && (
          <Animated.View
            entering={FadeIn.duration(400)}
            style={styles.previewSection}
          >
            <Text
              style={[
                typography.childCaption,
                { color: colors.textSecondary, marginBottom: spacing.xs },
              ]}
            >
              CURRENT THEME
            </Text>
            <ActiveThemePreview theme={activeTheme} />
          </Animated.View>
        )}

        {/* Unlocked Themes */}
        {unlockedThemes.length > 0 && (
          <View style={styles.section}>
            <Text
              style={[
                typography.childBodyBold,
                { color: colors.textPrimary, marginBottom: spacing.sm },
              ]}
            >
              ✨ Available
            </Text>
            <View style={styles.grid}>
              {unlockedThemes.map((theme, i) => (
                <Animated.View
                  key={theme.id}
                  entering={FadeInDown.delay(i * 80).duration(300)}
                >
                  <ThemeCard
                    theme={theme}
                    isActive={activeTheme?.id === theme.id}
                    onSelect={() => handleSelectTheme(theme)}
                  />
                </Animated.View>
              ))}
            </View>
          </View>
        )}

        {/* Locked Themes */}
        {lockedThemes.length > 0 && (
          <View style={styles.section}>
            <Text
              style={[
                typography.childBodyBold,
                { color: colors.textSecondary, marginBottom: spacing.sm },
              ]}
            >
              🔒 Locked
            </Text>
            <View style={styles.grid}>
              {lockedThemes.map((theme, i) => (
                <Animated.View
                  key={theme.id}
                  entering={FadeInDown.delay(i * 80 + 200).duration(300)}
                >
                  <ThemeCard
                    theme={theme}
                    isActive={false}
                    locked
                    onSelect={() => handleSelectTheme(theme)}
                  />
                </Animated.View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Active Theme Preview ────────────────────────────────────
function ActiveThemePreview({ theme }: { theme: ThemeData }) {
  const themeColors = theme.colors ?? {};
  const gradientColors = (theme.gradients as any)?.header ?? [
    themeColors.primary ?? "#4A90D9",
    themeColors.secondary ?? "#7ED321",
  ];

  return (
    <LinearGradient
      colors={gradientColors as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.preview}
    >
      <Text style={styles.previewName}>{theme.name}</Text>
      <Text style={styles.previewDesc}>{theme.description}</Text>
      <View style={styles.colorDots}>
        {Object.values(themeColors)
          .slice(0, 5)
          .map((color, i) => (
            <View
              key={i}
              style={[styles.colorDot, { backgroundColor: color as string }]}
            />
          ))}
      </View>
    </LinearGradient>
  );
}

// ─── Theme Card ──────────────────────────────────────────────
function ThemeCard({
  theme,
  isActive,
  locked,
  onSelect,
}: {
  theme: ThemeData;
  isActive: boolean;
  locked?: boolean;
  onSelect: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const themeColors = theme.colors ?? {};
  const primary = (themeColors.primary as string) ?? "#4A90D9";
  const secondary = (themeColors.secondary as string) ?? "#7ED321";

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPressIn={() => {
        scale.value = withSpring(0.95);
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
      }}
      onPress={onSelect}
    >
      <Animated.View style={[animStyle]}>
        <LinearGradient
          colors={[primary, secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.themeCard,
            isActive && styles.themeCardActive,
            locked && styles.themeCardLocked,
          ]}
        >
          {locked && (
            <View style={styles.lockOverlay}>
              <Icon
                name="lock-closed"
                size={24}
                color="rgba(255,255,255,0.9)"
              />
            </View>
          )}
          {isActive && (
            <View style={styles.activeBadge}>
              <Icon name="checkmark-circle" size={18} color="#FFF" />
            </View>
          )}
          <Text style={styles.cardName}>{theme.name}</Text>
          <View style={styles.cardDots}>
            {Object.values(themeColors)
              .slice(0, 4)
              .map((color, i) => (
                <View
                  key={i}
                  style={[
                    styles.smallDot,
                    { backgroundColor: color as string },
                  ]}
                />
              ))}
          </View>
          <Text style={styles.cardType}>
            {theme.unlockType === "free"
              ? "🆓"
              : theme.unlockType === "level"
                ? `⭐ Lv.${theme.unlockValue}`
                : theme.unlockType === "streak"
                  ? `🔥 ${theme.unlockValue}d`
                  : theme.unlockType === "premium"
                    ? "💎"
                    : "🏆"}
          </Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  previewSection: { marginBottom: spacing.lg },
  preview: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    minHeight: 120,
  },
  previewName: {
    fontFamily: fonts.child.bold,
    fontSize: 22,
    color: "#FFF",
    marginBottom: 4,
  },
  previewDesc: {
    fontFamily: fonts.child.regular,
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: spacing.sm,
  },
  colorDots: {
    flexDirection: "row",
    gap: 6,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },
  section: { marginBottom: spacing.lg },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  themeCard: {
    width: CARD_W,
    height: CARD_W * 0.9,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    justifyContent: "space-between",
  },
  themeCardActive: {
    borderWidth: 3,
    borderColor: "#FFD700",
  },
  themeCardLocked: {
    opacity: 0.6,
  },
  lockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    zIndex: 1,
  },
  activeBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 2,
  },
  cardName: {
    fontFamily: fonts.child.bold,
    fontSize: 14,
    color: "#FFF",
  },
  cardDots: {
    flexDirection: "row",
    gap: 4,
  },
  smallDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)",
  },
  cardType: {
    fontFamily: fonts.child.semiBold,
    fontSize: 11,
    color: "rgba(255,255,255,0.9)",
    alignSelf: "flex-end",
  },
});
