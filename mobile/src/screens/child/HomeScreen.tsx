import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { useAuthStore } from "../../store/auth";
import { timeBankService, TimeBankBalance } from "../../services/timeBank";
import { completionService, ChildQuest } from "../../services/completion";
import { violationService, ViolationStatus } from "../../services/violation";
import { playSessionService, PlaySession } from "../../services/playSession";
import { useGamificationStore } from "../../store/gamification";
import {
  colors,
  spacing,
  borderRadius,
  fonts,
  typography,
  useTheme,
} from "../../theme";
import {
  AnimatedHeader,
  MascotWidget,
  TimeBankDisplay,
  QuestCard,
  SectionHeader,
  EmptyState,
  CelebrationModal,
  SkeletonDashboard,
  CountdownRing,
  Button,
  ConfettiOverlay,
  LottieAnimation,
} from "../../components";
import { Animations } from "../../../assets/animations";
import { useThemeStore } from "../../store/theme";
import { useHaptics } from "../../hooks/useAccessibility";
import { offlineCache } from "../../services/offlineCache";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { SoundEffects } from "../../services/soundEffects";
import { eventBus, AppEvents } from "../../utils/eventBus";
import { formatTimeLabel } from "../../utils/formatTime";

export default function ChildHome() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const { colors: themeColors } = useTheme();
  const { isConnected } = useNetworkStatus();
  const { progress, pendingCelebration, fetchProgress, setCelebration } =
    useGamificationStore();
  const { weeklyStats, fetchWeeklyStats } = useThemeStore();
  const haptics = useHaptics();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<TimeBankBalance>({
    stackableSeconds: 0,
    nonStackableSeconds: 0,
    totalSeconds: 0,
  });
  const [quests, setQuests] = useState<ChildQuest[]>([]);
  const [violationStatus, setViolationStatus] =
    useState<ViolationStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // --- Play session state (merged from PlayScreen) ---
  type PlayState =
    | "idle"
    | "requesting"
    | "waiting"
    | "active"
    | "paused"
    | "completed";
  const [playState, setPlayState] = useState<PlayState>("idle");
  const [session, setSession] = useState<PlaySession | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef = useRef<PlaySession | null>(null);
  const playStateRef = useRef<PlayState>("idle");
  // Guard: prevent syncWithServer from overriding a client-side timer expiry
  const justCompletedRef = useRef(false);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  useEffect(() => {
    playStateRef.current = playState;
  }, [playState]);

  // --- Server sync for play session ---
  const syncWithServer = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (!currentSession?.id) return;
    // Skip sync if the client just completed the timer — the stop API call
    // is in flight and we don't want to reset back to "active".
    if (justCompletedRef.current) return;
    try {
      const updated = await playSessionService.getSession(currentSession.id);
      setSession(updated);
      if (updated.status === "active") {
        setRemainingSeconds(updated.remainingSeconds);
        setPlayState("active");
      } else if (updated.status === "paused") {
        setRemainingSeconds(updated.remainingSeconds);
        setPlayState("paused");
      } else if (
        updated.status === "completed" ||
        updated.status === "stopped"
      ) {
        setPlayState("completed");
        setRemainingSeconds(0);
        eventBus.emit(AppEvents.TIME_BANK_CHANGED);
        eventBus.emit(AppEvents.PLAY_SESSION_CHANGED);
      } else if (updated.status === "denied") {
        setPlayState("idle");
        setSession(null);
        Alert.alert(
          "Request Denied",
          "Your play request was denied by a parent.",
        );
      } else if (updated.status === "cancelled") {
        setPlayState("idle");
        setSession(null);
      } else if (updated.status === "requested") {
        setPlayState("waiting");
      }
    } catch {
      // silent
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [bal, q, vs, activeSession] = await Promise.all([
        timeBankService.getBalance(user.id),
        completionService.listChildQuests(user.id),
        violationService.getViolationStatus(user.id).catch(() => null),
        playSessionService.getActiveSession(user.id).catch(() => null),
        fetchProgress(user.id),
        fetchWeeklyStats(),
      ]);
      setBalance(bal);
      setQuests(q.filter((quest) => quest.availableToComplete).slice(0, 5));
      setViolationStatus(vs);

      if (activeSession) {
        setSession(activeSession);
        if (activeSession.status === "active") {
          setRemainingSeconds(activeSession.remainingSeconds);
          setPlayState("active");
        } else if (activeSession.status === "paused") {
          setRemainingSeconds(activeSession.remainingSeconds);
          setPlayState("paused");
        } else if (activeSession.status === "requested") {
          setPlayState("waiting");
        }
      } else if (
        sessionRef.current &&
        ["active", "paused", "waiting"].includes(playStateRef.current)
      ) {
        syncWithServer();
      }

      // Cache for offline use
      offlineCache.setTimeBank(user.id, bal).catch(() => {});
      offlineCache.setQuests(user.id, q).catch(() => {});
    } catch {
      // Try loading from cache
      const [cachedBal, cachedQuests] = await Promise.all([
        offlineCache.getTimeBank<TimeBankBalance>(user.id).catch(() => null),
        offlineCache.getQuests<ChildQuest[]>(user.id).catch(() => null),
      ]);
      if (cachedBal?.data) setBalance(cachedBal.data);
      if (cachedQuests?.data) {
        setQuests(
          cachedQuests.data.filter((q) => q.availableToComplete).slice(0, 5),
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, syncWithServer]);

  useAutoRefresh({
    fetchData,
    events: [
      AppEvents.TIME_BANK_CHANGED,
      AppEvents.PLAY_SESSION_CHANGED,
      AppEvents.QUEST_CHANGED,
      AppEvents.COMPLETION_CHANGED,
      AppEvents.VIOLATION_CHANGED,
      AppEvents.GAMIFICATION_CHANGED,
    ],
    intervalMs: 15_000,
  });

  // --- Local countdown timer ---
  useEffect(() => {
    if (playState === "active" && remainingSeconds > 0) {
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            // Set guard BEFORE state updates so sync doesn't reset us
            justCompletedRef.current = true;
            setPlayState("completed");
            setShowConfetti(true);
            // Play alarm sound (outside state updater via setTimeout)
            setTimeout(() => SoundEffects.play("timerComplete"), 0);
            // Tell the backend the session is over
            const sid = sessionRef.current?.id;
            if (sid) {
              playSessionService.stop(sid).catch(() => {
                /* silent */
              });
            }
            eventBus.emit(AppEvents.TIME_BANK_CHANGED);
            eventBus.emit(AppEvents.PLAY_SESSION_CHANGED);
            // Clear the guard after backend has had time to process
            setTimeout(() => {
              justCompletedRef.current = false;
            }, 5000);
            return 0;
          }
          if (prev === 60) {
            setTimeout(() => SoundEffects.play("timerWarning"), 0);
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playState]);

  // --- Sync poll every 15s (catches parent force-stop) ---
  useEffect(() => {
    if ((playState === "active" || playState === "waiting") && session?.id) {
      syncRef.current = setInterval(syncWithServer, 15_000);
    }
    return () => {
      if (syncRef.current) clearInterval(syncRef.current);
    };
  }, [playState, session?.id, syncWithServer]);

  // --- Play action handlers ---
  const handleRequestPlay = async () => {
    if (!user?.id) return;
    if (!isConnected) {
      Alert.alert(
        "No Internet",
        "Connect to the internet to start a play session.",
      );
      return;
    }
    setActionLoading(true);
    try {
      const requestedSecs = Math.floor(Math.min(balance.totalSeconds, 14400));
      if (requestedSecs < 60) {
        Alert.alert(
          "Not Enough Time",
          "You need at least 1 minute to start playing.",
        );
        return;
      }
      const result = await playSessionService.requestPlay(
        user.id,
        requestedSecs,
      );
      setSession(result);
      if (result.status === "active") {
        setRemainingSeconds(result.remainingSeconds);
        setPlayState("active");
        eventBus.emit(AppEvents.PLAY_SESSION_CHANGED);
      } else {
        setPlayState("waiting");
        eventBus.emit(AppEvents.PLAY_SESSION_CHANGED);
      }
    } catch (error: any) {
      const msg =
        error.response?.data?.message || "Failed to start play session";
      Alert.alert("Error", msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    if (!session?.id) return;
    setActionLoading(true);
    try {
      const updated = await playSessionService.pause(session.id);
      setSession(updated);
      setRemainingSeconds(updated.remainingSeconds);
      setPlayState("paused");
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed to pause");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    if (!session?.id) return;
    setActionLoading(true);
    try {
      const updated = await playSessionService.resume(session.id);
      setSession(updated);
      setRemainingSeconds(updated.remainingSeconds);
      setPlayState("active");
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed to resume");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    if (!session?.id) return;
    Alert.alert("I'm Done!", "Stop playing and save remaining time?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Stop",
        onPress: async () => {
          setActionLoading(true);
          try {
            await playSessionService.stop(session.id);
            setPlayState("completed");
            setRemainingSeconds(0);
            setShowConfetti(true);
            eventBus.emit(AppEvents.TIME_BANK_CHANGED);
            eventBus.emit(AppEvents.PLAY_SESSION_CHANGED);
          } catch (error: any) {
            Alert.alert(
              "Error",
              error.response?.data?.message || "Failed to stop",
            );
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handlePlayDone = () => {
    setPlayState("idle");
    setSession(null);
    // Update refs immediately so concurrent fetches/syncs see the reset state
    sessionRef.current = null;
    playStateRef.current = "idle";
    setRemainingSeconds(0);
    setShowConfetti(false);
    fetchData();
  };

  const handleCancelRequest = async () => {
    if (!session) return;
    try {
      await playSessionService.cancel(session.id);
    } catch (e) {
      // ignore — we still want to reset UI
    }
    handlePlayDone();
  };

  const totalSessionSeconds = session ? session.requestedSeconds : 0;

  const isNegativeBalance = balance.totalSeconds < 0;
  const canPlay = !isNegativeBalance && balance.totalSeconds >= 60;

  const completedToday = quests.filter((q) => (q as any).completedToday).length;

  return (
    <SafeAreaView
      testID="child-home-screen"
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={["top", "left", "right"]}
    >
      {/* Confetti overlay for play completion */}
      <ConfettiOverlay
        active={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Animated Gradient Header */}
        <AnimatedHeader
          name={user?.name || "Hero"}
          level={progress?.level ?? 1}
          levelName={progress?.levelName ?? "Starter"}
          xpProgress={progress?.xpProgressInLevel ?? 0}
          xpToNext={progress?.xpToNextLevel ?? 100}
          xpInLevel={progress?.xpInLevel ?? 0}
          xpForLevel={progress?.xpForLevel ?? 100}
          totalXp={progress?.totalXp ?? 0}
          streak={progress?.currentStreak ?? 0}
          weeklyXp={progress?.weeklyXp ?? 0}
          avatarEmoji={user?.avatarUrl || "😊"}
          onAvatarPress={() => navigation.navigate("AvatarCustomize")}
        />

        {/* Loading State */}
        {loading && <SkeletonDashboard />}

        {!loading && (
          <>
            {/* Context-Aware Mascot */}
            <MascotWidget
              name={user?.name}
              questsDone={completedToday}
              totalQuests={quests.length + completedToday}
              streak={progress?.currentStreak ?? 0}
              xpToNext={progress?.xpToNextLevel ?? 100}
              level={progress?.level ?? 1}
              onTap={() => haptics.notification("success")}
            />

            {/* Violation Indicator */}
            {violationStatus && violationStatus.currentCount > 0 && (
              <View style={styles.violationCard}>
                <Icon
                  name="alert-circle-outline"
                  size={20}
                  color={colors.accent}
                />
                <View style={styles.violationInfo}>
                  <Text style={styles.violationTitle}>
                    {violationStatus.currentCount}{" "}
                    {violationStatus.currentCount === 1 ? "strike" : "strikes"}
                  </Text>
                  <Text style={styles.violationHint}>
                    Keep up the good work to stay on track!
                  </Text>
                </View>
              </View>
            )}

            {/* Time Bank Display — hidden during active play to avoid duplicate timers */}
            {playState !== "active" &&
              playState !== "paused" &&
              playState !== "waiting" && (
                <TimeBankDisplay
                  stackableSeconds={balance.stackableSeconds}
                  nonStackableSeconds={balance.nonStackableSeconds}
                  totalSeconds={balance.totalSeconds}
                />
              )}

            {/* ─── Inline Play Controls ─── */}
            {playState === "completed" ? (
              <View style={styles.playCompletedCard}>
                <LottieAnimation
                  source={Animations.timerComplete}
                  autoPlay
                  width={100}
                  height={100}
                  style={{ marginBottom: spacing.sm }}
                />
                <Text
                  testID="play-completed-title"
                  style={styles.completedTitle}
                >
                  Great job!
                </Text>
                <Text style={styles.completedSubtitle}>
                  You managed your screen time well!
                </Text>
                <Button
                  title="Done"
                  onPress={handlePlayDone}
                  childFont
                  style={{ marginTop: spacing.md, minWidth: 140 }}
                />
              </View>
            ) : playState === "waiting" ? (
              <View style={styles.playWaitingCard}>
                <Text style={styles.waitingEmoji}>⏳</Text>
                <ActivityIndicator
                  size="small"
                  color={colors.accent}
                  style={{ marginVertical: spacing.sm }}
                />
                <Text testID="play-waiting-title" style={styles.waitingTitle}>
                  Request Sent!
                </Text>
                <Text style={styles.waitingSubtitle}>
                  Waiting for your parent to approve{" "}
                  {formatTimeLabel(balance.totalSeconds)}...
                </Text>
                <TouchableOpacity
                  style={styles.cancelWaitBtn}
                  onPress={handleCancelRequest}
                >
                  <Text style={styles.cancelWaitText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : playState === "active" || playState === "paused" ? (
              <View style={styles.playActiveCard}>
                {playState === "paused" && (
                  <View style={styles.pausedBanner}>
                    <Icon name="snow-outline" size={16} color={colors.accent} />
                    <Text style={styles.pausedBannerText}>PAUSED</Text>
                  </View>
                )}
                <CountdownRing
                  remainingSeconds={remainingSeconds}
                  totalSeconds={totalSessionSeconds}
                />
                <View style={styles.playControlRow}>
                  {playState === "active" ? (
                    <TouchableOpacity
                      testID="play-pause-btn"
                      style={styles.pauseBtn}
                      onPress={handlePause}
                      disabled={actionLoading}
                      accessibilityLabel="Pause timer"
                      accessibilityRole="button"
                    >
                      <Icon name="pause" size={26} color={colors.primary} />
                      <Text style={styles.pauseBtnText}>Pause</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      testID="play-resume-btn"
                      style={styles.resumeBtn}
                      onPress={handleResume}
                      disabled={actionLoading}
                      accessibilityLabel="Resume timer"
                      accessibilityRole="button"
                    >
                      <Icon name="play" size={26} color="#FFF" />
                      <Text style={styles.resumeBtnText}>Resume</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    testID="play-stop-btn"
                    style={styles.stopBtn}
                    onPress={handleStop}
                    disabled={actionLoading}
                    accessibilityLabel="Stop playing"
                    accessibilityRole="button"
                    accessibilityHint="Ends the current play session"
                  >
                    <Icon name="stop" size={22} color={colors.error} />
                    <Text style={styles.stopBtnText}>I'm Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* idle / select state — big PLAY button */
              <TouchableOpacity
                testID="play-start-btn"
                style={[
                  styles.playButton,
                  {
                    backgroundColor: themeColors.secondary,
                    shadowColor: themeColors.secondary,
                  },
                  !canPlay && styles.playButtonDisabled,
                ]}
                onPress={() => {
                  haptics.impact("medium");
                  handleRequestPlay();
                }}
                disabled={!canPlay || actionLoading}
                activeOpacity={0.85}
                accessibilityLabel="Start playing"
                accessibilityRole="button"
                accessibilityHint="Starts a play session using your time bank balance"
                accessibilityState={{ disabled: !canPlay }}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Icon
                      name="play-circle"
                      size={32}
                      color={canPlay ? "#FFF" : themeColors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.playText,
                        !canPlay && styles.playTextDisabled,
                      ]}
                    >
                      PLAY
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {quests.length === 0 && (
              <EmptyState
                emoji="📋"
                title="No quests available"
                message="Check back later or ask your parents!"
                childUI
                animated
              />
            )}

            {/* Available Quests */}
            {quests.length > 0 && (
              <View style={styles.questSection}>
                <SectionHeader
                  title="Available Quests"
                  action="See all"
                  onAction={() => navigation.navigate("Quests")}
                  childUI
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.questScroll}
                >
                  {quests.map((quest) => (
                    <QuestCard
                      key={quest.id}
                      icon={quest.icon}
                      name={quest.name}
                      rewardSeconds={quest.rewardSeconds}
                      stackingType={
                        quest.stackingType as "stackable" | "non_stackable"
                      }
                      category={(quest as any).category}
                      compact
                      onPress={() => {
                        haptics.impact("light");
                        navigation.navigate("QuestDetail", { id: quest.id });
                      }}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Celebration Modal */}
      {pendingCelebration && (
        <CelebrationModal
          event={pendingCelebration}
          onDismiss={() => setCelebration(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.childBg },
  scrollContent: { padding: spacing.lg, paddingBottom: 100 },
  violationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accent + "10",
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent + "25",
  },
  violationInfo: { flex: 1 },
  violationTitle: {
    fontFamily: fonts.child.bold,
    fontSize: 14,
    color: colors.accent,
  },
  violationHint: {
    fontFamily: fonts.child.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md + 4,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  playButtonDisabled: {
    backgroundColor: colors.textSecondary + "18",
    shadowOpacity: 0,
    elevation: 0,
  },
  playText: {
    fontFamily: fonts.child.extraBold,
    fontSize: 22,
    color: "#FFF",
    letterSpacing: 2,
  },
  playTextDisabled: { color: colors.textSecondary },
  questSection: { marginBottom: spacing.lg },
  questScroll: { paddingRight: spacing.lg },

  // --- Play active/paused card ---
  playActiveCard: {
    alignItems: "center" as const,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  pausedBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.sm,
    backgroundColor: colors.accent + "18",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
  },
  pausedBannerText: {
    fontFamily: fonts.child.extraBold,
    fontSize: 14,
    color: colors.accent,
    letterSpacing: 2,
  },
  playControlRow: {
    flexDirection: "row" as const,
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  pauseBtn: {
    alignItems: "center" as const,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary + "12",
  },
  pauseBtnText: {
    fontFamily: fonts.child.semiBold,
    fontSize: 14,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  resumeBtn: {
    alignItems: "center" as const,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
  },
  resumeBtnText: {
    fontFamily: fonts.child.semiBold,
    fontSize: 14,
    color: "#FFF",
    marginTop: spacing.xs,
  },
  stopBtn: {
    alignItems: "center" as const,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.error + "10",
    borderWidth: 1,
    borderColor: colors.error + "25",
  },
  stopBtnText: {
    fontFamily: fonts.child.semiBold,
    fontSize: 14,
    color: colors.error,
    marginTop: spacing.xs,
  },

  // --- Play waiting card ---
  playWaitingCard: {
    alignItems: "center" as const,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  waitingEmoji: { fontSize: 40, marginBottom: spacing.xs },
  waitingTitle: {
    ...typography.childH2,
    color: colors.textPrimary,
  },
  waitingSubtitle: {
    fontFamily: fonts.child.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center" as const,
    marginTop: spacing.xs,
  },
  cancelWaitBtn: { marginTop: spacing.md },
  cancelWaitText: {
    fontFamily: fonts.child.semiBold,
    fontSize: 15,
    color: colors.textSecondary,
  },

  // --- Play completed card ---
  playCompletedCard: {
    alignItems: "center" as const,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  completedTitle: {
    ...typography.childH2,
    color: colors.textPrimary,
  },
  completedSubtitle: {
    fontFamily: fonts.child.regular,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: "center" as const,
  },
});
