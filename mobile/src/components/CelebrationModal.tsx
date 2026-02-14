import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
} from "react-native";
import { colors } from "../theme/colors";
import { fonts, typography } from "../theme/typography";
import { ConfettiOverlay } from "./ConfettiOverlay";
import { LottieAnimation } from "./LottieAnimation";
import { Animations } from "../../assets/animations";
import { SoundEffects } from "../services/soundEffects";
import { GamificationEvent } from "../services/gamification";

interface CelebrationModalProps {
  event: GamificationEvent | null;
  onDismiss: () => void;
}

export function CelebrationModal({ event, onDismiss }: CelebrationModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (event) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss after 4 seconds
      const timer = setTimeout(onDismiss, 4000);

      // Play appropriate sound
      if (event.newLevel) {
        SoundEffects.play("levelUp");
      } else if (event.newAchievements.length > 0) {
        SoundEffects.play("achievementUnlock");
      } else if (event.streakUpdated && event.currentStreak > 0) {
        SoundEffects.play("streakMilestone");
      } else {
        SoundEffects.play("questComplete");
      }

      return () => clearTimeout(timer);
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.5);
    }
  }, [event]);

  if (!event) return null;

  const showConfetti = !!event.newLevel || event.newAchievements.length > 0;

  return (
    <Modal transparent visible animationType="none">
      {showConfetti && <ConfettiOverlay active />}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onDismiss}
      >
        <Animated.View
          style={[
            styles.card,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* XP Earned */}
          <Text style={styles.xpText}>+{event.xpEarned} XP</Text>

          {event.currentStreak > 1 && (
            <Text style={styles.streakBonus}>Streak bonus included!</Text>
          )}

          {/* Level Up */}
          {event.newLevel && (
            <View style={styles.levelUpSection}>
              <LottieAnimation
                source={Animations.levelUp}
                autoPlay
                width={80}
                height={80}
                style={styles.lottieInline}
              />
              <Text style={styles.levelUpTitle}>Level Up!</Text>
              <Text style={styles.levelUpText}>
                Level {event.newLevel.level} — {event.newLevel.name}
              </Text>
            </View>
          )}

          {/* New Achievements */}
          {event.newAchievements.map((a) => (
            <View key={a.key} style={styles.achievementRow}>
              <LottieAnimation
                source={Animations.achievementUnlock}
                autoPlay
                width={48}
                height={48}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.achievementLabel}>
                  Achievement Unlocked!
                </Text>
                <Text style={styles.achievementName}>
                  {a.icon} {a.name}
                </Text>
              </View>
            </View>
          ))}

          {/* Streak */}
          {event.streakUpdated && event.currentStreak > 0 && (
            <Text style={styles.streakText}>
              🔥 {event.currentStreak}-day streak!
            </Text>
          )}

          <Text style={styles.tapHint}>Tap to continue</Text>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  xpText: {
    fontFamily: fonts.child.extraBold,
    fontSize: 40,
    color: colors.purple,
    marginBottom: 4,
  },
  streakBonus: {
    fontFamily: fonts.child.semiBold,
    fontSize: 14,
    color: colors.accent,
    marginBottom: 16,
  },
  levelUpSection: {
    alignItems: "center",
    marginVertical: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#F3E8FF",
    borderRadius: 16,
    width: "100%",
  },
  lottieInline: {
    marginBottom: -4,
  },
  levelUpTitle: {
    ...typography.childH2,
    color: colors.purple,
    marginTop: 4,
  },
  levelUpText: {
    ...typography.childBody,
    color: colors.textSecondary,
  },
  achievementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#FFF8E1",
    borderRadius: 12,
    width: "100%",
  },
  achievementIcon: {
    fontSize: 32,
  },
  achievementLabel: {
    fontFamily: fonts.child.semiBold,
    fontSize: 12,
    color: colors.accent,
    textTransform: "uppercase",
  },
  achievementName: {
    ...typography.childH3,
    color: colors.textPrimary,
  },
  streakText: {
    ...typography.childBodyBold,
    color: colors.accent,
    marginTop: 8,
  },
  tapHint: {
    ...typography.childCaption,
    color: colors.textSecondary,
    marginTop: 16,
  },
});
