import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { useAuthStore } from "../../store/auth";
import { playSessionService, PlaySession } from "../../services/playSession";
import { timeBankService, TimeBankBalance } from "../../services/timeBank";
import { colors, spacing, borderRadius, fonts, typography } from "../../theme";
import {
  CountdownRing,
  Button,
  ConfettiOverlay,
  LottieAnimation,
} from "../../components";
import { Animations } from "../../../assets/animations";
import { SoundEffects } from "../../services/soundEffects";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { formatTimeLabel } from "../../utils/formatTime";
import { eventBus, AppEvents } from "../../utils/eventBus";

type ScreenState =
  | "select"
  | "requesting"
  | "waiting"
  | "active"
  | "paused"
  | "completed";

export default function ChildPlay() {
  const user = useAuthStore((s) => s.user);
  const { isConnected } = useNetworkStatus();
  const [screenState, setScreenState] = useState<ScreenState>("select");
  const [balance, setBalance] = useState<TimeBankBalance>({
    stackableSeconds: 0,
    nonStackableSeconds: 0,
    totalSeconds: 0,
  });
  const [session, setSession] = useState<PlaySession | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const init = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [bal, activeSession] = await Promise.all([
        timeBankService.getBalance(user.id),
        playSessionService.getActiveSession(user.id),
      ]);
      setBalance(bal);

      if (activeSession) {
        setSession(activeSession);
        if (activeSession.status === "active") {
          setRemainingSeconds(activeSession.remainingSeconds);
          setScreenState("active");
        } else if (activeSession.status === "paused") {
          setRemainingSeconds(activeSession.remainingSeconds);
          setScreenState("paused");
        } else if (activeSession.status === "requested") {
          setScreenState("waiting");
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        syncWithServer();
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [session?.id]);

  useEffect(() => {
    if (screenState === "active" && remainingSeconds > 0) {
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setScreenState("completed");
            setShowConfetti(true);
            SoundEffects.play("timerComplete");
            // Notify other screens
            eventBus.emit(AppEvents.TIME_BANK_CHANGED);
            eventBus.emit(AppEvents.PLAY_SESSION_CHANGED);
            return 0;
          }
          // Play warning sound at 60 seconds remaining
          if (prev === 60) {
            SoundEffects.play("timerWarning");
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [screenState]);

  useEffect(() => {
    if (
      (screenState === "active" || screenState === "waiting") &&
      session?.id
    ) {
      syncRef.current = setInterval(syncWithServer, 60000);
    }
    return () => {
      if (syncRef.current) clearInterval(syncRef.current);
    };
  }, [screenState, session?.id]);

  const syncWithServer = async () => {
    if (!session?.id) return;
    try {
      const updated = await playSessionService.getSession(session.id);
      setSession(updated);

      if (updated.status === "active") {
        setRemainingSeconds(updated.remainingSeconds);
        setScreenState("active");
      } else if (updated.status === "paused") {
        setRemainingSeconds(updated.remainingSeconds);
        setScreenState("paused");
      } else if (
        updated.status === "completed" ||
        updated.status === "stopped"
      ) {
        setScreenState("completed");
        setRemainingSeconds(0);
      } else if (updated.status === "denied") {
        setScreenState("select");
        setSession(null);
        Alert.alert(
          "Request Denied",
          "Your play request was denied by a parent.",
        );
      } else if (updated.status === "requested") {
        setScreenState("waiting");
      }
    } catch {
      // silent
    }
  };

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
      const result = await playSessionService.requestPlay(
        user.id,
        Math.min(balance.totalSeconds, 14400),
      );
      setSession(result);
      if (result.status === "active") {
        setRemainingSeconds(result.remainingSeconds);
        setScreenState("active");
        eventBus.emit(AppEvents.PLAY_SESSION_CHANGED);
      } else {
        setScreenState("waiting");
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
      setScreenState("paused");
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
      setScreenState("active");
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
            setScreenState("completed");
            setRemainingSeconds(0);
            setShowConfetti(true);
            // Notify other screens that time bank & play session changed
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

  const handleDone = () => {
    setScreenState("select");
    setSession(null);
    setRemainingSeconds(0);
    setShowConfetti(false);
    init();
  };

  const totalSeconds = session ? session.requestedSeconds : 0;

  if (loading) {
    return (
      <SafeAreaView testID="child-play-screen" style={styles.container}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 100 }}
        />
      </SafeAreaView>
    );
  }

  // --- Completed State ---
  if (screenState === "completed") {
    return (
      <SafeAreaView testID="child-play-screen" style={styles.container}>
        <ConfettiOverlay
          active={showConfetti}
          onComplete={() => setShowConfetti(false)}
        />
        <View style={styles.centered}>
          <LottieAnimation
            source={Animations.timerComplete}
            autoPlay
            width={140}
            height={140}
            style={{ marginBottom: spacing.sm }}
          />
          <Text testID="play-completed-title" style={styles.completedTitle}>
            Great job!
          </Text>
          <Text style={styles.completedSubtitle}>
            You managed your screen time well!
          </Text>
          <Button
            title="Back to Play"
            onPress={handleDone}
            childFont
            style={{ marginTop: spacing.xl, minWidth: 180 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // --- Waiting for Approval ---
  if (screenState === "waiting") {
    return (
      <SafeAreaView testID="child-play-screen" style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.waitingEmoji}>⏳</Text>
          <ActivityIndicator
            size="large"
            color={colors.accent}
            style={{ marginVertical: spacing.md }}
          />
          <Text testID="play-waiting-title" style={styles.waitingTitle}>
            Request Sent!
          </Text>
          <Text style={styles.waitingSubtitle}>
            Waiting for your parent to approve{" "}
            {formatTimeLabel(balance.totalSeconds)}...
          </Text>
          <TouchableOpacity style={styles.cancelWaitBtn} onPress={handleDone}>
            <Text style={styles.cancelWaitText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- Active / Paused Timer ---
  if (screenState === "active" || screenState === "paused") {
    return (
      <SafeAreaView testID="child-play-screen" style={styles.container}>
        <View style={styles.timerContainer}>
          {screenState === "paused" && (
            <View style={styles.pausedBanner}>
              <Icon name="snow-outline" size={18} color={colors.accent} />
              <Text style={styles.pausedText}>PAUSED</Text>
            </View>
          )}

          {/* Countdown Ring */}
          <CountdownRing
            remainingSeconds={remainingSeconds}
            totalSeconds={totalSeconds}
          />

          {/* Controls */}
          <View style={styles.controlRow}>
            {screenState === "active" ? (
              <TouchableOpacity
                testID="play-pause-btn"
                style={styles.pauseBtn}
                onPress={handlePause}
                disabled={actionLoading}
                accessibilityLabel="Pause timer"
                accessibilityRole="button"
              >
                <Icon name="pause" size={28} color={colors.primary} />
                <Text style={styles.controlText}>Pause</Text>
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
                <Icon name="play" size={28} color="#FFF" />
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
              <Icon name="stop" size={24} color={colors.error} />
              <Text style={styles.stopText}>I'm Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // --- Time Selector (default) ---
  return (
    <SafeAreaView testID="child-play-screen" style={styles.container}>
      <View style={styles.selectContainer}>
        <Text style={styles.selectTitle}>Play Time</Text>

        {/* Balance display */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available</Text>
          <Text testID="play-balance-value" style={styles.balanceValue}>
            {formatTimeLabel(balance.totalSeconds)}
          </Text>
          {balance.nonStackableSeconds > 0 && (
            <Text style={styles.balanceExpiring}>
              {formatTimeLabel(balance.nonStackableSeconds)} expires today
            </Text>
          )}
        </View>

        {/* Start button */}
        <Button
          testID="play-start-btn"
          title="Start Playing!"
          onPress={handleRequestPlay}
          loading={actionLoading}
          disabled={balance.totalSeconds < 5}
          variant="success"
          size="lg"
          childFont
          style={styles.startBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.childBg },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },

  // Select screen
  selectContainer: { flex: 1, padding: spacing.lg },
  selectTitle: {
    ...typography.childH1,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  balanceCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.xl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceLabel: {
    fontFamily: fonts.child.semiBold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  balanceValue: {
    fontFamily: fonts.child.extraBold,
    fontSize: 36,
    color: colors.primary,
  },
  balanceExpiring: {
    fontFamily: fonts.child.semiBold,
    fontSize: 12,
    color: colors.accent,
    marginTop: spacing.xs,
  },

  startBtn: {
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },

  // Waiting
  waitingEmoji: { fontSize: 56, marginBottom: spacing.sm },
  waitingTitle: {
    ...typography.childH2,
    color: colors.textPrimary,
  },
  waitingSubtitle: {
    fontFamily: fonts.child.regular,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  cancelWaitBtn: { marginTop: spacing.xl },
  cancelWaitText: {
    fontFamily: fonts.child.semiBold,
    fontSize: 16,
    color: colors.textSecondary,
  },

  // Timer
  timerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  pausedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent + "18",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.xl,
  },
  pausedText: {
    fontFamily: fonts.child.extraBold,
    fontSize: 16,
    color: colors.accent,
    letterSpacing: 2,
  },
  controlRow: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.xl },
  pauseBtn: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary + "12",
  },
  controlText: {
    fontFamily: fonts.child.semiBold,
    fontSize: 14,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  resumeBtn: {
    alignItems: "center",
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
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.error + "10",
    borderWidth: 1,
    borderColor: colors.error + "25",
  },
  stopText: {
    fontFamily: fonts.child.semiBold,
    fontSize: 14,
    color: colors.error,
    marginTop: spacing.xs,
  },

  // Completed
  completedEmoji: { fontSize: 80, marginBottom: spacing.lg },
  completedTitle: {
    ...typography.childH1,
    color: colors.textPrimary,
  },
  completedSubtitle: {
    fontFamily: fonts.child.regular,
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: "center",
  },
});
