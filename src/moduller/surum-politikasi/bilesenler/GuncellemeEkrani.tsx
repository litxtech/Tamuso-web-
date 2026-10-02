import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { RenkTokenlariKoyu } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

const P = RenkTokenlariKoyu;

type Props = {
  baslik: string;
  mesaj: string;
  buton: string;
  kuruluSurum: string;
  hedefSurum: string;
  zorunlu: boolean;
  magazaHatasi: boolean;
  onGuncelle: () => void;
  onSonra?: () => void;
  onizleme?: boolean;
  onOnizlemeKapat?: () => void;
  bakimNotu?: string;
};

export function GuncellemeEkrani({
  baslik,
  mesaj,
  buton,
  kuruluSurum,
  hedefSurum,
  zorunlu,
  magazaHatasi,
  onGuncelle,
  onSonra,
  onizleme,
  onOnizlemeKapat,
  bakimNotu,
}: Props) {
  const { t, rtl } = useCeviri();
  const yazi = rtl
    ? { textAlign: 'right' as const, writingDirection: 'rtl' as const }
    : { textAlign: 'center' as const, writingDirection: 'ltr' as const };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.kok} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar style="light" />
        <View pointerEvents="none" style={[styles.isik, styles.isikSol]} />
        <View pointerEvents="none" style={[styles.isik, styles.isikSag]} />
        {onizleme ? (
          <Pressable
            onPress={onOnizlemeKapat}
            style={styles.onizlemeKapat}
            accessibilityRole="button"
            accessibilityLabel={t('ortak.kapat')}
          >
            <Text style={styles.onizlemeYazi}>{t('ortak.kapat')}</Text>
          </Pressable>
        ) : null}
        <View style={styles.orta}>
          <GuncellemeIkonu />
          <Text style={styles.marka} accessibilityRole="header">
            TAMUSO
          </Text>
          <View style={styles.kart}>
            <Text style={[styles.baslik, yazi]} maxFontSizeMultiplier={1.6}>
              {baslik}
            </Text>
            <Text style={[styles.mesaj, yazi]} maxFontSizeMultiplier={1.8}>
              {mesaj}
            </Text>
            {bakimNotu ? (
              <Text style={[styles.bakim, yazi]} maxFontSizeMultiplier={1.6}>
                {bakimNotu}
              </Text>
            ) : null}
            <Text
              style={styles.surum}
              accessibilityLabel={`${kuruluSurum} ${hedefSurum}`}
            >
              {kuruluSurum} → {hedefSurum}
            </Text>
            {magazaHatasi ? (
              <Text style={styles.hata} accessibilityRole="alert">
                {t('surum.magazaAcilamadi')}
              </Text>
            ) : null}
            <Pressable
              onPress={onGuncelle}
              style={styles.cta}
              accessibilityRole="button"
              accessibilityLabel={magazaHatasi ? t('surum.tekrarDene') : buton || t('surum.simdiGuncelle')}
            >
              <Text style={styles.ctaYazi}>
                {magazaHatasi ? t('surum.tekrarDene') : buton || t('surum.simdiGuncelle')}
              </Text>
            </Pressable>
            {!zorunlu && onSonra ? (
              <Pressable
                onPress={onSonra}
                style={styles.sonra}
                accessibilityRole="button"
                accessibilityLabel={t('surum.dahaSonra')}
              >
                <Text style={styles.sonraYazi}>{t('surum.dahaSonra')}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function GuncellemeIkonu() {
  const { t } = useCeviri();
  const [azalt, setAzalt] = useState(false);
  const donus = useRef(new Animated.Value(0)).current;
  const parilti = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    let iptal = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (!iptal) setAzalt(v);
    });
    const dinle = AccessibilityInfo.addEventListener('reduceMotionChanged', setAzalt);
    return () => {
      iptal = true;
      dinle.remove();
    };
  }, []);

  useEffect(() => {
    if (azalt) return;
    const halka = Animated.loop(
      Animated.timing(donus, {
        toValue: 1,
        duration: 14000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const isik = Animated.loop(
      Animated.sequence([
        Animated.timing(parilti, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(parilti, {
          toValue: 0.3,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    halka.start();
    isik.start();
    return () => {
      halka.stop();
      isik.stop();
    };
  }, [azalt, donus, parilti]);

  const aci = donus.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View
      style={styles.ikonAlan}
      accessibilityRole="image"
      accessibilityLabel={t('surum.ikonEtiket')}
    >
      <Animated.View style={[styles.halka, azalt ? null : { transform: [{ rotate: aci }] }]} />
      <View style={styles.logoDaire}>
        <Text style={styles.logoHarf}>T</Text>
      </View>
      <Animated.Text style={[styles.parilti, { opacity: azalt ? 0.7 : parilti }]}>
        ✦
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kok: {
    flex: 1,
    backgroundColor: P.bg,
  },
  isik: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.22,
  },
  isikSol: {
    top: -40,
    left: -80,
    backgroundColor: P.violet,
  },
  isikSag: {
    bottom: 40,
    right: -90,
    backgroundColor: P.primary,
    opacity: 0.16,
  },
  orta: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: BoslukTokenlari.xl,
  },
  ikonAlan: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: BoslukTokenlari.lg,
  },
  halka: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderTopColor: P.primarySoft,
    borderRightColor: 'rgba(139, 92, 246, 0.55)',
  },
  logoDaire: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: P.bgCard,
    borderWidth: 1,
    borderColor: P.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoHarf: {
    color: P.text,
    fontSize: 30,
    fontWeight: '700',
  },
  parilti: {
    position: 'absolute',
    top: 8,
    right: 10,
    color: P.primarySoft,
    fontSize: 14,
  },
  marka: {
    ...TipografiTokenlari.micro,
    color: P.textDim,
    letterSpacing: 4,
    marginBottom: BoslukTokenlari.lg,
  },
  kart: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: P.bgGlass,
    borderRadius: YaricapTokenlari.xl ?? 28,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: BoslukTokenlari.xl,
    paddingVertical: BoslukTokenlari.xxl ?? BoslukTokenlari.xl,
    alignItems: 'center',
    gap: BoslukTokenlari.md,
  },
  baslik: {
    ...TipografiTokenlari.title,
    color: P.text,
    fontSize: 26,
  },
  mesaj: {
    ...TipografiTokenlari.body,
    color: P.textMuted,
    lineHeight: 24,
  },
  bakim: {
    ...TipografiTokenlari.caption,
    color: P.textDim,
  },
  surum: {
    color: P.primarySoft,
    fontSize: 15,
    fontWeight: '600',
    writingDirection: 'ltr',
    marginTop: BoslukTokenlari.xs ?? 4,
  },
  hata: {
    color: P.danger,
    textAlign: 'center',
  },
  cta: {
    alignSelf: 'stretch',
    backgroundColor: P.primary,
    borderRadius: YaricapTokenlari.lg,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: BoslukTokenlari.sm,
    paddingHorizontal: BoslukTokenlari.lg,
  },
  ctaYazi: {
    color: P.textOnPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  sonra: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: BoslukTokenlari.md,
  },
  sonraYazi: {
    color: P.textMuted,
    fontSize: 15,
  },
  onizlemeKapat: {
    alignSelf: 'flex-end',
    marginTop: BoslukTokenlari.sm,
    marginRight: BoslukTokenlari.lg,
    minHeight: 44,
    justifyContent: 'center',
  },
  onizlemeYazi: {
    color: P.textMuted,
    fontSize: 15,
  },
});
