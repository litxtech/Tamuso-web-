import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Screen } from '../../../components/Screen';
import { EkranBasligi } from '../../../components/EkranBasligi';
import { GradientButton } from '../../../components/GradientButton';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

/** iOS'ta App Store dışı dijital içerik satış ekranlarının yerine geçen bilgi ekranı. */
export function IosHariciOdemeYokEkrani() {
  const { t } = useCeviri();
  return (
    <Screen>
      <EkranBasligi title={t('cuzdanY.cuzdanim')} fallbackHref="/(tabs)/wallet" />
      <View style={styles.kap}>
        <Ionicons name="logo-apple" size={36} color={RenkTokenlari.text} />
        <Text style={styles.baslik}>{t('cuzdanY.iosYalnizAppStoreBaslik')}</Text>
        <Text style={styles.metin}>{t('cuzdanY.iosYalnizAppStore')}</Text>
        <GradientButton
          title={t('cuzdanY.cuzdanaGit')}
          onPress={() => router.replace('/(tabs)/wallet')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: BoslukTokenlari.md,
    paddingHorizontal: BoslukTokenlari.xl,
  },
  baslik: { ...TipografiTokenlari.h2, color: RenkTokenlari.text, textAlign: 'center' },
  metin: { ...TipografiTokenlari.body, color: RenkTokenlari.textMuted, textAlign: 'center' },
});
