import { useCallback, useEffect, useRef } from "react";
import { SoundEffects, initAudio } from "../services/soundEffects";

/**
 * Hook providing sound effect playback.
 * Initializes audio on first mount and provides a `play` function.
 *
 * Usage:
 *   const { play } = useSoundEffects();
 *   play("questComplete");
 */
export function useSoundEffects() {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      initAudio();
      // Preload commonly used sounds
      SoundEffects.preload(["questComplete", "buttonTap", "timerComplete"]);
    }
  }, []);

  const play = useCallback((key: string) => {
    SoundEffects.play(key);
  }, []);

  const setEnabled = useCallback((on: boolean) => {
    SoundEffects.setEnabled(on);
  }, []);

  const isEnabled = useCallback(() => {
    return SoundEffects.isEnabled();
  }, []);

  return { play, setEnabled, isEnabled };
}
