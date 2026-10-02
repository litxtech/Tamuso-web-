import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Image, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import {
  HediyeAnimasyonuKuyrugu,
  type HediyeAnimasyonIslemi,
} from '../animasyon/HediyeAnimasyonuKuyrugu';

const { width: W, height: H } = Dimensions.get('window');
const ANDROID = Platform.OS === 'android';

/** Bigo / TikTok Live: sol alttan merkeze yay uçuş */
const BASLANGIC_X = -W * 0.28;
const BASLANGIC_Y = H * 0.32;
const YAY_YUKSEKLIK = -H * 0.12;

const SPRING_INIS = { damping: 12, stiffness: 170, mass: 0.8 };

function comboSeviye(adet: number): {
  renk: string;
  glow: string;
} {
  if (adet >= 188)
    return { renk: '#FF3D9A', glow: 'rgba(255,61,154,0.95)' };
  if (adet >= 77)
    return { renk: '#FF6B1A', glow: 'rgba(255,107,26,0.9)' };
  if (adet >= 17)
    return { renk: '#FFD24A', glow: 'rgba(255,210,74,0.85)' };
  if (adet >= 7)
    return { renk: '#FF9ECD', glow: 'rgba(255,158,205,0.8)' };
  return { renk: '#FFFFFF', glow: 'rgba(255,255,255,0.6)' };
}

/** Uçuş izi — yol boyunca solan hediye kopyaları */
function UcusIzi({
  emoji,
  fly,
  index,
}: {
  emoji: string;
  fly: SharedValue<number>;
  index: number;
}) {
  const stil = useAnimatedStyle(() => {
    const lag = Math.max(0, fly.value - index * 0.07);
    const p = Math.min(1, lag / 0.85);
    const yay = Math.sin(p * Math.PI) * YAY_YUKSEKLIK;
    return {
      opacity: interpolate(p, [0.05, 0.25, 0.7, 1], [0, 0.55, 0.25, 0]),
      transform: [
        { translateX: interpolate(p, [0, 1], [BASLANGIC_X, 0]) },
        { translateY: interpolate(p, [0, 1], [BASLANGIC_Y, 0]) + yay },
        {
          scale: interpolate(p, [0, 0.4, 1], [0.3, 0.58, 0.38]),
        },
        { rotate: `${interpolate(p, [0, 1], [-18, 8])}deg` },
      ],
    };
  });

  return <Animated.Text style={[styles.ucusIzi, stil]}>{emoji}</Animated.Text>;
}

function YukselenHediye({
  emoji,
  delay,
  x,
  seed,
}: {
  emoji: string;
  delay: number;
  x: number;
  seed: number;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = 0;
    t.value = withDelay(
      delay,
      withTiming(1, {
        duration: 2400 + seed * 90,
        easing: Easing.bezier(0.22, 0.61, 0.36, 1),
      }),
    );
  }, [delay, seed, t]);

  const stil = useAnimatedStyle(() => {
    const sway = Math.sin(t.value * Math.PI * 2.4 + seed) * 18;
    return {
      opacity: interpolate(t.value, [0, 0.08, 0.72, 1], [0, 1, 0.8, 0]),
      transform: [
        { translateX: x + sway },
        { translateY: interpolate(t.value, [0, 1], [72, -H * 0.48]) },
        {
          scale: interpolate(t.value, [0, 0.15, 0.65, 1], [0.28, 0.95, 0.8, 0.48]),
        },
        {
          rotate: `${interpolate(t.value, [0, 1], [-10 - seed * 2, 14 + seed * 3])}deg`,
        },
      ],
    };
  });

  return <Animated.Text style={[styles.yukselen, stil]}>{emoji}</Animated.Text>;
}

function KayanAvatar({
  ad,
  avatarUrl,
  sira,
}: {
  ad: string;
  avatarUrl?: string | null;
  sira: number;
}) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = 0;
    p.value = withDelay(
      180 + sira * 90,
      withSpring(1, { damping: 12, stiffness: 170, mass: 0.7 }),
    );
  }, [ad, p, sira]);

  const stil = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [
      { translateX: (1 - p.value) * 36 },
      { scale: 0.45 + p.value * 0.55 },
    ],
  }));

  return (
    <Animated.View style={[styles.avatarHalka, stil]}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarBos}>
          <Text style={styles.avatarHarf}>
            {ad.trim().slice(0, 1).toUpperCase()}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

function AliciAvatarSatiri({
  anahtar,
  alicilar,
}: {
  anahtar: string;
  alicilar: { ad: string; avatarUrl?: string | null }[];
}) {
  const kayma = useSharedValue(-28);
  const gorunen = alicilar.slice(0, 6);
  const fazla = alicilar.length - gorunen.length;

  useEffect(() => {
    kayma.value = -36;
    kayma.value = withTiming(0, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });
  }, [anahtar, kayma]);

  const satirStil = useAnimatedStyle(() => ({
    opacity: interpolate(kayma.value, [-36, 0], [0, 1]),
    transform: [{ translateX: kayma.value }],
  }));

  return (
    <Animated.View style={[styles.avatarSatir, satirStil]}>
      {gorunen.map((a, i) => (
        <KayanAvatar
          key={`${anahtar}_${a.ad}_${i}`}
          ad={a.ad}
          avatarUrl={a.avatarUrl}
          sira={i}
        />
      ))}
      {fazla > 0 ? <Text style={styles.avatarFazla}>+{fazla}</Text> : null}
    </Animated.View>
  );
}

/**
 * Hediye overlay — emoji uçuşu ve alıcı avatar sırası.
 */
export function HediyeAnimasyonKatmani() {
  const [aktif, setAktif] = useState<HediyeAnimasyonIslemi | null>(null);

  const fly = useSharedValue(0);
  const opacity = useSharedValue(0);
  const squash = useSharedValue(1);
  const merkezX = useSharedValue(1);

  useEffect(() => {
    return HediyeAnimasyonuKuyrugu.dinle((a) => {
      setAktif(a);
      if (a) {
        const hizli = a.durationMs < 1400;
        fly.value = 0;
        opacity.value = 0;
        squash.value = 1;
        merkezX.value = 0.4;

        fly.value = withTiming(1, {
          duration: hizli ? 520 : 720,
          easing: Easing.bezier(0.22, 0.82, 0.28, 1),
        });
        opacity.value = withSequence(
          withTiming(1, { duration: 120 }),
          withDelay(
            Math.max(480, a.durationMs - 560),
            withTiming(0, {
              duration: 340,
              easing: Easing.in(Easing.cubic),
            }),
          ),
        );
        squash.value = withDelay(
          hizli ? 460 : 640,
          withSequence(
            withTiming(0.82, { duration: 70 }),
            withSpring(1.08, SPRING_INIS),
            withSpring(1, { damping: 14, stiffness: 180 }),
          ),
        );
        const adet = a.quantity ?? 1;
        if (adet > 1) {
          merkezX.value = withDelay(
            hizli ? 500 : 680,
            withSequence(
              withTiming(adet >= 77 ? 2.55 : 1.95, {
                duration: 130,
                easing: Easing.out(Easing.back(2)),
              }),
              withSpring(1, { damping: 9, stiffness: 210 }),
            ),
          );
        } else {
          merkezX.value = withDelay(
            hizli ? 500 : 680,
            withSpring(1, SPRING_INIS),
          );
        }
      }
    });
  }, [fly, merkezX, opacity, squash]);

  useEffect(() => {
    if (!aktif) return;
    const adet = aktif.quantity ?? 1;
    if (adet <= 1) return;
    merkezX.value = withSequence(
      withTiming(adet >= 77 ? 2.35 : 1.8, {
        duration: 95,
        easing: Easing.out(Easing.back(2.1)),
      }),
      withSpring(1, { damping: 8, stiffness: 220 }),
    );
  }, [aktif?.comboTick, aktif?.quantity, aktif, merkezX]);

  const hediyeStil = useAnimatedStyle(() => {
    const p = fly.value;
    const yay = Math.sin(p * Math.PI) * YAY_YUKSEKLIK;
    const tx = interpolate(p, [0, 1], [BASLANGIC_X, 0]);
    const ty = interpolate(p, [0, 1], [BASLANGIC_Y, 0]) + yay;
    // Hafif küçültülmüş uçuş ölçeği
    const scale = interpolate(p, [0, 0.45, 0.85, 1], [0.24, 0.92, 1.02, 0.88]);
    const rot = interpolate(p, [0, 0.5, 1], [-22, 8, 0]);
    return {
      opacity: opacity.value,
      transform: [
        { translateX: tx },
        { translateY: ty },
        { rotate: `${rot}deg` },
        { scaleX: scale * squash.value },
        { scaleY: scale * (2 - squash.value) },
      ],
    };
  });

  const merkezXStil = useAnimatedStyle(() => ({
    transform: [{ scale: merkezX.value }],
    opacity: opacity.value,
  }));

  const yukselenler = useMemo(() => {
    if (!aktif) return [];
    const lux = !!aktif.fullScreen || (aktif.quantity ?? 1) >= 77;
    const n = ANDROID ? (lux ? 5 : 3) : lux ? 9 : (aktif.quantity ?? 1) >= 17 ? 7 : 4;
    return Array.from({ length: n }, (_, i) => ({
      key: `${aktif.id}_u_${i}`,
      delay: 560 + i * 95,
      x: (i - (n - 1) / 2) * 36 + (i % 2 === 0 ? -10 : 12),
      seed: i + 1,
    }));
  }, [aktif]);

  const izSayisi = ANDROID ? 3 : 5;
  const adetAktif = aktif ? Math.max(1, aktif.quantity ?? 1) : 1;
  const seviyeAktif = comboSeviye(adetAktif);
  const lux = !!aktif?.fullScreen || adetAktif >= 77;

  return (
    <View pointerEvents="none" style={styles.overlay}>
      {aktif ? (
        <View style={styles.merkez}>
          <View style={styles.yukselenKatman}>
            {yukselenler.map((u) => (
              <YukselenHediye
                key={u.key}
                emoji={aktif.emoji}
                delay={u.delay}
                x={u.x}
                seed={u.seed}
              />
            ))}
          </View>

          {Array.from({ length: izSayisi }).map((_, i) => (
            <UcusIzi
              key={`${aktif.id}_iz_${i}`}
              emoji={aktif.emoji}
              fly={fly}
              index={i + 1}
            />
          ))}

          <Animated.View style={[styles.hero, hediyeStil]}>
            <Text style={[styles.emoji, lux && styles.emojiBuyuk]}>
              {aktif.emoji}
            </Text>
            {adetAktif > 1 ? (
              <Animated.Text
                style={[
                  styles.merkezComboX,
                  {
                    color: seviyeAktif.renk,
                    textShadowColor: seviyeAktif.glow,
                  },
                  merkezXStil,
                ]}
              >
                ×{adetAktif}
              </Animated.Text>
            ) : null}
            {aktif.alicilar && aktif.alicilar.length > 0 ? null : aktif.receiverName ? (
              <Text style={styles.alici} numberOfLines={1}>
                {aktif.receiverName}
              </Text>
            ) : null}
          </Animated.View>
          {aktif.alicilar && aktif.alicilar.length > 0 ? (
            <AliciAvatarSatiri anahtar={aktif.id} alicilar={aktif.alicilar} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 50,
  },
  merkez: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yukselenKatman: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: H * 0.28,
  },
  yukselen: {
    position: 'absolute',
    fontSize: 22,
    bottom: 0,
  },
  ucusIzi: {
    position: 'absolute',
    fontSize: 28,
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 72,
  },
  emojiBuyuk: {
    fontSize: 88,
  },
  alici: {
    marginTop: 6,
    maxWidth: 220,
    fontSize: 15,
    fontWeight: '700',
    color: RenkTokenlari.textOnOverlay,
    textAlign: 'center',
  },
  avatarSatir: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarHalka: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: RenkTokenlari.textOnOverlay,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarBos: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHarf: {
    fontSize: 14,
    fontWeight: '800',
    color: RenkTokenlari.textOnOverlay,
  },
  avatarFazla: {
    fontSize: 13,
    fontWeight: '800',
    color: RenkTokenlari.textOnOverlay,
  },
  merkezComboX: {
    marginTop: -8,
    fontSize: 36,
    fontWeight: '900',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
});
