import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useCeviri } from '../../../i18n/useCeviri';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';

const BEKLE_MESAJ_KEYS = [
  'aiMuzik.bekleMesaj1',
  'aiMuzik.bekleMesaj2',
  'aiMuzik.bekleMesaj3',
  'aiMuzik.bekleMesaj4',
  'aiMuzik.bekleMesaj5',
  'aiMuzik.bekleMesaj6',
] as const;

type Props = {
  visible: boolean;
  alt?: string;
  /** Kullanıcı beklemeyi kapatıp gezinebilsin — üretim backend’de sürer */
  onKapat?: () => void;
};

export function AiMuzikBeklemeAnimasyonu({ visible, alt, onKapat }: Props) {
  const { t } = useCeviri();
  const [mesajIdx, setMesajIdx] = useState(0);
  const shimmer = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!visible) return;
    setMesajIdx(0);
    shimmer.value = 0;
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.cubic) }),
      ),
      -1,
      false,
    );
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    const timer = setInterval(() => {
      setMesajIdx((i) => (i + 1) % BEKLE_MESAJ_KEYS.length);
    }, 3800);
    return () => clearInterval(timer);
  }, [visible, shimmer, pulse]);

  const barStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + shimmer.value * 0.6,
    transform: [{ translateX: (shimmer.value - 0.5) * 48 }],
  }));

  const halkaStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.kart}>
          <Animated.View style={halkaStyle}>
            <LinearGradient
              colors={[RenkTokenlari.primarySoft, RenkTokenlari.violet]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ikonHalka}
            >
              <Text style={styles.ikon}>♪</Text>
            </LinearGradient>
          </Animated.View>
          <Text style={styles.baslik}>{t('aiMuzik.bekleBaslik')}</Text>
          <Text style={styles.mesaj} accessibilityLiveRegion="polite">
            {t(BEKLE_MESAJ_KEYS[mesajIdx])}
          </Text>
          {alt ? <Text style={styles.alt}>{alt}</Text> : null}
          <View style={styles.barTrack} accessibilityLabel={t('aiMuzik.ilerlemeA11y')}>
            <Animated.View style={[styles.barFill, barStyle]} />
          </View>
          <Text style={styles.ipucu}>{t('aiMuzik.bekleIpucu')}</Text>
          {onKapat ? (
            <Pressable
              style={styles.gezin}
              onPress={onKapat}
              accessibilityRole="button"
              accessibilityLabel={t('aiMuzik.gezinmeyeDevam')}
            >
              <Ionicons name="arrow-forward" size={16} color={RenkTokenlari.primarySoft} />
              <Text style={styles.gezinYazi}>{t('aiMuzik.gezinmeyeDevam')}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: BoslukTokenlari.xl,
  },
  kart: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: RenkTokenlari.surface,
    borderRadius: YaricapTokenlari.xl,
    padding: BoslukTokenlari.xl,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  ikonHalka: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: BoslukTokenlari.md,
  },
  ikon: {
    fontSize: 30,
    color: '#fff',
  },
  baslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    marginBottom: BoslukTokenlari.sm,
  },
  mesaj: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
    minHeight: 48,
  },
  alt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    marginTop: BoslukTokenlari.xs,
  },
  barTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: RenkTokenlari.border,
    marginTop: BoslukTokenlari.lg,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    width: '42%',
    borderRadius: 2,
    backgroundColor: RenkTokenlari.primarySoft,
  },
  ipucu: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    textAlign: 'center',
    marginTop: BoslukTokenlari.md,
    lineHeight: 18,
  },
  gezin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: BoslukTokenlari.lg,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  gezinYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.primarySoft,
  },
});
