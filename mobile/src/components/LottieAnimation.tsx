import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, AccessibilityInfo } from "react-native";
import LottieView from "lottie-react-native";

interface LottieAnimationProps {
  /**
   * Animation source — pass require("../assets/animations/xxx.json")
   * or a remote URL string
   */
  source: any;
  /** Auto play on mount (default: true) */
  autoPlay?: boolean;
  /** Loop the animation (default: false) */
  loop?: boolean;
  /** Width of the animation container */
  width?: number;
  /** Height of the animation container */
  height?: number;
  /** Speed multiplier (default: 1) */
  speed?: number;
  /** Called when the animation finishes (if not looping) */
  onComplete?: () => void;
  style?: any;
}

/**
 * Reusable Lottie animation wrapper.
 * Respects iOS/Android "prefers reduced motion" — shows first frame instead.
 */
export function LottieAnimation({
  source,
  autoPlay = true,
  loop = false,
  width = 200,
  height = 200,
  speed = 1,
  onComplete,
  style,
}: LottieAnimationProps) {
  const lottieRef = useRef<LottieView>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => sub.remove();
  }, []);

  // If reduced motion is on, just show frame 0 (static)
  useEffect(() => {
    if (reduceMotion && lottieRef.current) {
      lottieRef.current.reset();
    }
  }, [reduceMotion]);

  return (
    <View
      style={[{ width, height }, style]}
      accessibilityLabel="Animation"
      accessibilityRole="image"
    >
      <LottieView
        ref={lottieRef}
        source={source}
        autoPlay={autoPlay && !reduceMotion}
        loop={loop && !reduceMotion}
        speed={speed}
        style={{ width, height }}
        onAnimationFinish={(isCancelled) => {
          if (!isCancelled) onComplete?.();
        }}
      />
    </View>
  );
}
