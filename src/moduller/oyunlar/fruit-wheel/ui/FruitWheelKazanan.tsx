import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { FRUIT_ACCENT, FRUIT_IMAGES, type FruitId } from '../sabitler/FruitWheelSabitleri';

type Props = {
  fruitId: FruitId;
  name: string;
  multiplier: number;
  matched: boolean;
  payoutText: string | null;
  title: string;
};

/** Kısa, görkemli kazanç kartı — sadece eşleşmede gösterilir. */
export function FruitWheelKazanan({
  fruitId,
  name,
  multiplier,
  matched,
  payoutText,
  title,
}: Props) {
  const scale = useSharedValue(0.35);
  const slide = useSharedValue(28);
  const spin = useSharedValue(0);
  const flash = useSharedValue(0);
  const glow = useSharedValue(0.4);
  const accent = FRUIT_ACCENT[fruitId];

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.55, { duration: 220, easing: Easing.out(Easing.cubic) }),
      withTiming(1.05, { duration: 180, easing: Easing.inOut(Easing.quad) }),
      withTiming(1, { duration: 120 }),
    );
    slide.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
    flash.value = withSequence(
      withTiming(1, { duration: 90 }),
      withTiming(0.15, { duration: 280 }),
      withTiming(0, { duration: 400 }),
    );
    glow.value = withRepeat(
      withSequence(withTiming(1, { duration: 280 }), withTiming(0.45, { duration: 280 })),
      3,
      false,
    );
    if (fruitId === 'cherry') {
      slide.value = withSequence(withTiming(14, { duration: 120 }), withTiming(0, { duration: 160 }));
    } else if (fruitId === 'strawberry' || fruitId === 'watermelon') {
      slide.value = withSequence(withTiming(-12, { duration: 200 }), withTiming(0, { duration: 160 }));
    } else if (fruitId === 'lemon' || fruitId === 'orange' || fruitId === 'pineapple' || fruitId === 'kiwi') {
      spin.value = withTiming(fruitId === 'kiwi' ? 360 : 200, { duration: 520, easing: Easing.out(Easing.cubic) });
    } else if (fruitId === 'grape') {
      slide.value = withRepeat(withTiming(6, { duration: 110 }), 4, true);
    }
  }, [flash, fruitId, glow, scale, slide, spin]);

  const artStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: slide.value },
      { rotate: `${spin.value}deg` },
      { scale: scale.value },
    ],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value * 0.55 }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + glow.value * 0.75,
    transform: [{ scale: 0.75 + scale.value * 0.4 }],
    borderColor: accent,
  }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.92 + Math.min(scale.value, 1) * 0.08 }],
    opacity: 0.55 + Math.min(scale.value, 1) * 0.45,
  }));

  return (
    <Animated.View style={[styles.card, cardStyle]} pointerEvents="none">
      <Animated.View style={[styles.ring, ringStyle]} />
      <Animated.View style={[styles.flash, { backgroundColor: accent }, flashStyle]} />
      <Text style={styles.badge}>{matched ? '★' : ''}</Text>
      {fruitId === 'cherry' ? (
        <View style={styles.pair}>
          <Animated.View style={[artStyle, { marginRight: -18 }]}>
            <Image source={FRUIT_IMAGES.cherry} style={styles.art} />
          </Animated.View>
          <Animated.View style={artStyle}>
            <Image source={FRUIT_IMAGES.cherry} style={styles.art} />
          </Animated.View>
        </View>
      ) : (
        <Animated.View style={artStyle}>
          <Image source={FRUIT_IMAGES[fruitId]} style={styles.art} />
        </Animated.View>
      )}
      {fruitId === 'grape' ? <GrapeSparks accent={accent} /> : null}
      <Text style={styles.name}>{name}</Text>
      <Text style={[styles.mult, { color: accent }]}>x{multiplier}</Text>
      <Text style={styles.body}>{title}</Text>
      {matched && payoutText ? <Text style={styles.pay}>{payoutText}</Text> : null}
    </Animated.View>
  );
}

function GrapeSparks({ accent }: { accent: string }) {
  return (
    <View style={styles.sparks}>
      {[0, 1, 2, 3].map((i) => (
        <Spark key={i} accent={accent} delay={i * 70} />
      ))}
    </View>
  );
}

function Spark({ accent, delay }: { accent: string; delay: number }) {
  const opacity = useSharedValue(0.15);
  useEffect(() => {
    opacity.value = withDelay(delay, withRepeat(withTiming(1, { duration: 160 }), 3, true));
  }, [delay, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.spark, { backgroundColor: accent }, style]} />;
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 100,
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(10,6,18,0.94)',
    borderWidth: 1.5,
    borderColor: '#F0D78A',
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    top: 6,
  },
  flash: { ...StyleSheet.absoluteFillObject },
  badge: {
    position: 'absolute',
    top: 10,
    right: 16,
    color: '#F0D78A',
    fontSize: 18,
    fontWeight: '900',
  },
  pair: { flexDirection: 'row', alignItems: 'center' },
  art: { width: 78, height: 78 },
  sparks: { flexDirection: 'row', gap: 8, marginTop: 4 },
  spark: { width: 8, height: 8, borderRadius: 4 },
  name: { color: '#FFF8EC', fontSize: 24, fontWeight: '900', marginTop: 4, letterSpacing: 0.4 },
  mult: { fontSize: 32, fontWeight: '900', marginTop: 2 },
  body: { color: '#E8DCC4', marginTop: 2, fontWeight: '700' },
  pay: { color: '#9EF0B4', fontSize: 22, fontWeight: '900', marginTop: 4 },
});
