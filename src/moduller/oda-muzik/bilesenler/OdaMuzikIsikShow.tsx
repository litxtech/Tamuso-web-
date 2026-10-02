/**
 * Ses odası müzik ışığı — iki yavaş kenar wash.
 * Tam ekran flaş, dönen ışın ve çoklu nabız cihazı ısıtıp kare düşürüyordu.
 */

import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  aktif?: boolean;
};

function OdaMuzikIsikShowInner({ aktif = true }: Props) {
  const ust = useSharedValue(0);
  const alt = useSharedValue(0);

  useEffect(() => {
    if (!aktif) {
      cancelAnimation(ust);
      cancelAnimation(alt);
      ust.value = 0;
      alt.value = 0;
      return;
    }

    ust.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.18, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    alt.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(0.35, { duration: 3600, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.1, { duration: 3600, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );

    return () => {
      cancelAnimation(ust);
      cancelAnimation(alt);
    };
  }, [aktif, alt, ust]);

  const ustStil = useAnimatedStyle(() => ({ opacity: ust.value }));
  const altStil = useAnimatedStyle(() => ({ opacity: alt.value }));

  if (!aktif) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.ust, ustStil]}>
        <LinearGradient
          colors={['rgba(232,64,145,0.28)', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[styles.alt, altStil]}>
        <LinearGradient
          colors={['transparent', 'rgba(168,85,247,0.18)']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

export const OdaMuzikIsikShow = memo(OdaMuzikIsikShowInner);

const styles = StyleSheet.create({
  ust: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '22%',
  },
  alt: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '16%',
  },
});
