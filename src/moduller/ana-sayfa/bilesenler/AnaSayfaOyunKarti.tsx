/**
 * Feed oyun kartı — 2'li pencerede gerçek kapak, karakter ve yüzen semboller.
 * Etrafında dönen aura + kıvılcım; içeride ışık süpürmesi ve nefes alan OYNA.
 */

import React, { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { FeedPencereCerceve } from './FeedPencereCerceve';
import { AnaSayfaSesCubuklari } from './AnaSayfaSesCubuklari';
import type { OyunKartKimligi } from '../../oyunlar/ortak/katalog/OyunKartKatalogu';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  AnimasyonTokenlari,
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

export const FEED_KART_ORANI = 0.76;

type Props = {
  oyun: OyunKartKimligi;
  onPress: () => void;
  index?: number;
  /** Sürekli animasyonlar (ilk ekranda true, uzak satırlarda false) */
  aktif?: boolean;
};

type YuzenProps = {
  kaynak: OyunKartKimligi['semboller'][number];
  stil: { left?: `${number}%`; right?: `${number}%`; top: `${number}%`; width: `${number}%` };
  gecikmeMs: number;
  aktif: boolean;
  donusDerece?: number;
};

function YuzenSembol({ kaynak, stil, gecikmeMs, aktif, donusDerece = 6 }: YuzenProps) {
  const faz = useSharedValue(0);

  useEffect(() => {
    if (!aktif) {
      faz.value = 0.5;
      return;
    }
    faz.value = withDelay(
      gecikmeMs,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2200 + gecikmeMs * 0.6, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2200 + gecikmeMs * 0.6, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, [aktif, faz, gecikmeMs]);

  const anim = useAnimatedStyle(() => ({
    transform: [
      { translateY: (faz.value - 0.5) * 14 },
      { rotate: `${(faz.value - 0.5) * donusDerece * 2}deg` },
      { scale: 0.96 + faz.value * 0.08 },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.yuzen, stil, { aspectRatio: 1 }, anim]}
    >
      <View style={styles.yuzenGolge} />
      <Image source={kaynak} style={styles.yuzenImg} resizeMode="contain" />
    </Animated.View>
  );
}

export function AnaSayfaOyunKarti({ oyun, onPress, index = 0, aktif = true }: Props) {
  const { t } = useCeviri();
  const zoom = useSharedValue(1);
  const supurme = useSharedValue(-1);
  const ctaNabiz = useSharedValue(0);
  const karakterFaz = useSharedValue(0);
  const basili = useSharedValue(0);

  useEffect(() => {
    if (!aktif) {
      zoom.value = 1.04;
      supurme.value = -1;
      ctaNabiz.value = 0.4;
      karakterFaz.value = 0.5;
      return;
    }
    zoom.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 9000, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    supurme.value = withRepeat(
      withSequence(
        withTiming(-1, { duration: 0 }),
        withDelay(
          1200 + index * 500,
          withTiming(1.4, { duration: 1300, easing: Easing.inOut(Easing.cubic) }),
        ),
        withDelay(3200, withTiming(-1, { duration: 0 })),
      ),
      -1,
      false,
    );
    ctaNabiz.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    karakterFaz.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [aktif, ctaNabiz, index, karakterFaz, supurme, zoom]);

  const kapakStil = useAnimatedStyle(() => ({
    transform: [{ scale: zoom.value }],
  }));
  const supurmeStil = useAnimatedStyle(() => ({
    transform: [{ translateX: supurme.value * 260 }, { rotate: '18deg' }],
    opacity: supurme.value > -1 && supurme.value < 1.4 ? 0.9 : 0,
  }));
  const ctaStil = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + ctaNabiz.value * 0.04 }],
    shadowOpacity: 0.35 + ctaNabiz.value * 0.4,
  }));
  const karakterStil = useAnimatedStyle(() => ({
    transform: [{ translateY: (karakterFaz.value - 0.5) * 8 }],
  }));
  const basStil = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - basili.value * 0.03 }],
  }));

  return (
    <Animated.View
      entering={FadeInUp.delay(60 + index * 45)
        .duration(AnimasyonTokenlari.yavas)
        .springify()
        .damping(17)}
      style={[styles.dis, basStil]}
    >
      <FeedPencereCerceve renkler={oyun.aura} aktif={aktif} index={index}>
        <Pressable
          onPress={onPress}
          delayPressIn={60}
          onPressIn={() => {
            basili.value = withSpring(1, { damping: 18, stiffness: 320 });
          }}
          onPressOut={() => {
            basili.value = withSpring(0, { damping: 14, stiffness: 260 });
          }}
          accessibilityRole="button"
          accessibilityLabel={t('anaSayfa.oyunAcA11y', { baslik: oyun.baslik })}
          style={styles.kart}
        >
          <Animated.Image
            source={oyun.kapak}
            style={[StyleSheet.absoluteFill, kapakStil]}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(6,8,16,0.28)', 'rgba(6,8,16,0)', 'rgba(6,8,16,0.5)', 'rgba(4,6,12,0.97)']}
            locations={[0, 0.26, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={[`${oyun.aura[0]}28`, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <Animated.View pointerEvents="none" style={[styles.karakter, karakterStil]}>
            <Image source={oyun.karakter} style={styles.karakterImg} resizeMode="contain" />
          </Animated.View>

          <YuzenSembol
            kaynak={oyun.semboller[0]}
            stil={{ left: '4%', top: '18%', width: '34%' }}
            gecikmeMs={0}
            aktif={aktif}
          />
          <YuzenSembol
            kaynak={oyun.semboller[1]}
            stil={{ left: '34%', top: '8%', width: '26%' }}
            gecikmeMs={700}
            aktif={aktif}
            donusDerece={-8}
          />
          <YuzenSembol
            kaynak={oyun.semboller[2]}
            stil={{ left: '8%', top: '42%', width: '24%' }}
            gecikmeMs={1300}
            aktif={aktif}
            donusDerece={10}
          />
          <YuzenSembol
            kaynak={oyun.semboller[3]}
            stil={{ right: '6%', top: '26%', width: '22%' }}
            gecikmeMs={400}
            aktif={aktif}
            donusDerece={-12}
          />

          <Animated.View pointerEvents="none" style={[styles.supurme, supurmeStil]}>
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.26)', 'rgba(255,255,255,0.06)', 'transparent']}
              locations={[0, 0.45, 0.6, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          <View style={styles.ust}>
            <View style={styles.tamusoNot} pointerEvents="none">
              <Text style={styles.tamusoMark}>TAMUSO</Text>
              <Text style={styles.tamusoAlt}>{t('oyun.tamusoGelistirdi')}</Text>
            </View>
            <View style={[styles.rozet, { borderColor: `${oyun.aura[0]}88` }]}>
              <Ionicons name="game-controller" size={10} color={oyun.aura[0]} />
              <Text style={[styles.rozetYazi, { color: oyun.aura[0] }]}>{t('anaSayfa.oyunRozet')}</Text>
              {aktif ? <AnaSayfaSesCubuklari yukseklik={9} renk={oyun.aura[1]} /> : null}
            </View>
          </View>

          <View style={styles.alt}>
            <Text style={styles.baslik} numberOfLines={1}>
              {oyun.baslik}
            </Text>
            <Text style={styles.slogan} numberOfLines={1}>
              {oyun.slogan}
            </Text>
            <Animated.View style={[styles.cta, { shadowColor: oyun.cta[0] }, ctaStil]}>
              <LinearGradient
                colors={[oyun.cta[0], oyun.cta[1]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaIc}
              >
                <Ionicons name="play" size={12} color="#FFFFFF" />
                <Text style={styles.ctaYazi}>{t('anaSayfa.oyna')}</Text>
              </LinearGradient>
            </Animated.View>
          </View>
        </Pressable>
      </FeedPencereCerceve>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dis: {
    flex: 1,
  },
  kart: {
    aspectRatio: FEED_KART_ORANI,
    backgroundColor: '#0B0D16',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  karakter: {
    position: 'absolute',
    right: '-10%',
    bottom: '12%',
    width: '66%',
    aspectRatio: 1,
    opacity: 0.96,
  },
  karakterImg: {
    width: '100%',
    height: '100%',
  },
  yuzen: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yuzenGolge: {
    position: 'absolute',
    left: '22%',
    right: '22%',
    bottom: '-2%',
    height: '12%',
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.22)',
    transform: [{ scaleX: 1.05 }],
  },
  yuzenImg: {
    width: '100%',
    height: '100%',
  },
  supurme: {
    position: 'absolute',
    top: -40,
    bottom: -40,
    left: -60,
    width: 120,
  },
  ust: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: BoslukTokenlari.sm + 2,
    paddingTop: BoslukTokenlari.sm + 2,
    gap: 6,
  },
  tamusoNot: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(6,8,16,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    maxWidth: '58%',
  },
  tamusoMark: {
    ...TipografiTokenlari.micro,
    fontSize: 8,
    letterSpacing: 1.4,
    fontWeight: '800',
    color: 'rgba(255,248,236,0.9)',
  },
  tamusoAlt: {
    ...TipografiTokenlari.micro,
    fontSize: 7,
    letterSpacing: 0.15,
    fontWeight: '600',
    color: 'rgba(232,228,240,0.64)',
    marginTop: 1,
  },
  rozet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(6,8,16,0.62)',
    borderWidth: 1,
  },
  rozetYazi: {
    ...TipografiTokenlari.micro,
    fontSize: 9,
    letterSpacing: 1.1,
    fontWeight: '800',
  },
  eyebrow: {
    ...TipografiTokenlari.micro,
    fontSize: 9,
    letterSpacing: 1.2,
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'right',
  },
  alt: {
    paddingHorizontal: BoslukTokenlari.sm + 2,
    paddingTop: 4,
    paddingBottom: BoslukTokenlari.sm + 2,
    gap: 2,
  },
  baslik: {
    color: '#FBF7EE',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  slogan: {
    ...TipografiTokenlari.micro,
    color: 'rgba(251,247,238,0.7)',
    fontSize: 10,
    letterSpacing: 0.1,
  },
  cta: {
    alignSelf: 'flex-start',
    marginTop: 4,
    borderRadius: YaricapTokenlari.pill,
    overflow: 'visible',
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  ctaIc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: YaricapTokenlari.pill,
  },
  ctaYazi: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
