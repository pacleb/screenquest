import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../../src/store/auth';
import { completionService, ChildQuest } from '../../../src/services/completion';
import { uploadService } from '../../../src/services/upload';
import { colors, spacing, borderRadius, fonts, typography } from '../../../src/theme';
import { Button, Card, Badge, ConfettiOverlay } from '../../../src/components';

export default function QuestDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const [quest, setQuest] = useState<ChildQuest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [resultStatus, setResultStatus] = useState<'approved' | 'pending' | null>(null);
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!user?.id || !id) return;
    completionService
      .listChildQuests(user.id)
      .then((quests) => {
        const found = quests.find((q) => q.id === id);
        if (found) setQuest(found);
      })
      .catch(() => Alert.alert('Error', 'Failed to load quest'))
      .finally(() => setLoading(false));
  }, [user?.id, id]);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required for proof photos');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setProofUri(result.assets[0].uri);
    }
  };

  const handlePickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library permission is required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setProofUri(result.assets[0].uri);
    }
  };

  const handleComplete = async () => {
    if (!user?.id || !quest) return;

    if (quest.requiresProof && !proofUri) {
      Alert.alert('Photo Required', 'This quest requires a proof photo. Take a photo first!', [
        { text: 'Take Photo', onPress: handlePickImage },
        { text: 'Choose from Library', onPress: handlePickFromLibrary },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }

    setSubmitting(true);
    try {
      let proofImageUrl: string | undefined;
      if (proofUri) {
        const uploadResult = await uploadService.uploadProof(proofUri);
        proofImageUrl = uploadResult.url;
      }
      const completion = await completionService.completeQuest(user.id, quest.id, proofImageUrl);
      setCompleted(true);
      setResultStatus(completion.status as 'approved' | 'pending');
      if (completion.status === 'approved') {
        setShowConfetti(true);
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to complete quest';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  if (!quest) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Quest not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Success state
  if (completed) {
    return (
      <SafeAreaView style={styles.container}>
        <ConfettiOverlay active={showConfetti} onComplete={() => setShowConfetti(false)} />
        <View style={styles.successContainer}>
          <Text style={styles.successEmoji}>
            {resultStatus === 'approved' ? '🎉' : '⏳'}
          </Text>
          <Text style={styles.successTitle}>
            {resultStatus === 'approved' ? 'Awesome!' : 'Submitted!'}
          </Text>
          <Text style={styles.successMessage}>
            {resultStatus === 'approved'
              ? `You earned ${quest.rewardMinutes} minutes! It's been added to your Time Bank.`
              : `Waiting for your parent to approve. You'll earn ${quest.rewardMinutes} minutes!`}
          </Text>
          <Button
            title="Done"
            onPress={() => router.back()}
            childFont
            style={{ marginTop: spacing.xl, minWidth: 160 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const isStackable = quest.stackingType === 'stackable';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Quest Icon + Name */}
        <View style={styles.questHeader}>
          <View style={[styles.iconBg, { backgroundColor: isStackable ? '#E8F5E9' : '#FFF3E0' }]}>
            <Text style={styles.questIcon}>{quest.icon}</Text>
          </View>
          <Text style={styles.questName}>{quest.name}</Text>
          {quest.description && (
            <Text style={styles.questDesc}>{quest.description}</Text>
          )}
        </View>

        {/* Reward Card */}
        <View style={styles.rewardCard}>
          <Text style={styles.rewardLabel}>Reward</Text>
          <View style={styles.rewardRow}>
            <Text style={styles.rewardValue}>{quest.rewardMinutes}</Text>
            <Text style={styles.rewardUnit}>minutes</Text>
          </View>
        </View>

        {/* Stacking Info */}
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons
              name={isStackable ? 'layers-outline' : 'time-outline'}
              size={24}
              color={isStackable ? colors.secondary : colors.accent}
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>
                {isStackable ? 'Stackable Time' : 'Today Only'}
              </Text>
              <Text style={styles.infoDesc}>
                {isStackable
                  ? 'This time is yours to keep! Use it whenever you want.'
                  : "Use it today or it's gone! This time resets at midnight."}
              </Text>
            </View>
          </View>
        </Card>

        {/* Auto-approve info */}
        {quest.autoApprove && (
          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="flash-outline" size={24} color={colors.secondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Instant Approval</Text>
                <Text style={styles.infoDesc}>
                  This quest is auto-approved! Time is added right away.
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Proof Photo Section */}
        {quest.requiresProof && (
          <View style={styles.proofSection}>
            <Text style={styles.proofLabel}>Photo Proof Required</Text>
            {proofUri ? (
              <View style={styles.proofPreview}>
                <Image source={{ uri: proofUri }} style={styles.proofImage} />
                <TouchableOpacity style={styles.retakeBtn} onPress={handlePickImage}>
                  <Text style={styles.retakeBtnText}>Retake</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.proofActions}>
                <TouchableOpacity style={styles.proofBtn} onPress={handlePickImage}>
                  <Ionicons name="camera-outline" size={24} color={colors.primary} />
                  <Text style={styles.proofBtnText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.proofBtn} onPress={handlePickFromLibrary}>
                  <Ionicons name="images-outline" size={24} color={colors.primary} />
                  <Text style={styles.proofBtnText}>Choose Photo</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Status message for unavailable quests */}
        {!quest.availableToComplete && (
          <View style={styles.unavailableCard}>
            <Text style={styles.unavailableText}>
              {quest.statusLabel === 'pending'
                ? 'Waiting for approval on your previous submission'
                : quest.statusLabel === 'completed_today'
                  ? "You've already completed this quest today"
                  : quest.statusLabel === 'completed_this_week'
                    ? "You've already completed this quest this week"
                    : 'This quest has already been completed'}
            </Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* "I Did It!" Button */}
      {quest.availableToComplete && (
        <View style={styles.bottomBar}>
          <Button
            title="I Did It!"
            onPress={handleComplete}
            loading={submitting}
            variant="success"
            size="lg"
            childFont
            style={styles.completeBtn}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.childBg },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  scrollContent: { paddingHorizontal: spacing.lg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontFamily: fonts.child.regular, fontSize: 16, color: colors.textSecondary },
  questHeader: { alignItems: 'center', marginBottom: spacing.xl },
  iconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  questIcon: { fontSize: 52 },
  questName: {
    ...typography.childH1,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  questDesc: {
    fontFamily: fonts.child.regular,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  rewardCard: {
    backgroundColor: colors.primary + '12',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  rewardLabel: {
    fontFamily: fonts.child.semiBold,
    fontSize: 14,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  rewardValue: {
    fontFamily: fonts.child.extraBold,
    fontSize: 44,
    color: colors.primary,
  },
  rewardUnit: {
    fontFamily: fonts.child.semiBold,
    fontSize: 18,
    color: colors.primary,
  },
  infoCard: { marginBottom: spacing.sm },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  infoContent: { flex: 1 },
  infoTitle: {
    fontFamily: fonts.child.bold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  infoDesc: {
    fontFamily: fonts.child.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 19,
  },
  proofSection: { marginTop: spacing.md },
  proofLabel: {
    fontFamily: fonts.child.bold,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  proofActions: { flexDirection: 'row', gap: spacing.sm },
  proofBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary + '25',
    borderStyle: 'dashed',
  },
  proofBtnText: {
    fontFamily: fonts.child.semiBold,
    fontSize: 14,
    color: colors.primary,
  },
  proofPreview: { alignItems: 'center' },
  proofImage: { width: 200, height: 200, borderRadius: borderRadius.lg, marginBottom: spacing.sm },
  retakeBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  retakeBtnText: { fontFamily: fonts.child.semiBold, fontSize: 14, color: colors.primary },
  unavailableCard: {
    backgroundColor: colors.textSecondary + '12',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  unavailableText: {
    fontFamily: fonts.child.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.childBg,
  },
  completeBtn: {
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  // Success state
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  successEmoji: { fontSize: 80, marginBottom: spacing.lg },
  successTitle: {
    ...typography.childH1,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  successMessage: {
    fontFamily: fonts.child.regular,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
