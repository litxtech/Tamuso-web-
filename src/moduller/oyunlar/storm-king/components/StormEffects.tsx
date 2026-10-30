import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { StormEffectsArt } from '../constants/symbols';

type Burst = { id: number; x: number; y: number };

type Props = {
  bursts: readonly Burst[];
  cell: number;
};

export const StormEffects = memo(function StormEffects({ bursts, cell }: Props) {
  const shown = bursts.slice(0, 8);
  return (
    <>
      {shown.map((burst) => (
        <BurstImage key={burst.id} x={burst.x} y={burst.y} cell={cell} />
      ))}
    </>
  );
});

function BurstImage({ x, y, cell }: { x: number; y: number; cell: number }) {
  const opacity = useSharedValue(1);
  const [alive, setAlive] = useState(true);
  useEffect(() => {
    opacity.value = withTiming(0, { duration: 420 });
    const timer = setTimeout(() => setAlive(false), 440);
    return () => clearTimeout(timer);
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  if (!alive) return null;
  return (
    <View pointerEvents="none" style={[styles.burst, { left: x, top: y, width: cell, height: cell }]}>
      <Animated.Image
        source={StormEffectsArt.explosion}
        style={[StyleSheet.absoluteFill, style]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  burst: { position: 'absolute' },
});
