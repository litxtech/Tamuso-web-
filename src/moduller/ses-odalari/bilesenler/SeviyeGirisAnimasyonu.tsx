/**
 * SeviyeGirisAnimasyonu — odaya giriş overlay (sv. 10+).
 * Bronz/Gümüş: ihtişamlı üst banner.
 * Altın/Efsane: tam ekran sinematik sahne (Sahip girişi kalitesinde).
 */

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
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { CamArkaplan } from '../../../bilesenler/yuzey/CamArkaplan';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  SEVIYE_GIRIS_ISIN,
  SEVIYE_GIRIS_RENKLERI,
  SeviyeGirisAltMetin,
  SeviyeGirisEtiketi,
  SeviyeGirisSinematikMi,
  SeviyeGirisSuresiMs,
  type SeviyeGirisKademe,
} from '../animasyon/SeviyeGirisKatalogu';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';

type Props = {
  gorunur: boolean;
  ad: string;
  level: number;
  kademe: SeviyeGirisKademe;
  avatarUrl?: string | null;
  onBitti?: () => void;
};

const { width: W, height: H } = Dimensions.get('window');
const AVATAR_BANNER = Math.min(96, W * 0.26);
const AVATAR_HERO = Math.min(132, W * 0.34);

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
  { x: 0.55, y: 0.32, s: 4, d: 90 },
  { x: -0.28, y: -0.28, s: 6, d: 200 },
] as const;

const HALKALAR = [
  { boyut: 180, kalinlik: 2.5, max: 2.9, yon: 1 },
  { boyut: 205, kalinlik: 1.8, max: 3.5, yon: -1 },
  { boyut: 230, kalinlik: 1.2, max: 4.2, yon: 1 },
  { boyut: 160, kalinlik: 3, max: 2.4, yon: -1 },
] as const;

const BANNER_PARCACIK = [
  { x: 0.08, y: 0.2, s: 3, d: 0 },
  { x: 0.22, y: 0.65, s: 4, d: 60 },
  { x: 0.72, y: 0.25, s: 3, d: 120 },
  { x: 0.88, y: 0.7, s: 5, d: 40 },
  { x: 0.45, y: 0.15, s: 3, d: 180 },
  { x: 0.58, y: 0.8, s: 4, d: 100 },
] as const;

function badgeIcon(kademe: SeviyeGirisKademe): keyof typeof Ionicons.glyphMap {
  switch (kademe) {
    case 'efsane':
      return 'diamond';
    case 'altin':
      return 'trophy';
    case 'gumus':
      return 'star';
    default:
      return 'sparkles';
  }
}

function Halka3D({
  index,
  boyut,
  kalinlik,
  max,
  yon,
  progress,
  orbit,
  renk,
}: {
  index: number;
  boyut: number;
  kalinlik: number;
  max: number;
  yon: number;
  progress: SharedValue<number>;
  orbit: SharedValue<number>;
  renk: string;
}) {
  const stil = useAnimatedStyle(() => {
    const start = 0.12 + index * 0.035;
    const o = interpolate(
      progress.value,
      [start, start + 0.08, start + 0.38, start + 0.55],
      [0, 0.9, 0.28, 0],
      Extrapolation.CLAMP,
    );
    const s = interpolate(progress.value, [start, start + 0.48], [0.5, max], Extrapolation.CLAMP);
    const rot = orbit.value * 360 * yon * 0.4;
    return {
      opacity: o,
      transform: [
        { perspective: 1000 },
        { rotateX: '64deg' },
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
          borderColor: renk,
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
  renk,
}: {
  index: number;
  x: number;
  y: number;
  s: number;
  d: number;
  progress: SharedValue<number>;
  orbit: SharedValue<number>;
  renk: string;
}) {
  const stil = useAnimatedStyle(() => {
    const ang = orbit.value * Math.PI * 2 + index * 0.55;
    const radius = 0.52 + (index % 3) * 0.14;
    const bx = Math.cos(ang) * radius;
    const by = Math.sin(ang) * radius * 0.7;
    const emerge = interpolate(
      progress.value,
      [0.14 + d / 1000, 0.26 + d / 1000],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const fade = interpolate(progress.value, [0.78, 0.96], [1, 0], Extrapolation.CLAMP);
    const depth = 0.5 + ((Math.sin(ang * 2) + 1) / 2) * 0.75;
    return {
      opacity: emerge * fade * (0.4 + depth * 0.6),
      transform: [
        { translateX: (bx * 0.55 + x * emerge) * W * 0.55 },
        { translateY: (by * 0.45 + y * emerge) * H * 0.28 },
        { scale: depth * (0.55 + emerge * 0.7) },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.parcacik,
        { width: s, height: s, borderRadius: s / 2, backgroundColor: renk },
        stil,
      ]}
    />
  );
}

function BannerParcacik({
  x,
  y,
  s,
  d,
  progress,
  renk,
  kartW,
}: {
  x: number;
  y: number;
  s: number;
  d: number;
  progress: SharedValue<number>;
  renk: string;
  kartW: number;
}) {
  const stil = useAnimatedStyle(() => {
    const emerge = interpolate(
      progress.value,
      [0.12 + d / 2000, 0.28 + d / 2000],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const fade = interpolate(progress.value, [0.72, 0.92], [1, 0], Extrapolation.CLAMP);
    const float = Math.sin((progress.value + d / 1000) * Math.PI * 4) * 4;
    return {
      opacity: emerge * fade * 0.85,
      transform: [
        { translateX: x * kartW },
        { translateY: y * 72 + float },
        { scale: 0.6 + emerge * 0.8 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.bannerParcacik,
        { width: s, height: s, borderRadius: s / 2, backgroundColor: renk },
        stil,
      ]}
    />
  );
}

function SinematikSahne({
  ad,
  level,
  kademe,
  avatarUrl,
  progress,
  orbit,
  pulse,
}: {
  ad: string;
  level: number;
  kademe: SeviyeGirisKademe;
  avatarUrl?: string | null;
  progress: SharedValue<number>;
  orbit: SharedValue<number>;
  pulse: SharedValue<number>;
}) {
  const renkler = SEVIYE_GIRIS_RENKLERI[kademe];
  const isin = SEVIYE_GIRIS_ISIN[kademe];
  const efsane = kademe === 'efsane';
  const harf = useMemo(
    () => (ad || '?').charAt(0).toLocaleUpperCase('tr-TR'),
    [ad],
  );

  const sahneStil = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 0.07, 0.84, 1],
      [0, 1, 1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const sisStil = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 0.1, 0.78, 1],
      [0, 0.94, 0.88, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const coreGlowStil = useAnimatedStyle(() => {
    const s = interpolate(
      progress.value,
      [0.04, 0.2, 0.55, 0.9],
      [0.35, 1.4, 1.18, 0.55],
      Extrapolation.CLAMP,
    );
    const o = interpolate(
      progress.value,
      [0.04, 0.16, 0.72, 0.95],
      [0, 1, 0.72, 0],
      Extrapolation.CLAMP,
    );
    return {
      opacity: o,
      transform: [{ scale: s + pulse.value * (efsane ? 0.08 : 0.05) }],
    };
  });

  const avatarStil = useAnimatedStyle(() => {
    const p = progress.value;
    const depth = interpolate(p, [0.05, 0.26, 0.55], [0.1, 1.14, 1], Extrapolation.CLAMP);
    const rx = interpolate(p, [0.05, 0.26, 0.48], [72, -8, 0], Extrapolation.CLAMP);
    const ry = interpolate(p, [0.05, 0.2, 0.38], [-32, 12, 0], Extrapolation.CLAMP);
    const ty = interpolate(p, [0.05, 0.26, 0.55], [H * 0.2, -22, 0], Extrapolation.CLAMP);
    const o = interpolate(p, [0.04, 0.13, 0.84, 0.97], [0, 1, 1, 0], Extrapolation.CLAMP);
    const exitScale = interpolate(p, [0.84, 1], [1, 1.4], Extrapolation.CLAMP);
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

  const avatarAuraStil = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.16, 0.3, 0.78, 0.93],
      [0, 1, 0.88, 0],
      Extrapolation.CLAMP,
    ),
    transform: [{ scale: 1 + pulse.value * (efsane ? 0.1 : 0.07) }],
  }));

  const yaziStil = useAnimatedStyle(() => {
    const p = progress.value;
    const o = interpolate(p, [0.26, 0.38, 0.82, 0.95], [0, 1, 1, 0], Extrapolation.CLAMP);
    const ty = interpolate(p, [0.26, 0.4], [40, 0], Extrapolation.CLAMP);
    const rx = interpolate(p, [0.26, 0.4], [48, 0], Extrapolation.CLAMP);
    return {
      opacity: o,
      transform: [{ perspective: 900 }, { translateY: ty }, { rotateX: `${rx}deg` }],
    };
  });

  const badgeStil = useAnimatedStyle(() => {
    const p = progress.value;
    const o = interpolate(p, [0.2, 0.32, 0.82, 0.94], [0, 1, 1, 0], Extrapolation.CLAMP);
    const s = interpolate(p, [0.2, 0.34], [0.35, 1], Extrapolation.CLAMP);
    const ry = interpolate(p, [0.2, 0.38], [95, 0], Extrapolation.CLAMP);
    return {
      opacity: o,
      transform: [{ perspective: 800 }, { rotateY: `${ry}deg` }, { scale: s }],
    };
  });

  const isinSolStil = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.08, 0.22, 0.58, 0.88],
      [0, efsane ? 0.7 : 0.55, 0.4, 0],
      Extrapolation.CLAMP,
    ),
    transform: [{ rotate: '-18deg' }, { scaleY: 0.88 + pulse.value * 0.18 }],
  }));

  const isinSagStil = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.1, 0.26, 0.58, 0.88],
      [0, efsane ? 0.65 : 0.48, 0.36, 0],
      Extrapolation.CLAMP,
    ),
    transform: [{ rotate: '18deg' }, { scaleY: 0.88 + pulse.value * 0.14 }],
  }));

  const sweepStil = useAnimatedStyle(() => {
    const x = interpolate(progress.value, [0.18, 0.58], [-W, W * 1.25], Extrapolation.CLAMP);
    const o = interpolate(progress.value, [0.18, 0.3, 0.52], [0, 0.55, 0], Extrapolation.CLAMP);
    return {
      opacity: o,
      transform: [{ translateX: x }, { rotate: '22deg' }],
    };
  });

  const seviyePillStil = useAnimatedStyle(() => {
    const p = progress.value;
    const o = interpolate(p, [0.32, 0.44, 0.8, 0.93], [0, 1, 1, 0], Extrapolation.CLAMP);
    const s = interpolate(p, [0.32, 0.46], [0.7, 1], Extrapolation.CLAMP);
    return { opacity: o, transform: [{ scale: s }] };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, sahneStil]}>
      <CamArkaplan
        intensity={efsane ? 62 : 50}
        tint="dark"
        fallbackColor="rgba(8,6,14,0.9)"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <Animated.View style={[styles.sis, sisStil]}>
        <LinearGradient
          colors={
            efsane
              ? ['rgba(20,8,28,0.25)', 'rgba(28,10,40,0.94)', 'rgba(8,5,14,0.98)']
              : ['rgba(18,12,6,0.2)', 'rgba(24,16,8,0.9)', 'rgba(8,5,14,0.98)']
          }
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View style={[styles.isin, styles.isinSol, isinSolStil]}>
        <LinearGradient
          colors={['transparent', isin.sol, efsane ? 'rgba(255,107,154,0.2)' : 'transparent', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[styles.isin, styles.isinSag, isinSagStil]}>
        <LinearGradient
          colors={['transparent', isin.sag, efsane ? 'rgba(240,180,41,0.18)' : 'transparent', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View style={[styles.coreGlow, coreGlowStil]}>
        <LinearGradient colors={[...isin.core] as [string, string, ...string[]]} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <View style={styles.halkaMerkez} pointerEvents="none">
        {(efsane ? HALKALAR : HALKALAR.slice(0, 3)).map((h, i) => (
          <Halka3D
            key={`halka-${i}`}
            index={i}
            boyut={h.boyut}
            kalinlik={h.kalinlik}
            max={h.max}
            yon={h.yon}
            progress={progress}
            orbit={orbit}
            renk={isin.halka}
          />
        ))}
      </View>

      <View style={styles.parcacikMerkez} pointerEvents="none">
        {(efsane ? PARCACIKLAR : PARCACIKLAR.slice(0, 10)).map((p, i) => (
          <Parcacik
            key={`p-${i}`}
            index={i}
            x={p.x}
            y={p.y}
            s={p.s}
            d={p.d}
            progress={progress}
            orbit={orbit}
            renk={i % 3 === 0 && efsane ? '#FF6B9A' : isin.parcacik}
          />
        ))}
      </View>

      <Animated.View style={[styles.sweep, sweepStil]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={styles.hero}>
        <Animated.View style={[styles.badge, badgeStil]}>
          <LinearGradient
            colors={[renkler[0], renkler[1], renkler[2]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.badgeIc}
          >
            <Ionicons name={badgeIcon(kademe)} size={14} color="#1A1224" />
            <Text style={styles.badgeYazi}>{SeviyeGirisEtiketi(kademe)}</Text>
            <Ionicons name={badgeIcon(kademe)} size={14} color="#1A1224" />
          </LinearGradient>
        </Animated.View>

        <Animated.View style={[styles.avatarWrapHero, avatarStil]}>
          <Animated.View
            style={[
              styles.avatarAura,
              {
                backgroundColor: efsane ? 'rgba(255,107,154,0.22)' : 'rgba(240,180,41,0.22)',
                borderColor: efsane ? 'rgba(155,92,255,0.5)' : 'rgba(240,180,41,0.5)',
              },
              avatarAuraStil,
            ]}
          />
          {MedyaUriGuvenli(avatarUrl) ? (
            <Image source={{ uri: MedyaUriGuvenli(avatarUrl)! }} style={[styles.avatarHero, { borderColor: renkler[0] }]} />
          ) : (
            <LinearGradient
              colors={[renkler[0], renkler[1], renkler[2]]}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={[styles.avatarHero, { borderColor: renkler[0] }]}
            >
              <Text style={styles.harfHero}>{harf}</Text>
            </LinearGradient>
          )}
          <View style={styles.avatarRim} />
          <LinearGradient
            colors={['rgba(255,255,255,0.4)', 'transparent', 'transparent']}
            style={styles.avatarHighlight}
          />
        </Animated.View>

        <Animated.View style={[styles.seviyePill, seviyePillStil]}>
          <LinearGradient
            colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.06)']}
            style={styles.seviyePillIc}
          >
            <Text style={styles.seviyePillYazi}>SV. {level}</Text>
          </LinearGradient>
        </Animated.View>

        <Animated.View style={[styles.yaziBlok, yaziStil]}>
          <Text style={[styles.adHero, efsane && styles.adEfsane]} numberOfLines={1}>
            {ad}
          </Text>
          <Text style={styles.altHero}>{SeviyeGirisAltMetin(kademe, level)}</Text>
          <View style={styles.altCizgi}>
            <LinearGradient
              colors={['transparent', renkler[0], renkler[1], 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
        </Animated.View>
      </View>

      <LinearGradient
        colors={['rgba(8,5,14,0.88)', 'transparent']}
        style={styles.vignetteUst}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', 'rgba(8,5,14,0.92)']}
        style={styles.vignetteAlt}
        pointerEvents="none"
      />
    </Animated.View>
  );
}

function BannerSahne({
  ad,
  level,
  kademe,
  avatarUrl,
  progress,
}: {
  ad: string;
  level: number;
  kademe: SeviyeGirisKademe;
  avatarUrl?: string | null;
  progress: SharedValue<number>;
}) {
  const renkler = SEVIYE_GIRIS_RENKLERI[kademe];
  const isin = SEVIYE_GIRIS_ISIN[kademe];
  const kartW = Math.min(W - 40, 360);
  const harf = useMemo(
    () => (ad || '?').charAt(0).toLocaleUpperCase('tr-TR'),
    [ad],
  );

  const sahneStil = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 0.08, 0.78, 1],
      [0, 1, 1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const kartStil = useAnimatedStyle(() => {
    // Bigo tarzı: sağdan kayarak gir, hafif bounce
    const tx = interpolate(
      progress.value,
      [0.02, 0.18, 0.28, 0.82, 1],
      [W * 0.55, -8, 0, 0, W * 0.35],
      Extrapolation.CLAMP,
    );
    const s = interpolate(
      progress.value,
      [0.04, 0.2, 0.86, 1],
      [0.88, 1.04, 1, 0.94],
      Extrapolation.CLAMP,
    );
    return { transform: [{ translateX: tx }, { scale: s }] };
  });

  const isikCubuguStil = useAnimatedStyle(() => {
    const o = interpolate(
      progress.value,
      [0.12, 0.22, 0.7, 0.9],
      [0, 1, 0.85, 0],
      Extrapolation.CLAMP,
    );
    return { opacity: o };
  });

  const auraStil = useAnimatedStyle(() => {
    const s = interpolate(
      progress.value,
      [0.08, 0.32, 0.7],
      [0.65, 1.35, 1.05],
      Extrapolation.CLAMP,
    );
    const o = interpolate(
      progress.value,
      [0.08, 0.22, 0.75, 0.95],
      [0, 0.95, 0.55, 0],
      Extrapolation.CLAMP,
    );
    return { opacity: o, transform: [{ scale: s }] };
  });

  const sweepStil = useAnimatedStyle(() => {
    const x = interpolate(progress.value, [0.15, 0.55], [-40, kartW], Extrapolation.CLAMP);
    const o = interpolate(progress.value, [0.15, 0.28, 0.5], [0, 0.55, 0], Extrapolation.CLAMP);
    return {
      opacity: o,
      transform: [{ translateX: x }, { skewX: '-12deg' }],
    };
  });

  return (
    <Animated.View style={[styles.bannerWrap, sahneStil]}>
      <Animated.View style={[styles.kart, { maxWidth: kartW }, kartStil]}>
        <LinearGradient colors={[...renkler]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cerceve}>
          <View style={styles.ic}>
            <Animated.View style={[styles.vipIsikCubugu, { backgroundColor: renkler[0] }, isikCubuguStil]} />
            <Animated.View
              style={[styles.aura, { backgroundColor: `${renkler[1]}33` }, auraStil]}
            />
            {BANNER_PARCACIK.map((p, i) => (
              <BannerParcacik
                key={`bp-${i}`}
                x={p.x}
                y={p.y}
                s={p.s}
                d={p.d}
                progress={progress}
                renk={i % 2 === 0 ? isin.parcacik : renkler[0]}
                kartW={kartW}
              />
            ))}
            <Animated.View style={[styles.bannerSweep, sweepStil]}>
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            <View style={styles.avatarWrapBanner}>
              <View style={[styles.avatarHalo, { borderColor: renkler[0] }]} />
              {MedyaUriGuvenli(avatarUrl) ? (
                <Image source={{ uri: MedyaUriGuvenli(avatarUrl)! }} style={[styles.avatarBanner, { borderColor: renkler[0] }]} />
              ) : (
                <LinearGradient colors={[renkler[0], renkler[2]]} style={styles.avatarBanner}>
                  <Text style={styles.harfBanner}>{harf}</Text>
                </LinearGradient>
              )}
            </View>
            <View style={styles.metin}>
              <View style={[styles.badgeBanner, { backgroundColor: renkler[0] }]}>
                <Ionicons name={badgeIcon(kademe)} size={11} color="#1A1224" />
                <Text style={styles.badgeYaziBanner}>{SeviyeGirisEtiketi(kademe)}</Text>
              </View>
              <Text style={styles.adBanner} numberOfLines={1}>
                {ad}
              </Text>
              <Text style={styles.altBanner}>{SeviyeGirisAltMetin(kademe, level)}</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}

export function SeviyeGirisAnimasyonu({
  gorunur,
  ad,
  level,
  kademe,
  avatarUrl,
  onBitti,
}: Props) {
  const safeAvatar = MedyaUriGuvenli(avatarUrl);
  const progress = useSharedValue(0);
  const orbit = useSharedValue(0);
  const pulse = useSharedValue(0);
  const sure = SeviyeGirisSuresiMs(kademe);
  const sinematik = SeviyeGirisSinematikMi(kademe);
  const onBittiRef = useRef(onBitti);
  onBittiRef.current = onBitti;
  const sureRef = useRef(sure);
  sureRef.current = sure;
  const kademeRef = useRef(kademe);
  kademeRef.current = kademe;
  const sinematikRef = useRef(sinematik);
  sinematikRef.current = sinematik;

  useEffect(() => {
    if (!gorunur) {
      progress.value = 0;
      orbit.value = 0;
      pulse.value = 0;
      return;
    }

    const bitir = () => onBittiRef.current?.();
    const sureMs = sureRef.current;
    const k = kademeRef.current;
    const sin = sinematikRef.current;

    progress.value = 0;
    progress.value = withTiming(
      1,
      { duration: sureMs, easing: Easing.linear },
      (finished) => {
        if (finished) runOnJS(bitir)();
      },
    );

    if (sin) {
      orbit.value = withRepeat(
        withTiming(1, { duration: 3200, easing: Easing.linear }),
        -1,
        false,
      );
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 650, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 650, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    }

    const impact = () => {
      void Haptics.impactAsync(
        k === 'efsane' || k === 'altin'
          ? Haptics.ImpactFeedbackStyle.Heavy
          : Haptics.ImpactFeedbackStyle.Medium,
      );
    };
    const t = setTimeout(impact, sin ? 380 : 100);
    let t2: ReturnType<typeof setTimeout> | undefined;
    if (k === 'efsane') {
      t2 = setTimeout(() => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 720);
    }
    return () => {
      clearTimeout(t);
      if (t2) clearTimeout(t2);
    };
  }, [gorunur, progress, orbit, pulse]);

  if (!gorunur) return null;

  return (
    <View style={[styles.overlay, sinematik && styles.overlaySinematik]} pointerEvents="none">
      {sinematik ? (
        <SinematikSahne
          ad={ad}
          level={level}
          kademe={kademe}
          avatarUrl={safeAvatar}
          progress={progress}
          orbit={orbit}
          pulse={pulse}
        />
      ) : (
        <BannerSahne
          ad={ad}
          level={level}
          kademe={kademe}
          avatarUrl={safeAvatar}
          progress={progress}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 38,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 88,
  },
  overlaySinematik: {
    zIndex: 39,
    paddingTop: 0,
    justifyContent: 'center',
  },
  bannerWrap: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  kart: {
    width: '100%',
    borderRadius: 22,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#F0B429',
        shadowOpacity: 0.35,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      },
      default: { elevation: 8 },
    }),
  },
  cerceve: {
    padding: 2.5,
    borderRadius: 22,
  },
  ic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(14,10,20,0.96)',
    overflow: 'hidden',
  },
  aura: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    left: -14,
  },
  bannerParcacik: {
    position: 'absolute',
    zIndex: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#fff',
        shadowOpacity: 0.9,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 0 },
      },
      default: {},
    }),
  },
  bannerSweep: {
    position: 'absolute',
    width: 36,
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
  },
  avatarWrapBanner: {
    width: AVATAR_BANNER * 0.78,
    height: AVATAR_BANNER * 0.78,
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHalo: {
    position: 'absolute',
    width: '118%',
    height: '118%',
    borderRadius: 999,
    borderWidth: 1.5,
    opacity: 0.7,
  },
  vipIsikCubugu: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    zIndex: 4,
  },
  avatarBanner: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  harfBanner: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
  },
  metin: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    zIndex: 3,
  },
  badgeBanner: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeYaziBanner: {
    ...TipografiTokenlari.micro,
    color: '#1A1224',
    fontWeight: '900',
    fontSize: 9,
    letterSpacing: 0.9,
  },
  adBanner: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '900',
    fontSize: 17,
  },
  altBanner: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '600',
    fontSize: 12,
  },
  sis: {
    ...StyleSheet.absoluteFill,
  },
  coreGlow: {
    position: 'absolute',
    width: W * 1.2,
    height: W * 1.2,
    borderRadius: W * 0.6,
    left: (W - W * 1.2) / 2,
    top: H * 0.26 - W * 0.42,
    overflow: 'hidden',
  },
  isin: {
    position: 'absolute',
    width: W * 0.44,
    height: H * 0.95,
    top: H * 0.02,
    overflow: 'hidden',
  },
  isinSol: {
    left: W * 0.06,
  },
  isinSag: {
    right: W * 0.06,
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
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: RenkTokenlari.accent,
        shadowOpacity: 0.5,
        shadowRadius: 14,
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
    ...Platform.select({
      ios: {
        shadowColor: RenkTokenlari.primary,
        shadowOpacity: 0.95,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
      },
      default: {},
    }),
  },
  sweep: {
    position: 'absolute',
    width: 76,
    height: H * 1.4,
    top: -H * 0.15,
    left: 0,
  },
  hero: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: H * 0.04,
    gap: 14,
  },
  badge: {
    borderRadius: 999,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: RenkTokenlari.accent,
        shadowOpacity: 0.6,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 4 },
      },
      default: {},
    }),
  },
  badgeIc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  badgeYazi: {
    ...TipografiTokenlari.micro,
    color: '#1A1224',
    fontWeight: '900',
    letterSpacing: 1.8,
    fontSize: 11,
  },
  avatarWrapHero: {
    width: AVATAR_HERO,
    height: AVATAR_HERO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarAura: {
    position: 'absolute',
    width: AVATAR_HERO * 1.6,
    height: AVATAR_HERO * 1.6,
    borderRadius: AVATAR_HERO * 0.8,
    borderWidth: 1.5,
  },
  avatarHero: {
    width: AVATAR_HERO,
    height: AVATAR_HERO,
    borderRadius: AVATAR_HERO / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3.5,
  },
  avatarRim: {
    ...StyleSheet.absoluteFill,
    borderRadius: AVATAR_HERO / 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarHighlight: {
    position: 'absolute',
    top: 5,
    left: 12,
    right: 12,
    height: AVATAR_HERO * 0.38,
    borderRadius: AVATAR_HERO / 2,
  },
  harfHero: {
    fontSize: AVATAR_HERO * 0.38,
    fontWeight: '900',
    color: '#fff',
  },
  seviyePill: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  seviyePillIc: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  seviyePillYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.text,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  yaziBlok: {
    alignItems: 'center',
    gap: 6,
    maxWidth: W * 0.8,
  },
  adHero: {
    ...TipografiTokenlari.title,
    color: RenkTokenlari.text,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(240,180,41,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  adEfsane: {
    textShadowColor: 'rgba(255,107,154,0.55)',
    textShadowRadius: 24,
  },
  altHero: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  altCizgi: {
    marginTop: 6,
    width: 160,
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
