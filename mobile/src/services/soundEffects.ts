import { Audio } from "expo-av";
import { Platform } from "react-native";

/**
 * Lightweight sound effects system for ScreenQuest.
 *
 * Usage:
 *   await SoundEffects.play("questComplete");
 *
 * All sounds are optional tiny MP3/WAV files stored in mobile/assets/sounds/.
 * The system gracefully degrades — if a sound file is missing or audio fails,
 * it silently does nothing.
 */

// Sound asset map — maps keys to require() paths
// We use a factory pattern so the sounds are lazy-loaded
const SOUND_ASSETS: Record<string, () => any> = {
  // These will be populated when actual sound files are added.
  // For now we define the API shape and gracefully handle missing files.
  // questComplete: () => require("../../assets/sounds/quest-complete.mp3"),
  // levelUp: () => require("../../assets/sounds/level-up.mp3"),
  // achievementUnlock: () => require("../../assets/sounds/achievement.mp3"),
  // streakMilestone: () => require("../../assets/sounds/streak.mp3"),
  // timerWarning: () => require("../../assets/sounds/timer-warning.mp3"),
  // timerComplete: () => require("../../assets/sounds/timer-complete.mp3"),
  // buttonTap: () => require("../../assets/sounds/tap.mp3"),
};

class SoundEffectsManager {
  private enabled = true;
  private loadedSounds: Map<string, Audio.Sound> = new Map();

  /**
   * Toggle sound effects on/off.
   */
  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) this.unloadAll();
  }

  isEnabled() {
    return this.enabled;
  }

  /**
   * Play a sound effect by key.
   * Silently does nothing if the sound doesn't exist or playback fails.
   */
  async play(key: string): Promise<void> {
    if (!this.enabled) return;

    try {
      const assetLoader = SOUND_ASSETS[key];
      if (!assetLoader) return;

      // Reuse cached sound if available
      let sound = this.loadedSounds.get(key);
      if (sound) {
        await sound.setPositionAsync(0);
        await sound.playAsync();
        return;
      }

      // Load and play
      const { sound: newSound } = await Audio.Sound.createAsync(
        assetLoader(),
        { shouldPlay: true },
      );
      this.loadedSounds.set(key, newSound);
    } catch {
      // Silently fail — sound effects are non-critical
    }
  }

  /**
   * Preload commonly used sounds for instant playback.
   */
  async preload(keys: string[]): Promise<void> {
    for (const key of keys) {
      try {
        const assetLoader = SOUND_ASSETS[key];
        if (!assetLoader || this.loadedSounds.has(key)) continue;

        const { sound } = await Audio.Sound.createAsync(assetLoader());
        this.loadedSounds.set(key, sound);
      } catch {
        // Skip silently
      }
    }
  }

  /**
   * Unload all cached sounds to free memory.
   */
  async unloadAll(): Promise<void> {
    for (const [, sound] of this.loadedSounds) {
      try {
        await sound.unloadAsync();
      } catch {
        // Ignore
      }
    }
    this.loadedSounds.clear();
  }
}

/** Singleton instance */
export const SoundEffects = new SoundEffectsManager();

/**
 * Initialize audio mode for the app.
 * Call this once at app startup.
 */
export async function initAudio(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false, // Respect device silent switch
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  } catch {
    // Non-critical
  }
}
