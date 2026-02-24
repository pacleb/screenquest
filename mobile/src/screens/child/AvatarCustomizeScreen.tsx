import { useEffect, useState, useCallback } from "react";
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
import {
  gamificationService,
  AvatarItemData,
} from "../../services/gamification";
import { colors, spacing, borderRadius, fonts, useTheme } from "../../theme";

const SLOTS = [
  "face",
  "hair",
  "hat",
  "outfit",
  "accessory",
  "background",
  "pet",
] as const;
const SLOT_LABELS: Record<string, string> = {
  face: "Face",
  hair: "Hair",
  hat: "Hats",
  outfit: "Outfits",
  accessory: "Accessories",
  background: "Backgrounds",
  pet: "Pets",
};
const SLOT_ICONS: Record<string, string> = {
  face: "😊",
  hair: "💇",
  hat: "🎩",
  outfit: "👕",
  accessory: "✨",
  background: "🌈",
  pet: "🐾",
};

export default function AvatarCustomize() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const { colors: themeColors } = useTheme();
  const [items, setItems] = useState<AvatarItemData[]>([]);
  const [activeSlot, setActiveSlot] = useState<string>("face");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await gamificationService.getAvatarItems(user.id);
      setItems(data);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const equippedBySlot = items.reduce<Record<string, AvatarItemData>>(
    (acc, item) => {
      if (item.isEquipped) acc[item.slot] = item;
      return acc;
    },
    {},
  );

  const slotItems = items.filter((i) => i.slot === activeSlot);

  const handleEquip = async (item: AvatarItemData) => {
    if (!user?.id || acting) return;
    setActing(item.id);
    try {
      ReactNativeHapticFeedback.trigger("impactLight");
      if (item.isEquipped) {
        await gamificationService.unequipSlot(user.id, item.slot);
      } else {
        await gamificationService.equipItem(user.id, item.id);
      }
      await loadItems();
    } catch {
      // silently handle
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      </SafeAreaView>
    );
  }

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
          Customize Avatar
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Avatar Preview */}
      <View style={styles.previewArea}>
        <View style={styles.previewCircle}>
          <Text style={styles.previewBase}>😊</Text>
          {equippedBySlot.hat && (
            <Text style={styles.equippedHat}>{equippedBySlot.hat.icon}</Text>
          )}
          {equippedBySlot.pet && (
            <Text style={styles.equippedPet}>{equippedBySlot.pet.icon}</Text>
          )}
        </View>
        <View style={styles.equippedRow}>
          {SLOTS.map((slot) => (
            <View key={slot} style={styles.equippedSlot}>
              <Text style={styles.equippedSlotIcon}>
                {equippedBySlot[slot]?.icon ?? SLOT_ICONS[slot]}
              </Text>
              <Text style={styles.equippedSlotLabel}>
                {equippedBySlot[slot] ? equippedBySlot[slot].name : "None"}
              </Text>
            </View>
          ))}
        </View>
      </View>

          {/* Slot Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScroll}
          >
            {SLOTS.map((slot) => (
              <TouchableOpacity
                key={slot}
                style={[styles.tab, activeSlot === slot && styles.tabActive]}
                onPress={() => setActiveSlot(slot)}
              >
                <Text style={styles.tabIcon}>{SLOT_ICONS[slot]}</Text>
                <Text
                  style={[
                    styles.tabLabel,
                    activeSlot === slot && styles.tabLabelActive,
                  ]}
                >
                  {SLOT_LABELS[slot]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Items Grid */}
          <ScrollView contentContainerStyle={styles.itemsGrid}>
            {slotItems.map((item) => {
              const isEquipped = item.isEquipped;
              const isActing = acting === item.id;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.itemCard,
                    isEquipped && styles.itemCardEquipped,
                  ]}
                  onPress={() => handleEquip(item)}
                  disabled={isActing}
                  activeOpacity={0.7}
                >
                  {isActing ? (
                    <ActivityIndicator
                      size="small"
                      color={themeColors.primary}
                    />
                  ) : (
                    <Text style={styles.itemIcon}>{item.icon}</Text>
                  )}
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {isEquipped && (
                    <View style={styles.equippedBadge}>
                      <Text style={styles.equippedBadgeText}>Equipped</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
            {slotItems.length === 0 && (
              <Text style={styles.emptyText}>No items in this slot yet</Text>
            )}
          </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.childBg },
  loadingCenter: { flex: 1, justifyContent: "center", alignItems: "center" },
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
    paddingVertical: spacing.md,
  },
  previewCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  previewBase: { fontSize: 56 },
  equippedHat: {
    position: "absolute",
    top: -8,
    fontSize: 28,
  },
  equippedPet: {
    position: "absolute",
    bottom: -4,
    right: -4,
    fontSize: 24,
  },
  equippedRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
  },
  equippedSlot: {
    alignItems: "center",
    width: 56,
  },
  equippedSlotIcon: { fontSize: 28 },
  equippedSlotLabel: {
    fontFamily: fonts.child.regular,
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: "center",
  },
  tabsScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: "#F3E8FF",
    borderColor: colors.purple,
  },
  tabIcon: { fontSize: 30 },
  tabLabel: {
    fontFamily: fonts.child.semiBold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  tabLabelActive: { color: colors.purple },
  itemsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: 100,
  },
  itemCard: {
    width: "30%",
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  itemCardEquipped: {
    borderColor: colors.purple,
    backgroundColor: "#F3E8FF",
  },
  itemIcon: { fontSize: 56, marginBottom: 4 },
  itemName: {
    fontFamily: fonts.child.bold,
    fontSize: 11,
    color: colors.textPrimary,
    textAlign: "center",
  },
  equippedBadge: {
    backgroundColor: colors.purple,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
    marginTop: 4,
  },
  equippedBadgeText: {
    fontFamily: fonts.child.bold,
    fontSize: 9,
    color: "#FFF",
  },
  emptyText: {
    fontFamily: fonts.child.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    width: "100%",
    paddingVertical: spacing.xl,
  },

});
