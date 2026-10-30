/**
 * Ses odası oyun kartı — oda layout'una dokunmaz, açılışta bekletmez.
 * Koltuk / dock yerinde kalır; kart butonların üstünden açılır, hiçbirini taşımaz.
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { YaricapTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';

type Props = {
  topGap: number;
  /** Eski API — layout'u asla değiştirmez, kart butonların üstünden açılır. */
  bottomGap?: number;
  /** Alt köşeleri düzleştirir; kart telefonun altına kadar iner. */
  dibine?: boolean;
  oyunModu?: boolean;
  /** Tam ekran oyun kartında köşe yuvarlağını kapatır; süslü çerçeve kesilmez. */
  kare?: boolean;
  onGapPress?: () => void;
  children: React.ReactNode;
};

export function OyunOdaAltKart({
  topGap,
  bottomGap = 0,
  dibine = false,
  oyunModu = false,
  kare = false,
  onGapPress,
  children,
}: Props) {
  const gap = useSharedValue(topGap);
  const bottom = useSharedValue(bottomGap);

  useEffect(() => {
    gap.value = topGap;
  }, [gap, topGap]);

  useEffect(() => {
    bottom.value = bottomGap;
  }, [bottom, bottomGap]);

  const gapStil = useAnimatedStyle(() => ({
    height: gap.value,
  }));

  const kartStil = useAnimatedStyle(() => ({
    top: gap.value,
    bottom: bottom.value,
  }));

  return (
    <View style={styles.root} pointerEvents="box-none" collapsable={false}>
      <Animated.View style={[styles.gapWrap, gapStil]} pointerEvents="box-none">
        <Pressable
          style={[styles.gap, oyunModu && styles.gapOyun]}
          onPress={onGapPress}
          accessibilityLabel={
            onGapPress ? 'Oyun listesini kapat, odaya dön' : undefined
          }
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.kart,
          { top: topGap, bottom: bottomGap },
          oyunModu && styles.kartOyun,
          dibine && styles.kartDibine,
          kare && styles.kartKare,
          kartStil,
        ]}
      >
        {!oyunModu ? <View style={styles.handle} /> : null}
        <View style={styles.icerik}>{children}</View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 40,
    elevation: 24,
  },
  gapWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  gap: {
    flex: 1,
    height: '100%',
    backgroundColor: 'rgba(4, 6, 14, 0.18)',
  },
  gapOyun: {
    backgroundColor: 'rgba(4, 6, 14, 0.28)',
  },
  kart: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#0B0D16',
    borderTopLeftRadius: YaricapTokenlari.xl,
    borderTopRightRadius: YaricapTokenlari.xl,
    borderBottomLeftRadius: YaricapTokenlari.xl,
    borderBottomRightRadius: YaricapTokenlari.xl,
    borderWidth: 1,
    borderColor: 'rgba(232, 197, 71, 0.38)',
    overflow: 'hidden',
    zIndex: 2,
    elevation: 24,
  },
  kartOyun: {
    borderColor: 'rgba(232, 197, 71, 0.28)',
  },
  kartKare: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  kartDibine: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.28)',
    marginTop: 10,
    marginBottom: 4,
  },
  icerik: {
    flex: 1,
    minHeight: 0,
  },
});
