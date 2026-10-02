import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CamArkaplan } from '../../../bilesenler/yuzey/CamArkaplan';
import { Ionicons } from '@expo/vector-icons';
import type { PkMacZengin } from '../skor/PkSkorOku';
import { PkKalanSaniye } from '../skor/PkSkorOlaylariniGetir';
import { useGecikmeliPkOnizleme } from '../onizleme/useGecikmeliPkOnizleme';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  mac: PkMacZengin;
  secili?: boolean;
  onPress: () => void;
};

function tarafAd(
  mac: PkMacZengin,
  side: 'a' | 'b',
  takimA: string,
  takimB: string,
) {
  const r = side === 'a' ? mac.side_a : mac.side_b;
  return (
    r?.title?.trim() ||
    r?.host_name?.trim() ||
    (side === 'a' ? takimA : takimB)
  );
}

function tarafKapak(mac: PkMacZengin, side: 'a' | 'b') {
  const r = side === 'a' ? mac.side_a : mac.side_b;
  return MedyaUriGuvenli(r?.cover_url ?? r?.avatar_url);
}

/**
 * PK yayin onizleme karti:
 * - seffaf / parlayan aura
 * - cift taraf onizleme
 * - skor 3 sn gecikmeli
 */
export function PkYayinOnizlemeKarti({ mac, secili, onPress }: Props) {
  const { t } = useCeviri();
  const pulse = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.45)).current;
  const gecikmeli = useGecikmeliPkOnizleme(mac.score_a, mac.score_b, 3000);
  const kalan = PkKalanSaniye(mac.ends_at);
  const toplam = gecikmeli.score_a + gecikmeli.score_b;
  const oranA = toplam > 0 ? (gecikmeli.score_a / toplam) * 100 : 50;
  const takimA = t('pk.takimA');
  const takimB = t('pk.takimB');

  useEffect(() => {
    const p = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const g = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 0.85,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.4,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    );
    p.start();
    g.start();
    return () => {
      p.stop();
      g.stop();
    };
  }, [pulse, glow]);

  const auraScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.035],
  });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.96 }]}
    >
      {/* Seffaf aura halkasi */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.aura,
          {
            opacity: glow,
            transform: [{ scale: auraScale }],
            borderColor: secili
              ? 'rgba(232, 64, 145, 0.55)'
              : 'rgba(196, 59, 255, 0.35)',
            shadowColor: secili ? RenkTokenlari.primary : RenkTokenlari.magenta,
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.auraDis,
          {
            opacity: glow.interpolate({
              inputRange: [0.4, 0.85],
              outputRange: [0.18, 0.42],
            }),
            transform: [{ scale: auraScale }],
          },
        ]}
      />

      <View style={[styles.kart, secili && styles.kartSecili]}>
        <LinearGradient
          colors={['rgba(232,64,145,0.22)', 'rgba(18,16,24,0.15)', 'rgba(139,92,246,0.2)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.onizlemeSatir}>
          <TarafOnizleme
            ad={tarafAd(mac, 'a', takimA, takimB)}
            kapak={tarafKapak(mac, 'a')}
            skor={gecikmeli.score_a}
            renk="#60A5FA"
            side="A"
          />
          <View style={styles.vsWrap}>
            <LinearGradient
              colors={[...RenkTokenlari.gradientPrimary]}
              style={styles.vsPill}
            >
              <Text style={styles.vsText}>VS</Text>
            </LinearGradient>
            <Text style={styles.gecikmeRozet}>{t('pk.onizlemeEtiket')}</Text>
          </View>
          <TarafOnizleme
            ad={tarafAd(mac, 'b', takimA, takimB)}
            kapak={tarafKapak(mac, 'b')}
            skor={gecikmeli.score_b}
            renk="#F472B6"
            side="B"
          />
        </View>

        <View style={styles.barTrack}>
          <View style={[styles.barA, { width: `${oranA}%` as `${number}%` }]} />
        </View>

        <View style={styles.altBar}>
          <CamArkaplan
            intensity={28}
            tint="dark"
            style={StyleSheet.absoluteFill}
            fallbackColor="rgba(18, 16, 24, 0.92)"
          />
          <View style={styles.altSol}>
            <View style={styles.liveDot} />
            <Text style={styles.liveYazi}>PK · {mac.pk_type.toUpperCase()}</Text>
          </View>
          <Text style={styles.timer}>
            {kalan == null
              ? 'CANLI'
              : `${Math.floor(kalan / 60)}:${String(kalan % 60).padStart(2, '0')}`}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function TarafOnizleme({
  ad,
  kapak,
  skor,
  renk,
  side,
}: {
  ad: string;
  kapak: string | null;
  skor: number;
  renk: string;
  side: string;
}) {
  return (
    <View style={styles.taraf}>
      <View style={[styles.tarafCam, { borderColor: `${renk}66` }]}>
        {MedyaUriGuvenli(kapak) ? (
          <Image source={{ uri: MedyaUriGuvenli(kapak)! }} style={styles.tarafImg} />
        ) : (
          <LinearGradient
            colors={
              side === 'A'
                ? ['#1A2848', '#121018']
                : ['#3A1830', '#121018']
            }
            style={styles.tarafImg}
          >
            <Ionicons name="videocam" size={22} color={renk} />
          </LinearGradient>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(8,4,14,0.85)']}
          style={styles.tarafFade}
        />
        <Text style={[styles.tarafSkor, { color: renk }]}>{skor}</Text>
      </View>
      <Text style={styles.tarafAd} numberOfLines={1}>
        {ad}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: BoslukTokenlari.lg,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  aura: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    marginHorizontal: 2,
    marginVertical: 6,
    borderRadius: YaricapTokenlari.xl + 4,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 18,
    elevation: 10,
  },
  auraDis: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    marginHorizontal: -2,
    marginVertical: 2,
    borderRadius: YaricapTokenlari.xl + 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(232, 64, 145, 0.06)',
  },
  kart: {
    borderRadius: YaricapTokenlari.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(26, 18, 36, 0.72)',
    minHeight: 210,
  },
  kartSecili: {
    borderColor: 'rgba(232, 64, 145, 0.65)',
  },
  onizlemeSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: BoslukTokenlari.md,
    paddingTop: BoslukTokenlari.md,
    gap: 8,
  },
  taraf: { flex: 1, alignItems: 'center', gap: 6 },
  tarafCam: {
    width: '100%',
    aspectRatio: 3 / 4,
    maxHeight: 148,
    borderRadius: YaricapTokenlari.md,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: RenkTokenlari.bgElevated,
  },
  tarafImg: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tarafFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  tarafSkor: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    width: '100%',
    textAlign: 'center',
    ...TipografiTokenlari.title,
    fontSize: 28,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  tarafAd: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
    maxWidth: '100%',
  },
  vsWrap: { alignItems: 'center', gap: 8, width: 64 },
  vsPill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textOnPrimary,
    fontWeight: '900',
  },
  gecikmeRozet: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontSize: 9,
    textAlign: 'center',
    lineHeight: 12,
  },
  barTrack: {
    marginHorizontal: BoslukTokenlari.md,
    marginTop: BoslukTokenlari.sm,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(244, 114, 182, 0.28)',
    overflow: 'hidden',
  },
  barA: { height: '100%', backgroundColor: '#60A5FA' },
  altBar: {
    marginTop: BoslukTokenlari.sm,
    paddingHorizontal: BoslukTokenlari.md,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderRadius: YaricapTokenlari.md,
    position: 'relative',
  },
  altSol: { flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 1 },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: RenkTokenlari.live,
  },
  liveYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  timer: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
    zIndex: 1,
  },
});
