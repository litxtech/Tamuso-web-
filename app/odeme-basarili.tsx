import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCeviri } from '../src/i18n/useCeviri';
import { RenkTokenlari } from '../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../src/tasarim-sistemi/TipografiTokenlari';

/** Stripe / ajans-pay sonrası yeşil onay — ödeme başarıyla alındı */
export default function OdemeBasariliEkrani() {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ ok?: string; c?: string }>();
  const basarili = params.ok !== '0' && params.ok !== 'false';

  const kapat = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/wallet');
  }, []);

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          backgroundColor: basarili ? '#0B1F16' : '#1A1010',
        },
      ]}
    >
      <View style={[styles.iconWrap, basarili ? styles.iconOk : styles.iconFail]}>
        <Ionicons
          name={basarili ? 'checkmark-circle' : 'close-circle'}
          size={88}
          color={basarili ? '#22C55E' : '#F87171'}
        />
      </View>
      <Text style={styles.title}>
        {basarili ? t('odeme.basariliBaslik') : t('odeme.iptalBaslik')}
      </Text>
      <Text style={styles.alt}>
        {basarili ? t('odeme.basariliAlt') : t('odeme.iptalAlt')}
      </Text>
      {params.c ? (
        <Text style={styles.kod}>
          {t('odeme.satisKodu', { kod: String(params.c).toUpperCase() })}
        </Text>
      ) : null}
      <Pressable
        style={[styles.btn, basarili ? styles.btnOk : styles.btnFail]}
        onPress={kapat}
        accessibilityRole="button"
      >
        <Text style={styles.btnYazi}>{t('odeme.kapat')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconOk: { backgroundColor: 'rgba(34,197,94,0.12)' },
  iconFail: { backgroundColor: 'rgba(248,113,113,0.12)' },
  title: {
    ...TipografiTokenlari.title,
    color: '#F8FAFC',
    textAlign: 'center',
    fontWeight: '800',
  },
  alt: {
    ...TipografiTokenlari.body,
    color: 'rgba(248,250,252,0.72)',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  kod: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    marginTop: 14,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  btn: {
    marginTop: 36,
    minWidth: 200,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnOk: { backgroundColor: '#22C55E' },
  btnFail: { backgroundColor: '#EF4444' },
  btnYazi: {
    ...TipografiTokenlari.body,
    color: '#04140C',
    fontWeight: '800',
  },
});
