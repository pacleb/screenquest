import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../../store/auth";
import {
  notificationService,
  NotificationPreferences,
} from "../../services/notification";
import { colors, spacing, borderRadius, fonts, typography } from "../../theme";

interface PreferenceItem {
  key: keyof Omit<NotificationPreferences, "userId">;
  label: string;
  description: string;
  icon: string;
}

const PREFERENCE_ITEMS: PreferenceItem[] = [
  {
    key: "questCompletions",
    label: "Quest Completions",
    description: "When a child completes or submits a quest",
    icon: "checkmark-done-outline",
  },
  {
    key: "playRequests",
    label: "Play Requests",
    description: "When a child requests screen time",
    icon: "game-controller-outline",
  },
  {
    key: "playStateChanges",
    label: "Play Session Updates",
    description: "When play sessions start, end, or are paused",
    icon: "timer-outline",
  },
  {
    key: "violations",
    label: "Violations",
    description: "When a rule violation is recorded",
    icon: "warning-outline",
  },
  {
    key: "dailySummary",
    label: "Daily Summary",
    description: "End-of-day recap of activity",
    icon: "today-outline",
  },
  {
    key: "weeklySummary",
    label: "Weekly Summary",
    description: "Weekly progress overview",
    icon: "calendar-outline",
  },
];

export default function NotificationPreferencesScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    notificationService
      .getPreferences(user.id)
      .then(setPrefs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleToggle = async (
    key: keyof Omit<NotificationPreferences, "userId">,
    value: boolean,
  ) => {
    if (!user?.id || !prefs) return;
    setUpdating(key);
    const previous = prefs[key];
    setPrefs({ ...prefs, [key]: value });
    try {
      await notificationService.updatePreferences(user.id, { [key]: value });
    } catch {
      setPrefs({ ...prefs, [key]: previous });
    } finally {
      setUpdating(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: spacing.xl }}
          />
        ) : prefs ? (
          <>
            <Text style={styles.sectionDesc}>
              Choose which notifications you'd like to receive.
            </Text>

            {PREFERENCE_ITEMS.map((item) => (
              <View key={item.key} style={styles.row}>
                <Icon
                  name={item.icon}
                  size={22}
                  color={colors.primary}
                  style={styles.rowIcon}
                />
                <View style={styles.rowInfo}>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <Text style={styles.rowDesc}>{item.description}</Text>
                </View>
                <Switch
                  value={prefs[item.key] as boolean}
                  onValueChange={(val) => handleToggle(item.key, val)}
                  disabled={updating === item.key}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  accessibilityLabel={`Toggle ${item.label} notifications`}
                />
              </View>
            ))}
          </>
        ) : (
          <Text style={styles.errorText}>
            Failed to load preferences. Please try again.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.parentH2,
    fontWeight: "bold",
    color: colors.primary,
  },
  scrollContent: { padding: spacing.lg, paddingTop: 0 },
  sectionDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowIcon: {
    marginRight: spacing.md,
  },
  rowInfo: { flex: 1 },
  rowLabel: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: fonts.parent.semiBold,
    color: colors.textPrimary,
  },
  rowDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  errorText: {
    fontSize: 15,
    color: colors.error,
    textAlign: "center",
    marginTop: spacing.xl,
  },
});
