/**
 * SeviyeGirisAnimasyonu — odaya giriş efekti (herkes).
 * Normal: cam şerit; Bronz/Gümüş: VIP şerit; Altın/Efsane: hero kart.
 * Sahneyi kapatmaz — şeritler yorum akışının üstünde yandan yaylanarak girer.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { Dimensions, I18nManager, Image, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  SEVIYE_GIRIS_ISIN,
  SEVIYE_GIRIS_RENKLERI,
  SeviyeGirisAltMetin,
  SeviyeGirisEtiketi,
  SeviyeGirisKisaMetin,
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
  /** Şeridin ekran altına uzaklığı — yorum akışının hemen üstü */
  altBosluk?: number;
  onBitti?: () => void;
};

type Anim = {
  giris: SharedValue<number>;
  cikis: SharedValue<number>;
  parilti: SharedValue<number>;
  donus: SharedValue<number>;
  patlama: SharedValue<number>;
};

type Renkler = readonly [string, string, string];

const { width: W, height: H } = Dimensions.get('window');
const YON = I18nManager.isRTL ? -1 : 1;
const CLAMP = Extrapolation.CLAMP;
const GIRIS_MS = 520;
const CIKIS_MS = 340;
const YAY = { damping: 15, stiffness: 170, mass: 0.9 };
const SERIT_MAX_W = Math.min(W - 72, 340);
const HERO_W = Math.min(W - 24, 420);
const HERO_AVATAR = 60;
const HERO_HALKA = HERO_AVATAR + 8;

const VIP_KIVILCIM = [
  { x: 14, y: 6, boyut: 9, gecikme: 0 },
  { x: 30, y: 30, boyut: 7, gecikme: 0.35 },
  { x: 52, y: 10, boyut: 6, gecikme: 0.7 },
] as const;

const PATLAMA = Array.from({ length: 10 }, (_, i) => ({
  aci: (i / 10) * Math.PI * 2 + (i % 2) * 0.3,
  mesafe: 44 + (i % 3) * 16,
  boyut: 3 + (i % 3),
}));

function rozetIkonu(kademe: SeviyeGirisKademe): keyof typeof Ionicons.glyphMap {
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

function Avatar({
  uri,
  ad,
  boyut,
  renkler,
}: {
  uri?: string | null;
  ad: string;
  boyut: number;
  renkler: Renkler;
}) {
  const harf = useMemo(() => (ad || '?').charAt(0).toLocaleUpperCase('tr-TR'), [ad]);
  const guvenli = MedyaUriGuvenli(uri);
  const olcu = { width: boyut, height: boyut, borderRadius: boyut / 2 };
  if (guvenli) {
    return <Image source={{ uri: guvenli }} style={[styles.avatarTaban, olcu]} />;
  }
  return (
    <LinearGradient
      colors={[renkler[0], renkler[2]]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.avatarTaban, olcu]}
    >
      <Text style={[styles.harf, { fontSize: boyut * 0.42 }]}>{harf}</Text>
    </LinearGradient>
  );
}

/** Kart üzerinden geçen ışık çizgisi */
function Parilti({
  parilti,
  genislik,
  opaklik,
}: {
  parilti: SharedValue<number>;
  genislik: number;
  opaklik: number;
}) {
  const stil = useAnimatedStyle(() => ({
    opacity: interpolate(parilti.value, [0, 0.15, 0.85, 1], [0, 1, 1, 0], CLAMP),
    transform: [
      { translateX: interpolate(parilti.value, [0, 1], [-60, genislik + 60]) },
      { skewX: '-20deg' },
    ],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.parilti, stil]}>
      <LinearGradient
        colors={['transparent', `rgba(255,255,255,${opaklik})`, 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

function Kivilcim({
  x,
  y,
  boyut,
  gecikme,
  donus,
  renk,
}: {
  x: number;
  y: number;
  boyut: number;
  gecikme: number;
  donus: SharedValue<number>;
  renk: string;
}) {
  const stil = useAnimatedStyle(() => {
    const p = (donus.value * 2 + gecikme) % 1;
    const o = interpolate(p, [0, 0.5, 1], [0, 1, 0]);
    return {
      opacity: o,
      transform: [{ scale: 0.5 + o * 0.6 }, { rotate: `${p * 90}deg` }],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.kivilcim, { right: x, top: y }, stil]}>
      <Ionicons name="sparkles" size={boyut} color={renk} />
    </Animated.View>
  );
}

function PatlamaParcacik({
  aci,
  mesafe,
  boyut,
  patlama,
  renk,
}: {
  aci: number;
  mesafe: number;
  boyut: number;
  patlama: SharedValue<number>;
  renk: string;
}) {
  const stil = useAnimatedStyle(() => {
    const p = patlama.value;
    return {
      opacity: interpolate(p, [0, 0.15, 1], [0, 1, 0], CLAMP),
      transform: [
        { translateX: Math.cos(aci) * mesafe * p },
        { translateY: Math.sin(aci) * mesafe * p },
        { scale: 1 - p * 0.5 },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.patlamaParcacik,
        {
          width: boyut,
          height: boyut,
          borderRadius: boyut / 2,
          marginLeft: -boyut / 2,
          marginTop: -boyut / 2,
          backgroundColor: renk,
          shadowColor: renk,
        },
        stil,
      ]}
    />
  );
}

function NormalSerit({
  ad,
  level,
  avatarUrl,
  anim,
}: {
  ad: string;
  level: number;
  avatarUrl?: string | null;
  anim: Anim;
}) {
  const renkler = SEVIYE_GIRIS_RENKLERI.normal;

  const stil = useAnimatedStyle(() => {
    const g = anim.giris.value;
    const c = anim.cikis.value;
    return {
      opacity: interpolate(g, [0, 0.35], [0, 1], CLAMP) * (1 - c),
      transform: [
        { translateX: (interpolate(g, [0, 1], [-SERIT_MAX_W * 0.9, 0]) - c * 28) * YON },
        { translateY: -c * 6 },
        { scale: interpolate(c, [0, 1], [1, 0.96]) },
      ],
    };
  });

  return (
    <Animated.View style={[styles.normalSerit, stil]}>
      <LinearGradient
        colors={['rgba(122,167,255,0.3)', 'rgba(122,167,255,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <Parilti parilti={anim.parilti} genislik={SERIT_MAX_W} opaklik={0.18} />
      <Avatar uri={avatarUrl} ad={ad} boyut={28} renkler={renkler} />
      {level > 0 ? (
        <LinearGradient
          colors={[renkler[1], renkler[2]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.seviyeCip}
        >
          <Ionicons name="star" size={8} color="#fff" />
          <Text style={styles.seviyeCipYazi}>{level}</Text>
        </LinearGradient>
      ) : null}
      <Text style={styles.normalAd} numberOfLines={1}>
        {ad}
      </Text>
      <Text style={styles.kisaMetin} numberOfLines={1}>
        {SeviyeGirisKisaMetin()}
      </Text>
    </Animated.View>
  );
}

function VipSerit({
  ad,
  level,
  kademe,
  avatarUrl,
  anim,
}: {
  ad: string;
  level: number;
  kademe: SeviyeGirisKademe;
  avatarUrl?: string | null;
  anim: Anim;
}) {
  const renkler = SEVIYE_GIRIS_RENKLERI[kademe];
  const isin = SEVIYE_GIRIS_ISIN[kademe];

  const kapStil = useAnimatedStyle(() => {
    const g = anim.giris.value;
    const c = anim.cikis.value;
    return {
      opacity: interpolate(g, [0, 0.3], [0, 1], CLAMP) * (1 - c),
      transform: [
        { translateX: (interpolate(g, [0, 1], [-W, 0]) - c * 32) * YON },
        { scale: interpolate(g, [0, 1], [0.9, 1]) * interpolate(c, [0, 1], [1, 0.95]) },
      ],
    };
  });

  const avatarStil = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(anim.giris.value, [0.2, 1], [0.4, 1]) }],
  }));

  const metinStil = useAnimatedStyle(() => {
    const g = anim.giris.value;
    return {
      opacity: interpolate(g, [0.35, 0.9], [0, 1], CLAMP),
      transform: [{ translateX: interpolate(g, [0.35, 1], [14, 0], CLAMP) * YON }],
    };
  });

  return (
    <Animated.View style={[styles.vipKap, { shadowColor: renkler[1] }, kapStil]}>
      <LinearGradient
        colors={[renkler[0], renkler[1], renkler[2]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.vipCerceve}
      >
        <View style={styles.vipIc}>
          <LinearGradient
            colors={[`${renkler[1]}55`, `${renkler[1]}00`]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 0.75, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          <Parilti parilti={anim.parilti} genislik={SERIT_MAX_W} opaklik={0.32} />
          {VIP_KIVILCIM.map((k, i) => (
            <Kivilcim key={`k-${i}`} {...k} donus={anim.donus} renk={isin.parcacik} />
          ))}

          <Animated.View style={[styles.vipAvatarKap, avatarStil]}>
            <View style={[styles.vipAvatarHalka, { borderColor: renkler[0] }]}>
              <Avatar uri={avatarUrl} ad={ad} boyut={40} renkler={renkler} />
            </View>
            <LinearGradient
              colors={[renkler[0], renkler[1]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.vipSeviyeRozet}
            >
              <Text style={styles.vipSeviyeYazi}>{level}</Text>
            </LinearGradient>
          </Animated.View>

          <Animated.View style={[styles.vipMetin, metinStil]}>
            <View style={styles.vipEtiketSatir}>
              <Ionicons name={rozetIkonu(kademe)} size={10} color={renkler[0]} />
              <Text style={[styles.vipEtiket, { color: renkler[0] }]} numberOfLines={1}>
                {SeviyeGirisEtiketi(kademe)}
              </Text>
            </View>
            <View style={styles.adSatir}>
              <Text style={styles.vipAd} numberOfLines={1}>
                {ad}
              </Text>
              <Text style={styles.kisaMetin} numberOfLines={1}>
                {SeviyeGirisKisaMetin()}
              </Text>
            </View>
          </Animated.View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

function HeroKart({
  ad,
  level,
  kademe,
  avatarUrl,
  anim,
}: {
  ad: string;
  level: number;
  kademe: SeviyeGirisKademe;
  avatarUrl?: string | null;
  anim: Anim;
}) {
  const renkler = SEVIYE_GIRIS_RENKLERI[kademe];
  const isin = SEVIYE_GIRIS_ISIN[kademe];
  const efsane = kademe === 'efsane';

  const perdeStil = useAnimatedStyle(() => ({
    opacity: interpolate(anim.giris.value, [0, 0.6], [0, 1], CLAMP) * (1 - anim.cikis.value),
  }));

  const kenarStil = useAnimatedStyle(() => {
    const nabiz = 0.6 + 0.4 * Math.sin(anim.donus.value * Math.PI * 4);
    return {
      opacity:
        interpolate(anim.giris.value, [0, 0.5], [0, 1], CLAMP) * nabiz * (1 - anim.cikis.value),
    };
  });

  const kartStil = useAnimatedStyle(() => {
    const g = anim.giris.value;
    const c = anim.cikis.value;
    return {
      opacity: interpolate(g, [0, 0.25], [0, 1], CLAMP) * (1 - c),
      transform: [
        { translateY: interpolate(g, [0, 1], [36, 0]) },
        { scale: interpolate(g, [0, 1], [0.86, 1]) * interpolate(c, [0, 1], [1, 1.05]) },
      ],
    };
  });

  const cerceveStil = useAnimatedStyle(() => ({
    transform: [{ rotate: `${anim.donus.value * 360}deg` }],
  }));

  const halkaStil = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-anim.donus.value * 720}deg` }],
  }));

  const avatarStil = useAnimatedStyle(() => {
    const g = anim.giris.value;
    return {
      transform: [
        { scale: interpolate(g, [0.1, 1], [0.3, 1]) },
        { rotate: `${interpolate(g, [0.1, 1], [-25, 0])}deg` },
      ],
    };
  });

  const metinStil = useAnimatedStyle(() => {
    const g = anim.giris.value;
    return {
      opacity: interpolate(g, [0.4, 0.95], [0, 1], CLAMP),
      transform: [{ translateX: interpolate(g, [0.4, 1], [18, 0], CLAMP) * YON }],
    };
  });

  return (
    <View style={styles.heroKatman} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, perdeStil]}>
        <LinearGradient
          colors={['rgba(6,4,12,0)', 'rgba(6,4,12,0.6)', 'rgba(6,4,12,0)']}
          locations={[0.05, 0.38, 0.75]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[styles.kenarUst, kenarStil]}>
        <LinearGradient colors={[isin.sol, 'transparent']} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[styles.kenarAlt, kenarStil]}>
        <LinearGradient colors={['transparent', isin.sag]} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <Animated.View style={[styles.heroKart, { shadowColor: renkler[1] }, kartStil]}>
        <View style={styles.heroCerceve}>
          <Animated.View style={[styles.heroCerceveDonen, cerceveStil]}>
            <LinearGradient
              colors={[renkler[0], renkler[2], renkler[1], renkler[0]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          <View style={styles.heroIc}>
            <LinearGradient
              colors={[`${renkler[1]}45`, `${renkler[1]}00`, `${renkler[2]}30`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Parilti parilti={anim.parilti} genislik={HERO_W} opaklik={0.3} />
            {VIP_KIVILCIM.map((k, i) => (
              <Kivilcim key={`k-${i}`} {...k} donus={anim.donus} renk={isin.parcacik} />
            ))}

            <Animated.View style={[styles.heroAvatarKap, avatarStil]}>
              <View style={styles.patlamaMerkez}>
                {PATLAMA.map((p, i) => (
                  <PatlamaParcacik
                    key={`p-${i}`}
                    {...p}
                    patlama={anim.patlama}
                    renk={efsane && i % 3 === 0 ? renkler[1] : isin.parcacik}
                  />
                ))}
              </View>
              <View style={styles.heroHalkaMaske}>
                <Animated.View style={[styles.heroHalkaDonen, halkaStil]}>
                  <LinearGradient
                    colors={[renkler[0], renkler[2], renkler[1], renkler[0]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
              </View>
              <View style={styles.heroAvatarIc}>
                <Avatar uri={avatarUrl} ad={ad} boyut={HERO_AVATAR} renkler={renkler} />
              </View>
            </Animated.View>

            <Animated.View style={[styles.heroMetin, metinStil]}>
              <LinearGradient
                colors={[renkler[0], renkler[1]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroRozet}
              >
                <Ionicons name={rozetIkonu(kademe)} size={11} color="#1A1224" />
                <Text style={styles.heroRozetYazi} numberOfLines={1}>
                  {SeviyeGirisEtiketi(kademe)}
                </Text>
              </LinearGradient>
              <Text style={[styles.heroAd, { textShadowColor: renkler[1] }]} numberOfLines={1}>
                {ad}
              </Text>
              <Text style={styles.heroAlt} numberOfLines={1}>
                {SeviyeGirisAltMetin(kademe, level)}
              </Text>
            </Animated.View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

export function SeviyeGirisAnimasyonu({
  gorunur,
  ad,
  level,
  kademe,
  avatarUrl,
  altBosluk = 260,
  onBitti,
}: Props) {
  const azHareket = useReducedMotion();
  const giris = useSharedValue(0);
  const cikis = useSharedValue(0);
  const parilti = useSharedValue(0);
  const donus = useSharedValue(0);
  const patlama = useSharedValue(0);
  const anim = useMemo<Anim>(
    () => ({ giris, cikis, parilti, donus, patlama }),
    [giris, cikis, parilti, donus, patlama],
  );
  const onBittiRef = useRef(onBitti);
  onBittiRef.current = onBitti;

  const sinematik = SeviyeGirisSinematikMi(kademe);
  const vip = kademe !== 'normal';

  useEffect(() => {
    const hepsi = [giris, cikis, parilti, donus, patlama];
    if (!gorunur) {
      for (const sv of hepsi) {
        cancelAnimation(sv);
        sv.value = 0;
      }
      return;
    }

    const bitir = () => onBittiRef.current?.();
    const bekle = Math.max(600, SeviyeGirisSuresiMs(kademe) - GIRIS_MS - CIKIS_MS);
    for (const sv of hepsi) sv.value = 0;

    if (azHareket) {
      giris.value = 1;
    } else {
      giris.value = withSpring(1, YAY);
      parilti.value = withDelay(
        280,
        withRepeat(
          withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
          vip ? 2 : 1,
          false,
        ),
      );
      if (vip) {
        donus.value = withRepeat(
          withTiming(1, { duration: 2600, easing: Easing.linear }),
          -1,
          false,
        );
      }
      if (sinematik) {
        patlama.value = withDelay(
          160,
          withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }),
        );
      }
    }

    cikis.value = withDelay(
      GIRIS_MS + bekle,
      withTiming(1, { duration: CIKIS_MS, easing: Easing.in(Easing.cubic) }, (bitti) => {
        if (bitti) runOnJS(bitir)();
      }),
    );

    const zamanlayicilar: ReturnType<typeof setTimeout>[] = [];
    if (vip) {
      zamanlayicilar.push(
        setTimeout(() => {
          void Haptics.impactAsync(
            sinematik ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
          );
        }, 140),
      );
    }
    if (kademe === 'efsane') {
      zamanlayicilar.push(
        setTimeout(() => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 520),
      );
    }
    return () => {
      for (const t of zamanlayicilar) clearTimeout(t);
    };
  }, [gorunur, kademe, vip, sinematik, azHareket, giris, cikis, parilti, donus, patlama]);

  if (!gorunur) return null;

  if (sinematik) {
    return (
      <View style={styles.overlay} pointerEvents="none">
        <HeroKart ad={ad} level={level} kademe={kademe} avatarUrl={avatarUrl} anim={anim} />
      </View>
    );
  }

  return (
    <View style={styles.overlay} pointerEvents="none">
      <View style={[styles.seritYeri, { bottom: altBosluk }]}>
        {vip ? (
          <VipSerit ad={ad} level={level} kademe={kademe} avatarUrl={avatarUrl} anim={anim} />
        ) : (
          <NormalSerit ad={ad} level={level} avatarUrl={avatarUrl} anim={anim} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 38,
    overflow: 'hidden',
  },
  seritYeri: {
    position: 'absolute',
    left: 10,
    right: 10,
    alignItems: 'flex-start',
  },
  avatarTaban: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  harf: {
    fontWeight: '900',
    color: '#fff',
  },
  parilti: {
    position: 'absolute',
    top: -12,
    bottom: -12,
    left: 0,
    width: 46,
  },
  kivilcim: {
    position: 'absolute',
  },
  kisaMetin: {
    ...TipografiTokenlari.caption,
    flexShrink: 0,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },

  normalSerit: {
    maxWidth: SERIT_MAX_W,
    height: 36,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 4,
    paddingRight: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(10,10,22,0.62)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  seviyeCip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    height: 16,
    borderRadius: 8,
  },
  seviyeCipYazi: {
    fontSize: 10,
    fontWeight: '900',
    color: '#fff',
  },
  normalAd: {
    ...TipografiTokenlari.caption,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },

  vipKap: {
    maxWidth: SERIT_MAX_W,
    borderRadius: 30,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.55,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
      },
      default: {},
    }),
  },
  vipCerceve: {
    padding: 1.5,
    borderRadius: 30,
  },
  vipIc: {
    height: 54,
    borderRadius: 28.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 5,
    paddingRight: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,20,0.92)',
  },
  vipAvatarKap: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vipAvatarHalka: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vipSeviyeRozet: {
    position: 'absolute',
    bottom: -3,
    minWidth: 22,
    height: 14,
    paddingHorizontal: 4,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vipSeviyeYazi: {
    fontSize: 9,
    fontWeight: '900',
    color: '#1A1224',
  },
  vipMetin: {
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
  },
  vipEtiketSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vipEtiket: {
    ...TipografiTokenlari.micro,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  adSatir: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  vipAd: {
    ...TipografiTokenlari.caption,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '900',
    color: '#fff',
  },

  heroKatman: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
  },
  kenarUst: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  kenarAlt: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  heroKart: {
    position: 'absolute',
    top: H * 0.3,
    width: HERO_W,
    borderRadius: 26,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.6,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 8 },
      },
      default: {},
    }),
  },
  heroCerceve: {
    borderRadius: 26,
    padding: 2,
    overflow: 'hidden',
  },
  heroCerceveDonen: {
    position: 'absolute',
    width: HERO_W * 1.5,
    height: HERO_W * 1.5,
    left: -HERO_W * 0.25,
    top: -HERO_W * 0.75 + 50,
  },
  heroIc: {
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,9,20,0.94)',
  },
  heroAvatarKap: {
    width: HERO_HALKA,
    height: HERO_HALKA,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patlamaMerkez: {
    position: 'absolute',
    left: HERO_HALKA / 2,
    top: HERO_HALKA / 2,
    width: 0,
    height: 0,
  },
  patlamaParcacik: {
    position: 'absolute',
    ...Platform.select({
      ios: {
        shadowOpacity: 0.9,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 0 },
      },
      default: {},
    }),
  },
  heroHalkaMaske: {
    width: HERO_HALKA,
    height: HERO_HALKA,
    borderRadius: HERO_HALKA / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroHalkaDonen: {
    width: HERO_HALKA * 1.5,
    height: HERO_HALKA * 1.5,
  },
  heroAvatarIc: {
    position: 'absolute',
    width: HERO_AVATAR + 4,
    height: HERO_AVATAR + 4,
    borderRadius: (HERO_AVATAR + 4) / 2,
    borderWidth: 2,
    borderColor: 'rgb(12,9,20)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroMetin: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    alignItems: 'flex-start',
  },
  heroRozet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  heroRozetYazi: {
    ...TipografiTokenlari.micro,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.3,
    color: '#1A1224',
  },
  heroAd: {
    ...TipografiTokenlari.title,
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  heroAlt: {
    ...TipografiTokenlari.caption,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
});
