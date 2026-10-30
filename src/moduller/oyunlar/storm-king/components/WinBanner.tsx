import React, { memo, useEffect } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { StormEffectsArt } from '../constants/symbols';
import { STORM_THEME } from '../constants/theme';

type Props = {
  visible: boolean;
  title: string;
  amount: number;
  reduceMotion: boolean;
  /** Kazanç göstergesinin pencere ortasına göre konumu. */
  flyTo: { dx: number; dy: number } | null;
  onDone: () => void;
};

export const WinBanner = memo(function WinBanner({
  visible,
  title,
  amount,
  reduceMotion,
  flyTo,
  onDone,
}: Props) {
  const { width } = useWindowDimensions();
  const scale = useSharedValue(0.72);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const opacity = useSharedValue(1);
  const bolt = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    scale.value = 0.72;
    tx.value = 0;
    ty.value = 0;
    opacity.value = 1;
    bolt.value = 0;
    const intro = reduceMotion ? 0 : 240;
    scale.value = withTiming(1, { duration: intro, easing: Easing.out(Easing.cubic) });
    if (!reduceMotion) bolt.value = withTiming(1, { duration: 180 });

    const hold = reduceMotion ? 280 : 880;
    const fly = reduceMotion ? 0 : 520;
    const launch = setTimeout(() => {
      const dx = flyTo?.dx ?? 0;
      const dy = flyTo?.dy ?? Math.round(width * 0.42);
      tx.value = withTiming(dx, { duration: fly, easing: Easing.in(Easing.cubic) });
      ty.value = withTiming(dy, { duration: fly, easing: Easing.in(Easing.cubic) });
      scale.value = withTiming(reduceMotion ? 1 : 0.18, { duration: fly });
      opacity.value = withTiming(reduceMotion ? 0 : 0.15, { duration: fly });
    }, hold);
    const done = setTimeout(onDone, hold + fly + 40);
    return () => {
      clearTimeout(launch);
      clearTimeout(done);
    };
  }, [bolt, flyTo, onDone, opacity, reduceMotion, scale, tx, ty, visible, width]);

  const panel = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));
  const lightning = useAnimatedStyle(() => ({ opacity: bolt.value }));

  if (!visible) return null;

  return (
    <View style={styles.scrim} pointerEvents="box-none">
      {!reduceMotion ? (
        <Animated.Image
          source={StormEffectsArt.lightning}
          style={[styles.bolt, lightning]}
          resizeMode="contain"
        />
      ) : null}
      <Animated.View style={[styles.card, panel]}>
        <Pressable onPress={onDone} accessibilityRole="button">
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.amount}>{Math.trunc(amount).toLocaleString('tr-TR')}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bolt: { position: 'absolute', width: 280, height: 280 },
  card: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderRadius: 22,
    backgroundColor: 'rgba(18, 8, 28, 0.92)',
    borderWidth: 1.5,
    borderColor: STORM_THEME.gold,
  },
  title: { color: STORM_THEME.gold, fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  amount: { color: STORM_THEME.text, fontSize: 40, fontWeight: '900', textAlign: 'center' },
});
