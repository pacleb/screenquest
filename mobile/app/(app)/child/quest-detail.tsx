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
import { colors, spacing, borderRadius } from '../../../src/theme';

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
          <TouchableOpacity onPress={() => router.back()}>
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
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>
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
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Quest Icon + Name */}
        <View style={styles.questHeader}>
          <Text style={styles.questIcon}>{quest.icon}</Text>
          <Text style={styles.questName}>{quest.name}</Text>
          {quest.description && (
            <Text style={styles.questDesc}>{quest.description}</Text>
          )}
        </View>

        {/* Reward Card */}
        <View style={styles.rewardCard}>
          <Text style={styles.rewardLabel}>Reward</Text>
          <Text style={styles.rewardValue}>{quest.rewardMinutes} min</Text>
        </View>

        {/* Stacking Info */}
        <View style={styles.infoCard}>
          <Ionicons
            name={quest.stackingType === 'stackable' ? 'layers-outline' : 'time-outline'}
            size={24}
            color={quest.stackingType === 'stackable' ? colors.secondary : colors.accent}
          />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              {quest.stackingType === 'stackable' ? 'Stackable Time' : 'Today Only'}
            </Text>
            <Text style={styles.infoDesc}>
              {quest.stackingType === 'stackable'
                ? 'This time carries over! It stays in your bank until you use it.'
                : "Use it today or it's gone! This time expires at midnight."}
            </Text>
          </View>
        </View>

        {/* Auto-approve info */}
        {quest.autoApprove && (
          <View style={styles.infoCard}>
            <Ionicons name="flash-outline" size={24} color={colors.secondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Instant Approval</Text>
              <Text style={styles.infoDesc}>
                This quest is auto-approved! Time is added instantly.
              </Text>
            </View>
          </View>
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
          <TouchableOpacity
            style={styles.completeBtn}
            onPress={handleComplete}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.completeBtnText}>I Did It!</Text>
            )}
          </TouchableOpacity>
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
  errorText: { fontSize: 16, color: colors.textSecondary },
  questHeader: { alignItems: 'center', marginBottom: spacing.xl },
  questIcon: { fontSize: 64, marginBottom: spacing.md },
  questName: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  questDesc: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
  rewardCard: {
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  rewardLabel: { fontSize: 14, fontWeight: '600', color: colors.primary },
  rewardValue: { fontSize: 36, fontWeight: '800', color: colors.primary },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  infoDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  proofSection: { marginTop: spacing.md },
  proofLabel: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
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
    borderColor: colors.primary + '30',
    borderStyle: 'dashed',
  },
  proofBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  proofPreview: { alignItems: 'center' },
  proofImage: { width: 200, height: 200, borderRadius: borderRadius.lg, marginBottom: spacing.sm },
  retakeBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  retakeBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  unavailableCard: {
    backgroundColor: colors.textSecondary + '15',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  unavailableText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
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
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md + 4,
    alignItems: 'center',
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  completeBtnText: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  // Success state
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  successIcon: { fontSize: 80, marginBottom: spacing.lg },
  successTitle: { fontSize: 32, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.md },
  successMessage: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  doneBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  doneBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
