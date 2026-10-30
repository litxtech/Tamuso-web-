import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import { OyunAuraCerceve } from '../ortak/bilesenler/OyunAuraCerceve';
import type { OyunKazancDuyurusu } from './OyunKazancDuyuruTipleri';
import { KazancCarpani, KazancCoin, KazancOyunAdi } from './OyunKazancMetin';

type Props = {
  duyuru: OyunKazancDuyurusu;
  onPress: () => void;
  onDismiss: () => void;
};

/** Kısa kalsın — dikkat çeksin, ekranda beklemeyin. */
const GOSTERIM_MS = 2400;
const YARICAP = 18;

const ATES = ['#FF1E00', '#FFD15A', '#FF6A00'] as const;

export function OyunKazancBalonu({ duyuru, onPress, onDismiss }: Props) {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const x = useSharedValue(360);
  const opacity = useSharedValue(0);
  const sarsinti = useSharedValue(0);

  useEffect(() => {
    x.value = withSpring(0, { damping: 13, stiffness: 210 });
    opacity.value = withTiming(1, { duration: 140 });
    sarsinti.value = withSequence(
      withTiming(1, { duration: 36 }),
      withTiming(-1, { duration: 42 }),
      withTiming(0.8, { duration: 36 }),
      withTiming(-0.5, { duration: 34 }),
      withTiming(0, { duration: 40 }),
    );
    const zaman = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 180 });
      x.value = withTiming(-420, { duration: 240, easing: Easing.in(Easing.cubic) }, (done) => {
        if (done) runOnJS(onDismiss)();
      });
    }, GOSTERIM_MS);
    return () => clearTimeout(zaman);
  }, [duyuru.id, onDismiss, opacity, sarsinti, x]);

  const anim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: x.value + sarsinti.value * 7 },
      { rotate: `${sarsinti.value * 0.8}deg` },
    ],
  }));

  const oyun = KazancOyunAdi(duyuru.game_code, duyuru.game_title, t('oyun.meyveKisa'));
  const carpan = KazancCarpani(duyuru.multiplier, duyuru.win_amount, duyuru.bet_amount);
  const coin = KazancCoin(duyuru.win_amount);
  const metin = carpan
    ? t('odalar.kazancMetin', { ad: duyuru.display_name, oyun, carpan, coin })
    : t('odalar.kazancMetinDuz', { ad: duyuru.display_name, oyun, coin });

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { top: Math.max(insets.top, 8) + 2 }]}
    >
      <Animated.View style={anim}>
        <Kor />
        <OyunAuraCerceve
          renkler={ATES}
          yaricap={YARICAP}
          kalinlik={3.5}
          hizMs={520}
          parlamaRengi="#FF2A00"
        >
          <Pressable
            onPress={onPress}
            style={({ pressed }) => [styles.balon, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={metin}
          >
            <Text style={styles.baslik} numberOfLines={2}>
              {metin}
            </Text>
            <Text style={styles.alt} numberOfLines={1}>
              {t('odalar.kazancOyna')}
            </Text>
          </Pressable>
        </OyunAuraCerceve>
      </Animated.View>
    </View>
  );
}

/** Köşelerde hızlı alev titreşimi. */
function Kor() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Kivilcim sol={8} ust={-3} gecikme={0} />
      <Kivilcim sol={undefined} ust={-4} sag={18} gecikme={40} />
      <Kivilcim sol={28} ust={undefined} alt={-3} gecikme={80} />
      <Kivilcim sol={undefined} ust={undefined} sag={10} alt={-4} gecikme={20} />
    </View>
  );
}

function Kivilcim({
  sol,
  sag,
  ust,
  alt,
  gecikme,
}: {
  sol?: number;
  sag?: number;
  ust?: number;
  alt?: number;
  gecikme: number;
}) {
  const o = useSharedValue(0.15);
  const olcek = useSharedValue(0.6);

  useEffect(() => {
    const zaman = setTimeout(() => {
      o.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 70 }),
          withTiming(0.12, { duration: 90 }),
        ),
        -1,
        true,
      );
      olcek.value = withRepeat(
        withSequence(
          withTiming(1.35, { duration: 80 }),
          withTiming(0.55, { duration: 100 }),
        ),
        -1,
        true,
      );
    }, gecikme);
    return () => clearTimeout(zaman);
  }, [gecikme, o, olcek]);

  const stil = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [{ scale: olcek.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.kivilcim,
        { left: sol, right: sag, top: ust, bottom: alt },
        stil,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: BoslukTokenlari.md,
    right: BoslukTokenlari.md,
    zIndex: 240,
    elevation: 240,
  },
  balon: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(28, 6, 4, 0.96)',
  },
  pressed: { opacity: 0.92 },
  baslik: {
    ...TipografiTokenlari.body,
    color: '#FFF6E8',
    fontWeight: '800',
  },
  alt: {
    ...TipografiTokenlari.caption,
    color: '#FFB15A',
    fontWeight: '800',
    marginTop: 2,
  },
  kivilcim: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5A00',
    shadowColor: '#FF2A00',
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
});
