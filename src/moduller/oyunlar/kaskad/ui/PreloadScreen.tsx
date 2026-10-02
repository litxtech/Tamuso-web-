/**
 * Preload — hücre boyutunda GPU warm (1×1 yetmez; semboller sonradan gelmesin).
 */

import React, { memo, useCallback, useEffect, useRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { GAME_DISPLAY_NAME, GAME_SUBTITLE } from '../sabitler/KaskadSabitleri';
import { TipografiTokenlari } from '../../../../tasarim-sistemi/TipografiTokenlari';
import { CharacterImages, SymbolImages } from '../assets/VisualAssets';
import { kaskadVisualsCached } from '../assets/preloadKaskadAssets';

type Props = {
  progress: number;
  onImagesWarmed?: () => void;
};

const AVATAR = 112;
/** Tahta hücresine yakın — GPU bu boyutta decode etsin, 1024 kaynak beklemesin */
const WARM_SIZE = 96;
const WARM_TIMEOUT_MS = 2500;
const SYMBOL_SOURCES = Object.values(SymbolImages);

function PreloadScreenInner({ progress, onImagesWarmed }: Props) {
  const pulse = useSharedValue(0.96);
  const pending = useRef(SYMBOL_SOURCES.length);
  const notified = useRef(false);
  const onWarmedRef = useRef(onImagesWarmed);
  onWarmedRef.current = onImagesWarmed;

  const notify = useCallback(() => {
    if (notified.current) return;
    notified.current = true;
    onWarmedRef.current?.();
  }, []);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.96, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [pulse]);

  useEffect(() => {
    if (kaskadVisualsCached()) notify();
    const t = setTimeout(notify, WARM_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [notify]);

  const onWarmLoad = useCallback(() => {
    pending.current -= 1;
    if (pending.current <= 0) notify();
  }, [notify]);

  const avatarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const pct = Math.min(100, Math.max(0, Math.round(progress)));

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0B1020', '#1A1440', '#0A1628', '#050810']}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(111,227,255,0.12)', 'transparent', 'rgba(201,162,74,0.1)']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.avatarWrap, avatarStyle]}>
        <View style={styles.avatarGlow} />
        <LinearGradient
          colors={['#6FE3FF', '#C9A24A', '#E8C878', '#6FE3FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarRing}
        >
          <View style={styles.avatarInner}>
            <Image
              source={CharacterImages.stormKeeper}
              style={styles.avatarImg}
              resizeMode="cover"
              fadeDuration={0}
            />
          </View>
        </LinearGradient>
      </Animated.View>

      <Text style={styles.logo}>{GAME_DISPLAY_NAME.toUpperCase()}</Text>
      <Text style={styles.subtitle}>{GAME_SUBTITLE.toUpperCase()}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.pct}>{pct}%</Text>

      <View style={styles.warm} pointerEvents="none" collapsable={false}>
        {SYMBOL_SOURCES.map((src, i) => (
          <Image
            key={i}
            source={src}
            style={styles.warmImg}
            resizeMode="contain"
            fadeDuration={0}
            onLoad={onWarmLoad}
          />
        ))}
      </View>
    </View>
  );
}

export const PreloadScreen = memo(PreloadScreenInner);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  avatarWrap: {
    width: AVATAR + 18,
    height: AVATAR + 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarGlow: {
    position: 'absolute',
    width: AVATAR + 28,
    height: AVATAR + 28,
    borderRadius: 999,
    backgroundColor: 'rgba(111,227,255,0.18)',
  },
  avatarRing: {
    width: AVATAR + 8,
    height: AVATAR + 8,
    borderRadius: 999,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    overflow: 'hidden',
    backgroundColor: '#121018',
  },
  avatarImg: {
    width: AVATAR,
    height: AVATAR * 1.45,
    marginTop: -AVATAR * 0.08,
  },
  logo: {
    color: '#F7F2E8',
    fontSize: TipografiTokenlari.title.fontSize,
    fontWeight: '900',
    letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 8,
  },
  subtitle: {
    color: '#6FE3FF',
    fontSize: TipografiTokenlari.micro.fontSize,
    fontWeight: '700',
    letterSpacing: 2.4,
    marginBottom: 18,
  },
  barTrack: {
    width: '62%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#C9A24A',
  },
  pct: {
    marginTop: 8,
    color: 'rgba(247,242,232,0.7)',
    fontSize: TipografiTokenlari.caption.fontSize,
    fontWeight: '700',
  },
  warm: {
    position: 'absolute',
    left: 0,
    top: 0,
    opacity: 0.01,
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: WARM_SIZE * 4,
  },
  warmImg: { width: WARM_SIZE, height: WARM_SIZE },
});
