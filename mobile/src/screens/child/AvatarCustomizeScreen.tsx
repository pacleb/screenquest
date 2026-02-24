import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { useAuthStore } from "../../store/auth";
import { colors, spacing, borderRadius, fonts, useTheme } from "../../theme";

const AVATAR_EMOJIS = [
  // Animals
  "🦁", "🐯", "🐻", "🐼", "🦊", "🐸",
  "🐨", "🐮", "🐷", "🐱", "🐶", "🐺",
  "🦄", "🐲", "🦖", "🐳", "🦅", "🦜",
  "🐧", "🦋", "🦝", "🐙", "🦕", "🐬",
  "🦓", "🐘", "🦒", "🐊", "🦔", "🐿️",
  // Characters & fun
  "🤖", "👾", "👻", "🧸", "🧙", "🦸",
  "🧜", "🧝", "🧚", "🎭", "🦩", "🦚",
  // Symbols & nature
  "🌟", "🔥", "🌈", "🚀", "🎮", "🎨",
  "🏆", "💎", "⚡", "🌊", "✨", "🎯",
];

export default function AvatarCustomize() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const updateAvatar = useAuthStore((s) => s.updateAvatar);
  const { colors: themeColors } = useTheme();
  const [saving, setSaving] = useState<string | null>(null);
  const currentAvatar = user?.avatarUrl || "😊";

  const handleSelect = async (emoji: string) => {
    if (saving || emoji === currentAvatar) return;
    setSaving(emoji);
    try {
      ReactNativeHapticFeedback.trigger("impactLight");
      await updateAvatar(emoji);
      navigation.goBack();
    } catch {
      setSaving(null);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: themeColors.card }]}
        >
          <Icon name="chevron-back" size={24} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>
          Choose Your Avatar
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Current Avatar Preview */}
      <View style={styles.previewArea}>
        <View style={[styles.previewCircle, { backgroundColor: themeColors.card }]}>
          <Text style={styles.previewEmoji}>{currentAvatar}</Text>
        </View>
        <Text style={[styles.previewLabel, { color: themeColors.textSecondary }]}>
          Your avatar
        </Text>
      </View>

      <Text style={[styles.hint, { color: themeColors.textSecondary }]}>
        Tap any icon to pick it as your avatar
      </Text>

      {/* Emoji Grid */}
      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {AVATAR_EMOJIS.map((emoji) => {
          const isSelected = emoji === currentAvatar;
          const isSaving = saving === emoji;

          return (
            <TouchableOpacity
              key={emoji}
              style={[
                styles.emojiCard,
                { backgroundColor: themeColors.card },
                isSelected && styles.emojiCardSelected,
              ]}
              onPress={() => handleSelect(emoji)}
              disabled={!!saving}
              activeOpacity={0.7}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.purple} />
              ) : (
                <Text style={styles.emoji}>{emoji}</Text>
              )}
              {isSelected && (
                <View style={styles.checkBadge}>
                  <Icon name="checkmark" size={10} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.childBg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: fonts.child.bold,
    fontSize: 20,
    color: colors.textPrimary,
  },
  previewArea: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  previewCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  previewEmoji: { fontSize: 60 },
  previewLabel: {
    fontFamily: fonts.child.semiBold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  hint: {
    fontFamily: fonts.child.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
    gap: spacing.sm,
    justifyContent: "center",
  },
  emojiCard: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  emojiCardSelected: {
    borderColor: colors.purple,
    backgroundColor: "#F3E8FF",
  },
  emoji: { fontSize: 40 },
  checkBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.purple,
    alignItems: "center",
    justifyContent: "center",
  },
});
