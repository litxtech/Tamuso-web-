import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { UygulamaKimligi } from '../yapilandirma/UygulamaKimligi';
import { useCeviri } from '../i18n/useCeviri';
import { RenkTokenlari } from '../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../tasarim-sistemi/BoslukVeYaricapTokenlari';

/** Çalışan paketin sürümü: mağaza sürümü + varsa yerel derleme numarası. */
function CalisanSurum(): string | null {
  const surum = Constants.expoConfig?.version?.trim();
  if (!surum) return null;

  const derleme =
    Platform.OS === 'ios'
      ? Constants.platform?.ios?.buildNumber?.trim() || null
      : Platform.OS === 'android' && Constants.platform?.android?.versionCode
        ? String(Constants.platform.android.versionCode)
        : null;

  if (derleme && derleme !== surum) return `${surum} (${derleme})`;
  return surum;
}

/** Ayarlar alt bilgisi — marka ve çalışan sürüm. */
export function UygulamaSurumNotu() {
  const { t } = useCeviri();
  const surum = CalisanSurum();
  if (!surum) return null;

  return (
    <View style={styles.kutu} accessibilityRole="text">
      <Text style={styles.marka}>{UygulamaKimligi.APP_NAME}</Text>
      <Text style={styles.surum}>{t('ayarlar.surum', { surum })}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kutu: {
    alignItems: 'center',
    paddingTop: BoslukTokenlari.lg,
    paddingBottom: BoslukTokenlari.sm,
    gap: 4,
  },
  marka: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  surum: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    fontWeight: '500',
  },
});
