import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  adet: number;
  aktifIndex: number;
  /** 0..1 mevcut çubuk ilerleme */
  ilerleme: number;
  duraklatildi: boolean;
};

function Cubuk({
  durum,
  ilerleme,
}: {
  durum: 'done' | 'active' | 'todo';
  ilerleme: number;
}) {
  const w = useSharedValue(durum === 'done' ? 1 : durum === 'active' ? ilerleme : 0);

  useEffect(() => {
    if (durum === 'done') {
      cancelAnimation(w);
      w.value = 1;
      return;
    }
    if (durum === 'todo') {
      cancelAnimation(w);
      w.value = 0;
      return;
    }
    w.value = withTiming(ilerleme, {
      duration: 80,
      easing: Easing.linear,
    });
  }, [durum, ilerleme, w]);

  const stil = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, w.value)) * 100}%`,
  }));

  return (
    <View style={styles.cubuk}>
      <Animated.View style={[styles.dolgu, stil]} />
    </View>
  );
}

export function HikayeIlerlemeCubugu({
  adet,
  aktifIndex,
  ilerleme,
  duraklatildi: _duraklatildi,
}: Props) {
  if (adet <= 0) return null;
  return (
    <View style={styles.wrap}>
      {Array.from({ length: adet }, (_, i) => {
        const durum =
          i < aktifIndex ? 'done' : i === aktifIndex ? 'active' : 'todo';
        return (
          <Cubuk
            key={i}
            durum={durum}
            ilerleme={durum === 'active' ? ilerleme : 0}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  cubuk: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.32)',
    overflow: 'hidden',
  },
  dolgu: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 1,
  },
});
