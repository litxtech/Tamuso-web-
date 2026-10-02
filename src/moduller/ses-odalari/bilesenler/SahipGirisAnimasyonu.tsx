import React, { useEffect, useMemo, useRef } from 'react';
import { Dimensions, Image, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { CamArkaplan } from '../../../bilesenler/yuzey/CamArkaplan';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import { DIL_LOCALE_MAP } from '../../../i18n/diller';

type Props = {
  gorunur: boolean;
  ad: string;
  avatarUrl?: string | null;
  onBitti?: () => void;
};

const { width: W, height: H } = Dimensions.get('window');
const AVATAR = Math.min(128, W * 0.32);
/** Kısa ama vurgulu sahip girişi — platform VIP giriş süresi */
const TOPLAM_MS = 3200;

const PARCACIKLAR = [
  { x: -0.38, y: -0.42, s: 7, d: 0 },
  { x: 0.36, y: -0.38, s: 5, d: 80 },
  { x: -0.44, y: 0.12, s: 6, d: 140 },
  { x: 0.42, y: 0.18, s: 8, d: 40 },
  { x: -0.18, y: -0.52, s: 4, d: 180 },
  { x: 0.22, y: 0.48, s: 6, d: 100 },
  { x: 0.48, y: -0.08, s: 5, d: 220 },
  { x: -0.32, y: 0.44, s: 4, d: 60 },
  { x: 0.08, y: -0.58, s: 9, d: 120 },
  { x: -0.52, y: -0.18, s: 5, d: 160 },
] as const;

const HALKALAR = [
  { boyut: 180, kalinlik: 2.5, max: 2.8, yon: 1 },
  { boyut: 200, kalinlik: 1.8, max: 3.4, yon: -1 },
  { boyut: 220, kalinlik: 1.2, max: 4.0, yon: 1 },
] as const;

function Halka3D({
  index,
  boyut,
  kalinlik,
  max,
  yon,
  progress,
  orbit,
}: {
  index: number;
  boyut: number;
  kalinlik: number;
  max: number;
  yon: number;
  progress: SharedValue<number>;
  orbit: SharedValue<number>;
}) {
  const stil = useAnimatedStyle(() => {
    const start = 0.14 + index * 0.04;
    const o = interpolate(
      progress.value,
      [start, start + 0.08, start + 0.35, start + 0.5],
      [0, 0.85, 0.25, 0],
      Extrapolation.CLAMP,
    );
    const s = interpolate(progress.value, [start, start + 0.45], [0.55, max], Extrapolation.CLAMP);
    const rot = orbit.value * 360 * yon * 0.35;
    return {
      opacity: o,
      transform: [
        { perspective: 1000 },
        { rotateX: '62deg' },
        { rotateZ: `${rot}deg` },
        { scale: s },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.halka,
        {
          width: boyut,
          height: boyut,
          borderRadius: boyut / 2,
          borderWidth: kalinlik,
          marginLeft: -boyut / 2,
          marginTop: -boyut / 2,
        },
        stil,
      ]}
    />
  );
}

function Parcacik({
  index,
  x,
  y,
  s,
  d,
  progress,
  orbit,
}: {
  index: number;
  x: number;
  y: number;
  s: number;
  d: number;
  progress: SharedValue<number>;
  orbit: SharedValue<number>;
}) {
  const stil = useAnimatedStyle(() => {
    const ang = orbit.value * Math.PI * 2 + index * 0.62;
    const radius = 0.55 + (index % 3) * 0.12;
    const bx = Math.cos(ang) * radius;
    const by = Math.sin(ang) * radius * 0.72;
    const emerge = interpolate(
      progress.value,
      [0.16 + d / 1000, 0.28 + d / 1000],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const fade = interpolate(progress.value, [0.78, 0.95], [1, 0], Extrapolation.CLAMP);
    const depth = 0.55 + ((Math.sin(ang * 2) + 1) / 2) * 0.7;
    return {
      opacity: emerge * fade * (0.45 + depth * 0.55),
      transform: [
        { translateX: (bx * 0.55 + x * emerge) * W * 0.55 },
        { translateY: (by * 0.45 + y * emerge) * H * 0.28 },
        { scale: depth * (0.6 + emerge * 0.6) },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.parcacik,
        { width: s, height: s, borderRadius: s / 2 },
        stil,
      ]}
    />
  );
}

/** Oda sahibi tahta oturunca sinematik 3D giriş sahnesi */
export function SahipGirisAnimasyonu({
  gorunur,
  ad,
  avatarUrl,
  onBitti,
}: Props) {
  const { t, dil } = useCeviri();
  const locale = DIL_LOCALE_MAP[dil];
  const progress = useSharedValue(0);
  const orbit = useSharedValue(0);
  const pulse = useSharedValue(0);
  const onBittiRef = useRef(onBitti);
  onBittiRef.current = onBitti;

  useEffect(() => {
    if (!gorunur) {
      progress.value = 0;
      orbit.value = 0;
      pulse.value = 0;
      return;
    }

    const bitir = () => {
      onBittiRef.current?.();
    };

    const impact = () => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    };

    progress.value = 0;
    progress.value = withTiming(
      1,
      { duration: TOPLAM_MS, easing: Easing.linear },
      (finished) => {
        if (finished) runOnJS(bitir)();
      },
    );

    orbit.value = withRepeat(
      withTiming(1, { duration: 3600, easing: Easing.linear }),
      -1,
      false,
    );
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    const t = setTimeout(impact, 420);
    const t2 = setTimeout(() => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 980);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [gorunur, progress, orbit, pulse]);

  const sahneStil = useAnimatedStyle(() => {
    const o = interpolate(
      progress.value,
      [0, 0.08, 0.82, 1],
      [0, 1, 1, 0],
      Extrapolation.CLAMP,
    );
    return { opacity: o };
  });

  const sisStil = useAnimatedStyle(() => {
    const o = interpolate(
      progress.value,
      [0, 0.1, 0.75, 1],
      [0, 0.92, 0.85, 0],
      Extrapolation.CLAMP,
    );
    return { opacity: o };
  });

  const coreGlowStil = useAnimatedStyle(() => {
    const s = interpolate(
      progress.value,
      [0.05, 0.22, 0.55, 0.9],
      [0.4, 1.35, 1.15, 0.6],
      Extrapolation.CLAMP,
    );
    const o = interpolate(
      progress.value,
      [0.05, 0.18, 0.7, 0.95],
      [0, 0.95, 0.7, 0],
      Extrapolation.CLAMP,
    );
    return {
      opacity: o,
      transform: [{ scale: s + pulse.value * 0.06 }],
    };
  });

  const avatarStil = useAnimatedStyle(() => {
    const p = progress.value;
    const depth = interpolate(p, [0.06, 0.28, 0.55], [0.12, 1.12, 1], Extrapolation.CLAMP);
    const rx = interpolate(p, [0.06, 0.28, 0.5], [68, -6, 0], Extrapolation.CLAMP);
    const ry = interpolate(p, [0.06, 0.22, 0.4], [-28, 10, 0], Extrapolation.CLAMP);
    const ty = interpolate(p, [0.06, 0.28, 0.55], [H * 0.18, -18, 0], Extrapolation.CLAMP);
    const o = interpolate(p, [0.05, 0.14, 0.82, 0.96], [0, 1, 1, 0], Extrapolation.CLAMP);
    const exitScale = interpolate(p, [0.82, 1], [1, 1.35], Extrapolation.CLAMP);
    return {
      opacity: o,
      transform: [
        { perspective: 1100 },
        { translateY: ty },
        { rotateX: `${rx}deg` },
        { rotateY: `${ry}deg` },
        { scale: depth * exitScale },
      ],
    };
  });

  const avatarAuraStil = useAnimatedStyle(() => {
    const o = interpolate(
      progress.value,
      [0.18, 0.32, 0.75, 0.92],
      [0, 1, 0.85, 0],
      Extrapolation.CLAMP,
    );
    return {
      opacity: o,
      transform: [{ scale: 1 + pulse.value * 0.08 }],
    };
  });

  const yaziStil = useAnimatedStyle(() => {
    const p = progress.value;
    const o = interpolate(p, [0.28, 0.4, 0.8, 0.94], [0, 1, 1, 0], Extrapolation.CLAMP);
    const ty = interpolate(p, [0.28, 0.42], [36, 0], Extrapolation.CLAMP);
    const rx = interpolate(p, [0.28, 0.42], [42, 0], Extrapolation.CLAMP);
    return {
      opacity: o,
      transform: [{ perspective: 900 }, { translateY: ty }, { rotateX: `${rx}deg` }],
    };
  });

  const badgeStil = useAnimatedStyle(() => {
    const p = progress.value;
    const o = interpolate(p, [0.22, 0.34, 0.8, 0.93], [0, 1, 1, 0], Extrapolation.CLAMP);
    const s = interpolate(p, [0.22, 0.36], [0.4, 1], Extrapolation.CLAMP);
    const ry = interpolate(p, [0.22, 0.4], [90, 0], Extrapolation.CLAMP);
    return {
      opacity: o,
      transform: [{ perspective: 800 }, { rotateY: `${ry}deg` }, { scale: s }],
    };
  });

  const isinSolStil = useAnimatedStyle(() => {
    const o = interpolate(
      progress.value,
      [0.1, 0.25, 0.55, 0.85],
      [0, 0.55, 0.35, 0],
      Extrapolation.CLAMP,
    );
    return {
      opacity: o,
      transform: [{ rotate: '-18deg' }, { scaleY: 0.9 + pulse.value * 0.15 }],
    };
  });

  const isinSagStil = useAnimatedStyle(() => {
    const o = interpolate(
      progress.value,
      [0.12, 0.28, 0.55, 0.85],
      [0, 0.5, 0.32, 0],
      Extrapolation.CLAMP,
    );
    return {
      opacity: o,
      transform: [{ rotate: '18deg' }, { scaleY: 0.9 + pulse.value * 0.12 }],
    };
  });

  const sweepStil = useAnimatedStyle(() => {
    const x = interpolate(progress.value, [0.2, 0.55], [-W, W * 1.2], Extrapolation.CLAMP);
    const o = interpolate(progress.value, [0.2, 0.32, 0.5], [0, 0.45, 0], Extrapolation.CLAMP);
    return {
      opacity: o,
      transform: [{ translateX: x }, { rotate: '22deg' }],
    };
  });

  const harf = useMemo(
    () => (ad || 'H').charAt(0).toLocaleUpperCase(locale),
    [ad, locale],
  );

  if (!gorunur) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, sahneStil]}>
        <CamArkaplan
          intensity={55}
          tint="dark"
          fallbackColor="rgba(8,6,14,0.88)"
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <Animated.View style={[styles.sis, sisStil]}>
          <LinearGradient
            colors={['rgba(8,5,14,0.2)', 'rgba(18,10,28,0.92)', 'rgba(8,5,14,0.98)']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View style={[styles.isin, styles.isinSol, isinSolStil]}>
          <LinearGradient
            colors={['transparent', 'rgba(240,180,41,0.28)', 'rgba(232,64,145,0.18)', 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View style={[styles.isin, styles.isinSag, isinSagStil]}>
          <LinearGradient
            colors={['transparent', 'rgba(196,59,255,0.22)', 'rgba(240,180,41,0.16)', 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View style={[styles.coreGlow, coreGlowStil]}>
          <LinearGradient
            colors={[
              'rgba(240,180,41,0.55)',
              'rgba(232,64,145,0.28)',
              'rgba(139,92,246,0.12)',
              'transparent',
            ]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <View style={styles.halkaMerkez} pointerEvents="none">
          {HALKALAR.map((h, i) => (
            <Halka3D
              key={`halka-${i}`}
              index={i}
              boyut={h.boyut}
              kalinlik={h.kalinlik}
              max={h.max}
              yon={h.yon}
              progress={progress}
              orbit={orbit}
            />
          ))}
        </View>

        <View style={styles.parcacikMerkez} pointerEvents="none">
          {PARCACIKLAR.map((p, i) => (
            <Parcacik
              key={`p-${i}`}
              index={i}
              x={p.x}
              y={p.y}
              s={p.s}
              d={p.d}
              progress={progress}
              orbit={orbit}
            />
          ))}
        </View>

        <Animated.View style={[styles.sweep, sweepStil]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.35)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <View style={styles.hero}>
          <Animated.View style={[styles.badge, badgeStil]}>
            <LinearGradient
              colors={['rgba(240,180,41,0.95)', 'rgba(232,122,59,0.9)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.badgeIc}
            >
              <Ionicons name="diamond" size={14} color="#1A1224" />
              <Text style={styles.badgeYazi}>{t('sesOda.odaSahibiRozet')}</Text>
              <Ionicons name="diamond" size={14} color="#1A1224" />
            </LinearGradient>
          </Animated.View>

          <Animated.View style={[styles.avatarWrap, avatarStil]}>
            <Animated.View style={[styles.avatarAura, avatarAuraStil]} />
            {MedyaUriGuvenli(avatarUrl) ? (
              <Image source={{ uri: MedyaUriGuvenli(avatarUrl)! }} style={styles.avatar} />
            ) : (
              <LinearGradient
                colors={[RenkTokenlari.accent, RenkTokenlari.primary, RenkTokenlari.magenta]}
                start={{ x: 0.15, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.avatar}
              >
                <Text style={styles.harf}>{harf}</Text>
              </LinearGradient>
            )}
            <View style={styles.avatarRim} />
            <LinearGradient
              colors={['rgba(255,255,255,0.35)', 'transparent', 'transparent']}
              style={styles.avatarHighlight}
            />
          </Animated.View>

          <Animated.View style={[styles.yaziBlok, yaziStil]}>
            <Text style={styles.ad} numberOfLines={1}>
              {ad}
            </Text>
            <Text style={styles.alt}>{t('sesOda.tahtaOturdu')}</Text>
            <View style={styles.altCizgi}>
              <LinearGradient
                colors={['transparent', RenkTokenlari.accent, RenkTokenlari.primary, 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </View>
          </Animated.View>
        </View>

        <LinearGradient
          colors={['rgba(8,5,14,0.85)', 'transparent']}
          style={styles.vignetteUst}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['transparent', 'rgba(8,5,14,0.9)']}
          style={styles.vignetteAlt}
          pointerEvents="none"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 40,
    overflow: 'hidden',
  },
  sis: {
    ...StyleSheet.absoluteFill,
  },
  coreGlow: {
    position: 'absolute',
    width: W * 1.15,
    height: W * 1.15,
    borderRadius: W * 0.575,
    left: (W - W * 1.15) / 2,
    top: H * 0.28 - W * 0.4,
    overflow: 'hidden',
  },
  isin: {
    position: 'absolute',
    width: W * 0.42,
    height: H * 0.95,
    top: H * 0.02,
    overflow: 'hidden',
  },
  isinSol: {
    left: W * 0.08,
  },
  isinSag: {
    right: W * 0.08,
  },
  halkaMerkez: {
    position: 'absolute',
    left: W / 2,
    top: H * 0.42,
    width: 0,
    height: 0,
  },
  halka: {
    position: 'absolute',
    borderColor: 'rgba(240,180,41,0.55)',
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: RenkTokenlari.accent,
        shadowOpacity: 0.45,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
      },
      default: {},
    }),
  },
  parcacikMerkez: {
    position: 'absolute',
    left: W / 2,
    top: H * 0.4,
    width: 0,
    height: 0,
  },
  parcacik: {
    position: 'absolute',
    backgroundColor: RenkTokenlari.accent,
    ...Platform.select({
      ios: {
        shadowColor: RenkTokenlari.primary,
        shadowOpacity: 0.9,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
      },
      default: {},
    }),
  },
  sweep: {
    position: 'absolute',
    width: 70,
    height: H * 1.4,
    top: -H * 0.15,
    left: 0,
  },
  hero: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: H * 0.04,
    gap: 18,
  },
  badge: {
    borderRadius: 999,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: RenkTokenlari.accent,
        shadowOpacity: 0.55,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
      },
      default: {},
    }),
  },
  badgeIc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  badgeYazi: {
    ...TipografiTokenlari.micro,
    color: '#1A1224',
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  avatarWrap: {
    width: AVATAR,
    height: AVATAR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarAura: {
    position: 'absolute',
    width: AVATAR * 1.55,
    height: AVATAR * 1.55,
    borderRadius: AVATAR * 0.775,
    backgroundColor: 'rgba(240,180,41,0.22)',
    borderWidth: 1.5,
    borderColor: 'rgba(232,64,145,0.45)',
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(240,180,41,0.95)',
  },
  avatarRim: {
    ...StyleSheet.absoluteFill,
    borderRadius: AVATAR / 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarHighlight: {
    position: 'absolute',
    top: 4,
    left: 10,
    right: 10,
    height: AVATAR * 0.38,
    borderRadius: AVATAR / 2,
  },
  harf: {
    fontSize: AVATAR * 0.38,
    fontWeight: '900',
    color: '#fff',
  },
  yaziBlok: {
    alignItems: 'center',
    gap: 6,
    maxWidth: W * 0.78,
  },
  ad: {
    ...TipografiTokenlari.title,
    color: RenkTokenlari.text,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(240,180,41,0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  alt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    letterSpacing: 0.8,
  },
  altCizgi: {
    marginTop: 6,
    width: 140,
    height: 2,
    borderRadius: 1,
    overflow: 'hidden',
  },
  vignetteUst: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: H * 0.22,
  },
  vignetteAlt: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: H * 0.28,
  },
});
