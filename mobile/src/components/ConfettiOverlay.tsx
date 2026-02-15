import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

interface ConfettiOverlayProps {
  active: boolean;
  onComplete?: () => void;
  count?: number;
}

const { width, height } = Dimensions.get('window');

export function ConfettiOverlay({ active, onComplete, count = 100 }: ConfettiOverlayProps) {
  const cannonRef = useRef<any>(null);

  useEffect(() => {
    if (active && cannonRef.current) {
      cannonRef.current.start();
    }
  }, [active]);

  if (!active) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <ConfettiCannon
        ref={cannonRef}
        count={count}
        origin={{ x: width / 2, y: -20 }}
        autoStart
        fadeOut
        fallSpeed={3000}
        explosionSpeed={400}
        colors={['#6B2FA0', '#4CD964', '#F5A623', '#8B5FBF', '#E74C3C', '#FFD700']}
        onAnimationEnd={onComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
});
