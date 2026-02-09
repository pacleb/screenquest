import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/auth';
import { playSessionService, PlaySession } from '../../../src/services/playSession';
import { timeBankService, TimeBankBalance } from '../../../src/services/timeBank';
import { colors, spacing, borderRadius } from '../../../src/theme';

const PRESETS = [15, 30, 45, 60, 90, 120];

type ScreenState = 'select' | 'requesting' | 'waiting' | 'active' | 'paused' | 'completed';

export default function ChildPlay() {
  const user = useAuthStore((s) => s.user);
  const [screenState, setScreenState] = useState<ScreenState>('select');
  const [balance, setBalance] = useState<TimeBankBalance>({ stackableMinutes: 0, nonStackableMinutes: 0, totalMinutes: 0 });
  const [selectedMinutes, setSelectedMinutes] = useState(30);
  const [session, setSession] = useState<PlaySession | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);

  // Fetch balance + check for active session on mount
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
        if (activeSession.status === 'active') {
          setRemainingSeconds(activeSession.remainingSeconds);
          setScreenState('active');
        } else if (activeSession.status === 'paused') {
          setRemainingSeconds(activeSession.remainingSeconds);
          setScreenState('paused');
        } else if (activeSession.status === 'requested') {
          setScreenState('waiting');
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

  // Handle app state changes — sync with server on foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        // App came to foreground — sync with server
        syncWithServer();
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [session?.id]);

  // Local countdown timer
  useEffect(() => {
    if (screenState === 'active' && remainingSeconds > 0) {
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setScreenState('completed');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [screenState]);

  // Sync with server every 60 seconds during active play
  useEffect(() => {
    if ((screenState === 'active' || screenState === 'waiting') && session?.id) {
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

      if (updated.status === 'active') {
        setRemainingSeconds(updated.remainingSeconds);
        setScreenState('active');
      } else if (updated.status === 'paused') {
        setRemainingSeconds(updated.remainingSeconds);
        setScreenState('paused');
      } else if (updated.status === 'completed' || updated.status === 'stopped') {
        setScreenState('completed');
        setRemainingSeconds(0);
      } else if (updated.status === 'denied') {
        setScreenState('select');
        setSession(null);
        Alert.alert('Request Denied', 'Your play request was denied by a parent.');
      } else if (updated.status === 'requested') {
        setScreenState('waiting');
      }
    } catch {
      // silent
    }
  };

  const handleRequestPlay = async () => {
    if (!user?.id) return;
    setActionLoading(true);
    try {
      const result = await playSessionService.requestPlay(user.id, selectedMinutes);
      setSession(result);

      if (result.status === 'active') {
        setRemainingSeconds(result.remainingSeconds);
        setScreenState('active');
      } else {
        setScreenState('waiting');
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to start play session';
      Alert.alert('Error', msg);
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
      setScreenState('paused');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to pause');
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
      setScreenState('active');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to resume');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    if (!session?.id) return;
    Alert.alert("I'm Done!", 'Stop playing and save remaining time?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Stop',
        onPress: async () => {
          setActionLoading(true);
          try {
            await playSessionService.stop(session.id);
            setScreenState('completed');
            setRemainingSeconds(0);
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to stop');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleDone = () => {
    setScreenState('select');
    setSession(null);
    setRemainingSeconds(0);
    init(); // Refresh balance
  };

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const progress = session
    ? 1 - remainingSeconds / (session.requestedMinutes * 60)
    : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  // --- Completed State ---
  if (screenState === 'completed') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.completedTitle}>Great job!</Text>
          <Text style={styles.completedSubtitle}>You managed your screen time well!</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
            <Text style={styles.doneBtnText}>Back to Play</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- Waiting for Approval ---
  if (screenState === 'waiting') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.waitingTitle}>Request Sent!</Text>
          <Text style={styles.waitingSubtitle}>
            Waiting for your parent to approve {selectedMinutes} minutes...
          </Text>
          <TouchableOpacity style={styles.cancelWaitBtn} onPress={handleDone}>
            <Text style={styles.cancelWaitText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- Active / Paused Timer ---
  if (screenState === 'active' || screenState === 'paused') {
    const isWarning = remainingSeconds <= 300 && remainingSeconds > 60;
    const isDanger = remainingSeconds <= 60;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.timerContainer}>
          {screenState === 'paused' && (
            <View style={styles.pausedBanner}>
              <Text style={styles.pausedText}>PAUSED</Text>
            </View>
          )}

          {/* Progress ring (simplified — circular background) */}
          <View style={[
            styles.timerRing,
            isDanger && styles.timerRingDanger,
            isWarning && styles.timerRingWarning,
          ]}>
            <Text style={[
              styles.timerText,
              isDanger && { color: colors.timerDanger },
              isWarning && { color: colors.timerWarning },
            ]}>
              {formatTime(remainingSeconds)}
            </Text>
            <Text style={styles.timerLabel}>remaining</Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
          </View>

          {/* Controls */}
          <View style={styles.controlRow}>
            {screenState === 'active' ? (
              <TouchableOpacity style={styles.pauseBtn} onPress={handlePause} disabled={actionLoading}>
                <Ionicons name="pause" size={28} color={colors.primary} />
                <Text style={styles.controlText}>Pause</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.resumeBtn} onPress={handleResume} disabled={actionLoading}>
                <Ionicons name="play" size={28} color="#FFF" />
                <Text style={styles.resumeText}>Resume</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.stopBtn} onPress={handleStop} disabled={actionLoading}>
              <Ionicons name="stop" size={24} color={colors.error} />
              <Text style={styles.stopText}>I'm Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // --- Time Selector (default) ---
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.selectContainer}>
        <Text style={styles.selectTitle}>Play Time</Text>

        {/* Balance display */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available</Text>
          <Text style={styles.balanceValue}>{balance.totalMinutes} min</Text>
          {balance.nonStackableMinutes > 0 && (
            <Text style={styles.balanceExpiring}>
              {balance.nonStackableMinutes} min expires today
            </Text>
          )}
        </View>

        {/* Time presets */}
        <Text style={styles.sectionLabel}>How long?</Text>
        <View style={styles.presetGrid}>
          {PRESETS.map((mins) => {
            const disabled = mins > balance.totalMinutes;
            return (
              <TouchableOpacity
                key={mins}
                style={[
                  styles.presetBtn,
                  selectedMinutes === mins && styles.presetBtnActive,
                  disabled && styles.presetBtnDisabled,
                ]}
                onPress={() => !disabled && setSelectedMinutes(mins)}
                disabled={disabled}
              >
                <Text style={[
                  styles.presetText,
                  selectedMinutes === mins && styles.presetTextActive,
                  disabled && styles.presetTextDisabled,
                ]}>
                  {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected time display */}
        <View style={styles.selectedDisplay}>
          <Text style={styles.selectedValue}>{selectedMinutes}</Text>
          <Text style={styles.selectedUnit}>minutes</Text>
        </View>

        {/* Start button */}
        <TouchableOpacity
          style={[styles.startBtn, (balance.totalMinutes < 5 || actionLoading) && styles.startBtnDisabled]}
          onPress={handleRequestPlay}
          disabled={balance.totalMinutes < 5 || actionLoading}
        >
          {actionLoading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.startBtnText}>Start Playing!</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.childBg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },

  // Select screen
  selectContainer: { flex: 1, padding: spacing.lg },
  selectTitle: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.lg },
  balanceCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.xl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  balanceValue: { fontSize: 36, fontWeight: '800', color: colors.primary },
  balanceExpiring: { fontSize: 12, color: colors.accent, marginTop: spacing.xs },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  presetBtn: {
    width: '30%' as any,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    flexGrow: 1,
  },
  presetBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  presetBtnDisabled: { opacity: 0.4 },
  presetText: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  presetTextActive: { color: colors.primary },
  presetTextDisabled: { color: colors.textSecondary },
  selectedDisplay: { alignItems: 'center', marginBottom: spacing.xl },
  selectedValue: { fontSize: 56, fontWeight: '800', color: colors.primary },
  selectedUnit: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
  startBtn: {
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
  startBtnDisabled: { backgroundColor: colors.textSecondary, shadowOpacity: 0 },
  startBtnText: { fontSize: 20, fontWeight: '800', color: '#FFF' },

  // Waiting
  waitingTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginTop: spacing.lg },
  waitingSubtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
  cancelWaitBtn: { marginTop: spacing.xl },
  cancelWaitText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },

  // Timer
  timerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  pausedBanner: {
    backgroundColor: colors.accent + '20',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
  },
  pausedText: { fontSize: 16, fontWeight: '800', color: colors.accent, letterSpacing: 2 },
  timerRing: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 8,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: spacing.xl,
  },
  timerRingWarning: { borderColor: colors.timerWarning },
  timerRingDanger: { borderColor: colors.timerDanger },
  timerText: { fontSize: 48, fontWeight: '800', color: colors.primary },
  timerLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.xs },
  progressBarBg: {
    width: '80%',
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  controlRow: { flexDirection: 'row', gap: spacing.lg },
  pauseBtn: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary + '15',
  },
  controlText: { fontSize: 14, fontWeight: '600', color: colors.primary, marginTop: spacing.xs },
  resumeBtn: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
  },
  resumeText: { fontSize: 14, fontWeight: '600', color: '#FFF', marginTop: spacing.xs },
  stopBtn: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.error + '10',
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  stopText: { fontSize: 14, fontWeight: '600', color: colors.error, marginTop: spacing.xs },

  // Completed
  completedTitle: { fontSize: 32, fontWeight: '800', color: colors.textPrimary },
  completedSubtitle: { fontSize: 16, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
  doneBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  doneBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
