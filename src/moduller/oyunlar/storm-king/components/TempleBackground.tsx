import React, { memo, useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { StormBackground, StormEffectsArt } from '../constants/symbols';

type Props = {
  reduceMotion: boolean;
};

const PHOTO_ASPECT = 1080 / 2340;

export const TempleBackground = memo(function TempleBackground({ reduceMotion }: Props) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const drift = useSharedValue(0);
  const cover = coverFrame(box.width, box.height);

  useEffect(() => {
    if (reduceMotion) return;
    drift.value = withRepeat(
      withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [drift, reduceMotion]);

  const mist = useAnimatedStyle(() => ({
    opacity: 0.28 + drift.value * 0.22,
    transform: [{ translateY: drift.value * 18 }],
  }));

  return (
    <View
      style={styles.fill}
      pointerEvents="none"
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setBox((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
      }}
    >
      {cover ? (
        <View style={[styles.photo, cover]}>
          <Image source={StormBackground.temple} style={styles.bleed} resizeMode="stretch" />
        </View>
      ) : null}
      {!reduceMotion ? (
        <Animated.Image source={StormEffectsArt.glow} style={[styles.mist, mist]} resizeMode="contain" />
      ) : null}
    </View>
  );
});

function coverFrame(width: number, height: number): { width: number; height: number; left: number; top: number } | null {
  if (width <= 0 || height <= 0) return null;
  if (width / height > PHOTO_ASPECT) {
    const nextHeight = width / PHOTO_ASPECT;
    return { width, height: nextHeight, left: 0, top: (height - nextHeight) / 2 };
  }
  const nextWidth = height * PHOTO_ASPECT;
  return { width: nextWidth, height, left: (width - nextWidth) / 2, top: 0 };
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden', backgroundColor: '#12081C' },
  photo: { position: 'absolute' },
  bleed: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  mist: { position: 'absolute', top: 80, alignSelf: 'center', width: 220, height: 220 },
});
