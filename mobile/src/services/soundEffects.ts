import Sound from "react-native-sound";

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

// Enable playback in silence mode (iOS)
try {
  Sound.setCategory("Playback", false);
} catch (e) {
  console.warn("Failed to set audio category:", e);
}

// Sound asset map — maps keys to filenames (bundled in app)
const SOUND_FILES: Record<string, string> = {
  questComplete: "quest-complete.wav",
  levelUp: "level-up.wav",
  achievementUnlock: "achievement.wav",
  streakMilestone: "streak.wav",
  timerWarning: "timer-warning.wav",
  timerComplete: "timer-complete.wav",
  buttonTap: "tap.wav",
};

class SoundEffectsManager {
  private enabled = true;
  private loadedSounds: Map<string, Sound> = new Map();

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
      const filename = SOUND_FILES[key];
      if (!filename) return;

      // Reuse cached sound if available
      const cached = this.loadedSounds.get(key);
      if (cached) {
        cached.stop(() => {
          cached.play();
        });
        return;
      }

      // Load and play
      const sound = new Sound(filename, Sound.MAIN_BUNDLE, (error) => {
        if (error) return; // Silently fail
        sound.play();
        this.loadedSounds.set(key, sound);
      });
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
        const filename = SOUND_FILES[key];
        if (!filename || this.loadedSounds.has(key)) continue;

        const sound = new Sound(filename, Sound.MAIN_BUNDLE, (error) => {
          if (!error) {
            this.loadedSounds.set(key, sound);
          }
        });
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
        sound.release();
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
  // react-native-sound handles audio mode via Sound.setCategory above
}
