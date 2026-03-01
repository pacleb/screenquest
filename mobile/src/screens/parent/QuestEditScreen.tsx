import { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { useAuthStore } from "../../store/auth";
import {
  questService,
  Quest,
  LibraryQuest,
  CreateQuestData,
} from "../../services/quest";
import { familyService, FamilyMember } from "../../services/family";
import { colors, spacing, borderRadius, typography } from "../../theme";
import { formatTimeLabel, formatTimeCompact } from "../../utils/formatTime";
import { eventBus, AppEvents } from "../../utils/eventBus";

const CATEGORIES = [
  { value: "chores", label: "Chores", icon: "🧹" },
  { value: "studying", label: "Studying", icon: "📖" },
  { value: "exercise", label: "Exercise", icon: "🏃" },
  { value: "reading", label: "Reading", icon: "📚" },
  { value: "creative", label: "Creative", icon: "🎨" },
  { value: "helping_others", label: "Helping Others", icon: "🤝" },
  { value: "custom", label: "Custom", icon: "⭐" },
];

const STACKING_OPTIONS = [
  {
    value: "stackable",
    label: "Stackable",
    desc: "Time stacks with other rewards",
  },
  {
    value: "non_stackable",
    label: "Today Only",
    desc: "Can only earn once per day",
  },
];

const RECURRENCE_OPTIONS = [
  { value: "one_time", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

const REWARD_PRESETS = [600, 900, 1200, 1800, 2700, 3600];

const EMOJI_OPTIONS = [
  "⭐",
  "🧹",
  "📖",
  "🏃",
  "📚",
  "🎨",
  "🤝",
  "🎹",
  "🚲",
  "🧘",
  "🍽️",
  "👕",
  "📝",
  "🏛️",
  "💝",
  "🧱",
  "✍️",
  "✏️",
  "🔢",
  "🗑️",
  "🛏️",
  "🍴",
];

type CreateTab = "custom" | "library";

export default function QuestEditScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id = route.params?.id;
  const user = useAuthStore((s) => s.user);
  const familyId = user?.familyId;

  const isEditMode = !!id;

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("⭐");
  const [category, setCategory] = useState("chores");
  const [rewardSeconds, setRewardSeconds] = useState(1800);
  const [stackingType, setStackingType] = useState("stackable");
  const [recurrence, setRecurrence] = useState("one_time");
  const [requiresProof, setRequiresProof] = useState(false);
  const [autoApprove, setAutoApprove] = useState(true);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);

  // UI state
  const [createTab, setCreateTab] = useState<CreateTab>("custom");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [children, setChildren] = useState<FamilyMember[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Library state
  const [libraryQuests, setLibraryQuests] = useState<LibraryQuest[]>([]);
  const [libraryCategory, setLibraryCategory] = useState<string | undefined>(
    undefined,
  );
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [selectedLibraryQuest, setSelectedLibraryQuest] =
    useState<LibraryQuest | null>(null);

  // Load children for assignment picker (re-fetch on focus)
  useFocusEffect(
    useCallback(() => {
      if (!familyId) return;
      familyService.getMembers(familyId).then((members) => {
        setChildren(members.filter((m) => m.role === "child"));
      });
    }, [familyId]),
  );

  // Load existing quest for edit mode
  useEffect(() => {
    if (!isEditMode || !familyId || !id) return;
    setLoading(true);
    questService
      .get(familyId, id)
      .then((quest) => {
        setName(quest.name);
        setDescription(quest.description || "");
        setIcon(quest.icon);
        setCategory(quest.category);
        setRewardSeconds(quest.rewardSeconds);
        setStackingType(quest.stackingType);
        setRecurrence(quest.recurrence);
        setRequiresProof(quest.requiresProof);
        setAutoApprove(quest.autoApprove);
        setSelectedChildIds(quest.assignments.map((a) => a.child.id));
      })
      .catch(() => Alert.alert("Error", "Failed to load quest"))
      .finally(() => setLoading(false));
  }, [isEditMode, familyId, id]);

  // Load library quests
  const fetchLibrary = useCallback(async () => {
    setLoadingLibrary(true);
    try {
      const data = await questService.getLibrary(libraryCategory);
      setLibraryQuests(data);
    } catch {
      Alert.alert("Error", "Failed to load quest library");
    } finally {
      setLoadingLibrary(false);
    }
  }, [libraryCategory]);

  useEffect(() => {
    if (createTab === "library") fetchLibrary();
  }, [createTab, fetchLibrary]);

  const toggleChild = (childId: string) => {
    setSelectedChildIds((prev) =>
      prev.includes(childId)
        ? prev.filter((id) => id !== childId)
        : [...prev, childId],
    );
  };

  const handleDelete = async () => {
    if (!familyId || !id) return;
    Alert.alert("Delete Quest", "Delete this quest? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await questService.remove(familyId, id);
            eventBus.emit(AppEvents.QUEST_CHANGED);
            navigation.goBack();
          } catch {
            Alert.alert("Error", "Failed to delete quest");
          }
        },
      },
    ]);
  };

  const handleSave = async () => {
    if (!familyId) return;

    if (!name.trim()) {
      Alert.alert("Validation", "Quest name is required");
      return;
    }
    if (selectedChildIds.length === 0) {
      Alert.alert("Validation", "Please assign at least one child");
      return;
    }
    if (rewardSeconds < 60) {
      Alert.alert(
        "Validation",
        "Reward must be at least 1 minute (60 seconds)",
      );
      return;
    }

    setSaving(true);
    try {
      const data: CreateQuestData = {
        name: name.trim(),
        description: description.trim() || undefined,
        icon,
        category,
        rewardSeconds,
        stackingType,
        recurrence,
        requiresProof,
        autoApprove,
        assignedChildIds: selectedChildIds,
      };

      if (isEditMode && id) {
        await questService.update(familyId, id, data);
      } else {
        await questService.create(familyId, data);
      }

      eventBus.emit(AppEvents.QUEST_CHANGED);
      navigation.goBack();
    } catch (error: any) {
      if (error.response?.status === 402) {
        Alert.alert(
          "Upgrade Required",
          error.response?.data?.message ||
            "Upgrade to Premium for unlimited quests.",
          [
            { text: "Later", style: "cancel" },
            {
              text: "Upgrade",
              onPress: () => navigation.navigate("Paywall"),
            },
          ],
        );
      } else {
        const msg = error.response?.data?.message || "Failed to save quest";
        Alert.alert("Error", msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddFromLibrary = async (lq: LibraryQuest) => {
    if (!familyId) return;

    if (selectedChildIds.length === 0) {
      Alert.alert("Assign Children", "Please select at least one child first", [
        { text: "OK" },
      ]);
      setSelectedLibraryQuest(lq);
      setCreateTab("custom");
      setName(lq.name);
      setDescription(lq.description || "");
      setIcon(lq.icon);
      setCategory(lq.category);
      setRewardSeconds(lq.suggestedRewardSeconds);
      setStackingType(lq.suggestedStackingType);
      return;
    }

    setSaving(true);
    try {
      await questService.createFromLibrary(familyId, lq.id, {
        rewardSeconds: lq.suggestedRewardSeconds,
        stackingType: lq.suggestedStackingType,
        assignedChildIds: selectedChildIds,
      });
      eventBus.emit(AppEvents.QUEST_CHANGED);
      navigation.goBack();
    } catch (error: any) {
      if (error.response?.status === 402) {
        Alert.alert(
          "Upgrade Required",
          error.response?.data?.message ||
            "Upgrade to Premium for unlimited quests.",
          [
            { text: "Later", style: "cancel" },
            {
              text: "Upgrade",
              onPress: () => navigation.navigate("Paywall"),
            },
          ],
        );
      } else {
        const msg = error.response?.data?.message || "Failed to add quest";
        Alert.alert("Error", msg);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 100 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Icon name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditMode ? "Edit Quest" : "New Quest"}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={styles.saveBtn}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Tab Switcher (only for create mode) */}
      {!isEditMode && (
        <View style={styles.tabRow}>
          {(["custom", "library"] as CreateTab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, createTab === tab && styles.tabActive]}
              onPress={() => setCreateTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  createTab === tab && styles.tabTextActive,
                ]}
              >
                {tab === "custom" ? "Custom Quest" : "Quest Library"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Library Tab */}
      {createTab === "library" && !isEditMode ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Child Assignment (shown at top so user picks children first) */}
          <Text style={styles.sectionLabel}>Assign to Children</Text>
          <View style={styles.childRow}>
            {children.length === 0 ? (
              <Text style={styles.noChildren}>
                No children added to your family yet
              </Text>
            ) : (
              children.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  style={[
                    styles.childChip,
                    selectedChildIds.includes(child.id) &&
                      styles.childChipSelected,
                  ]}
                  onPress={() => toggleChild(child.id)}
                >
                  <Text
                    style={[
                      styles.childChipText,
                      selectedChildIds.includes(child.id) &&
                        styles.childChipTextSelected,
                    ]}
                  >
                    {child.name}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Library Category Filter */}
          <Text style={styles.sectionLabel}>Browse by Category</Text>
          <View style={styles.catWrap}>
            <TouchableOpacity
              style={[styles.catChip, !libraryCategory && styles.catChipActive]}
              onPress={() => setLibraryCategory(undefined)}
            >
              <Text
                style={[
                  styles.catChipText,
                  !libraryCategory && styles.catChipTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {CATEGORIES.filter((c) => c.value !== "custom").map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.catChip,
                  libraryCategory === cat.value && styles.catChipActive,
                ]}
                onPress={() => setLibraryCategory(cat.value)}
              >
                <Text
                  style={[
                    styles.catChipText,
                    libraryCategory === cat.value && styles.catChipTextActive,
                  ]}
                >
                  {cat.icon} {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Library List */}
          {loadingLibrary ? (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={{ marginTop: 40 }}
            />
          ) : (
            libraryQuests.map((lq) => (
              <TouchableOpacity
                key={lq.id}
                style={styles.libraryCard}
                onPress={() => handleAddFromLibrary(lq)}
              >
                <Text style={styles.libraryIcon}>{lq.icon}</Text>
                <View style={styles.libraryInfo}>
                  <Text style={styles.libraryName}>{lq.name}</Text>
                  {lq.description && (
                    <Text style={styles.libraryDesc} numberOfLines={2}>
                      {lq.description}
                    </Text>
                  )}
                  <View style={styles.libraryMeta}>
                    <Text style={styles.libraryReward}>
                      {formatTimeLabel(lq.suggestedRewardSeconds)}
                    </Text>
                    {lq.ageRange && (
                      <Text style={styles.libraryAge}>
                        {lq.ageRange.replace("_", " ")}
                      </Text>
                    )}
                  </View>
                </View>
                <Icon name="add-circle" size={28} color={colors.primary} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : (
        /* Custom Quest Form */
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Icon + Name */}
          <Text style={styles.sectionLabel}>Quest Details</Text>
          <View style={styles.nameRow}>
            <TouchableOpacity
              style={styles.iconPicker}
              onPress={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Text style={styles.iconPickerText}>{icon}</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.nameInput}
              placeholder="Quest name"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              maxLength={200}
            />
          </View>

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <View style={styles.emojiGrid}>
              {EMOJI_OPTIONS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.emojiBtn,
                    icon === emoji && styles.emojiBtnSelected,
                  ]}
                  onPress={() => {
                    setIcon(emoji);
                    setShowEmojiPicker(false);
                  }}
                >
                  <Text style={styles.emojiBtnText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Description */}
          <TextInput
            style={styles.descInput}
            placeholder="Description (optional)"
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          {/* Category */}
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.optionGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.optionChip,
                  category === cat.value && styles.optionChipActive,
                ]}
                onPress={() => setCategory(cat.value)}
              >
                <Text style={styles.optionEmoji}>{cat.icon}</Text>
                <Text
                  style={[
                    styles.optionText,
                    category === cat.value && styles.optionTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Reward Seconds */}
          <Text style={styles.sectionLabel}>Reward Time</Text>
          <View style={styles.rewardRow}>
            {REWARD_PRESETS.map((secs) => (
              <TouchableOpacity
                key={secs}
                style={[
                  styles.rewardChip,
                  rewardSeconds === secs && styles.rewardChipActive,
                ]}
                onPress={() => setRewardSeconds(secs)}
              >
                <Text
                  style={[
                    styles.rewardChipText,
                    rewardSeconds === secs && styles.rewardChipTextActive,
                  ]}
                >
                  {formatTimeCompact(secs)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.customRewardRow}>
            <Text style={styles.customRewardLabel}>Custom:</Text>
            <TextInput
              style={styles.customRewardInput}
              value={String(Math.floor(rewardSeconds / 60))}
              onChangeText={(t) =>
                setRewardSeconds((parseInt(t, 10) || 0) * 60)
              }
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text style={styles.customRewardLabel}>minutes</Text>
          </View>

          {/* Stacking Type */}
          <Text style={styles.sectionLabel}>Stacking Type</Text>
          <View style={styles.stackRow}>
            {STACKING_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.stackCard,
                  stackingType === opt.value && styles.stackCardActive,
                ]}
                onPress={() => setStackingType(opt.value)}
              >
                <Text
                  style={[
                    styles.stackLabel,
                    stackingType === opt.value && styles.stackLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
                <Text style={styles.stackDesc}>{opt.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recurrence */}
          <Text style={styles.sectionLabel}>Recurrence</Text>
          <View style={styles.rewardRow}>
            {RECURRENCE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.rewardChip,
                  recurrence === opt.value && styles.rewardChipActive,
                ]}
                onPress={() => setRecurrence(opt.value)}
              >
                <Text
                  style={[
                    styles.rewardChipText,
                    recurrence === opt.value && styles.rewardChipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Assign Children */}
          <Text style={styles.sectionLabel}>Assign to Children</Text>
          <View style={styles.childRow}>
            {children.length === 0 ? (
              <Text style={styles.noChildren}>
                No children added to your family yet
              </Text>
            ) : (
              children.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  style={[
                    styles.childChip,
                    selectedChildIds.includes(child.id) &&
                      styles.childChipSelected,
                  ]}
                  onPress={() => toggleChild(child.id)}
                >
                  <Text
                    style={[
                      styles.childChipText,
                      selectedChildIds.includes(child.id) &&
                        styles.childChipTextSelected,
                    ]}
                  >
                    {child.name}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Toggles */}
          <Text style={styles.sectionLabel}>Options</Text>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Requires Photo Proof</Text>
              <Text style={styles.toggleDesc}>Child must submit a photo</Text>
            </View>
            <Switch
              value={requiresProof}
              onValueChange={(val) => {
                setRequiresProof(val);
                if (val) setAutoApprove(false);
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              accessibilityLabel="Requires photo proof"
            />
          </View>
          <View style={[styles.toggleRow, requiresProof && { opacity: 0.5 }]}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Auto-Approve</Text>
              <Text style={styles.toggleDesc}>
                {requiresProof
                  ? "Disabled — photo proof requires manual review"
                  : "Automatically approve completions"}
              </Text>
            </View>
            <Switch
              value={autoApprove}
              onValueChange={setAutoApprove}
              disabled={requiresProof}
              trackColor={{ false: colors.border, true: colors.primary }}
              accessibilityLabel="Auto-approve quest completions"
            />
          </View>

          {isEditMode && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Icon name="trash-outline" size={18} color={colors.error} />
              <Text style={styles.deleteBtnText}>Delete Quest</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: { marginRight: spacing.md },
  headerTitle: {
    flex: 1,
    ...typography.parentH2,
    fontWeight: "bold",
    color: colors.primary,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 70,
    alignItems: "center",
  },
  saveBtnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    alignItems: "center",
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  tabTextActive: { color: "#FFF" },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing.lg },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  iconPicker: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconPickerText: { fontSize: 28 },
  nameInput: {
    flex: 1,
    height: 56,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emojiBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: borderRadius.sm,
  },
  emojiBtnSelected: { backgroundColor: "#E3F2FD" },
  emojiBtnText: { fontSize: 24 },
  descInput: {
    marginTop: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    textAlignVertical: "top",
    minHeight: 80,
  },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  optionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  optionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionEmoji: { fontSize: 16 },
  optionText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  optionTextActive: { color: "#FFF" },
  rewardRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  rewardChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rewardChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rewardChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  rewardChipTextActive: { color: "#FFF" },
  customRewardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  customRewardLabel: { fontSize: 14, color: colors.textSecondary },
  customRewardInput: {
    width: 60,
    height: 40,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stackRow: { flexDirection: "row", gap: spacing.sm },
  stackCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
  },
  stackCardActive: { borderColor: colors.primary, backgroundColor: "#EBF5FB" },
  stackLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  stackLabelActive: { color: colors.primary },
  stackDesc: { fontSize: 12, color: colors.textSecondary },
  childRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  childChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
  },
  childChipSelected: {
    borderColor: colors.secondary,
    backgroundColor: "#E8F5E9",
  },
  childChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  childChipTextSelected: { color: "#2E7D32" },
  noChildren: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  toggleDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.error,
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.error,
  },
  // Library styles
  catWrap: { flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.md },
  catChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  catChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  catChipText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  catChipTextActive: { color: "#FFF" },
  libraryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  libraryIcon: { fontSize: 32, marginRight: spacing.md },
  libraryInfo: { flex: 1 },
  libraryName: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  libraryDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  libraryMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 4,
  },
  libraryReward: { fontSize: 13, fontWeight: "600", color: colors.primary },
  libraryAge: {
    fontSize: 11,
    color: colors.textSecondary,
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
});
