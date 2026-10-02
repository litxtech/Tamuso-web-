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

export function FruitWheelKazanan({
  fruitId,
  name,
  multiplier,
  matched,
  payoutText,
  title,
}: Props) {
  const scale = useSharedValue(0.5);
  const slide = useSharedValue(0);
  const spin = useSharedValue(0);
  const flash = useSharedValue(0);
  const accent = FRUIT_ACCENT[fruitId];

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.4, { duration: 280, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 220 }),
    );
    flash.value = withSequence(withTiming(1, { duration: 120 }), withTiming(0, { duration: 420 }));
    if (fruitId === 'cherry') {
      slide.value = withSequence(withTiming(18, { duration: 160 }), withTiming(0, { duration: 180 }));
    } else if (fruitId === 'strawberry' || fruitId === 'watermelon') {
      slide.value = withSequence(withTiming(-16, { duration: 280 }), withTiming(0, { duration: 220 }));
    } else if (fruitId === 'lemon' || fruitId === 'orange' || fruitId === 'pineapple' || fruitId === 'kiwi') {
      spin.value = withTiming(fruitId === 'kiwi' ? 360 : 180, { duration: 700 });
    } else if (fruitId === 'grape') {
      slide.value = withRepeat(withTiming(8, { duration: 140 }), 4, true);
    }
  }, [flash, fruitId, scale, slide, spin]);

  const artStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: slide.value },
      { rotate: `${spin.value}deg` },
      { scale: scale.value },
    ],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + flash.value * 0.65,
    transform: [{ scale: 0.8 + scale.value * 0.35 }],
  }));

  const grape = fruitId === 'grape';

  return (
    <View style={styles.card} pointerEvents="none">
      <Animated.View style={[styles.ring, { borderColor: accent }, ringStyle]} />
      <Animated.View style={[styles.flash, { backgroundColor: accent }, flashStyle]} />
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
      {grape ? <GrapeSparks accent={accent} /> : null}
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.mult}>x{multiplier}</Text>
      <Text style={styles.body}>{title}</Text>
      {matched && payoutText ? <Text style={styles.pay}>{payoutText}</Text> : null}
    </View>
  );
}

function GrapeSparks({ accent }: { accent: string }) {
  return (
    <View style={styles.sparks}>
      {[0, 1, 2, 3].map((i) => (
        <Spark key={i} accent={accent} delay={i * 90} />
      ))}
    </View>
  );
}

function Spark({ accent, delay }: { accent: string; delay: number }) {
  const opacity = useSharedValue(0.2);
  useEffect(() => {
    opacity.value = withDelay(delay, withRepeat(withTiming(1, { duration: 220 }), 3, true));
  }, [delay, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.spark, { backgroundColor: accent }, style]} />;
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 108,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(12,8,22,0.92)',
    borderWidth: 1,
    borderColor: '#E6CE92',
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    top: 8,
  },
  flash: { ...StyleSheet.absoluteFillObject, opacity: 0.2 },
  pair: { flexDirection: 'row', alignItems: 'center' },
  art: { width: 72, height: 72 },
  sparks: { flexDirection: 'row', gap: 8, marginTop: 6 },
  spark: { width: 8, height: 8, borderRadius: 4 },
  name: { color: '#F7F1E4', fontSize: 22, fontWeight: '900', marginTop: 6 },
  mult: { color: '#E6CE92', fontSize: 28, fontWeight: '900' },
  body: { color: '#E8DCC4', marginTop: 4 },
  pay: { color: '#B6F2C4', fontSize: 20, fontWeight: '800', marginTop: 4 },
});
