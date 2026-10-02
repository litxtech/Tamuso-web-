import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../../components/Screen';
import { UygulamaKimligi } from '../../../yapilandirma/UygulamaKimligi';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useTema } from '../../../tasarim-sistemi/tema/TemaSaglayici';
import { useCeviri } from '../../../i18n/useCeviri';
import { GorunumSecimKartlari } from './GorunumSecimKartlari';

/**
 * Görünüm seçimi (opsiyonel ekran).
 * İlk açılış artık zorunlu değil — varsayılan koyu.
 */
export function GorunumSecimEkrani() {
  const { palet } = useTema();
  const { t } = useCeviri();

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.kok}>
        <Text style={[styles.marka, { color: palet.textMuted }]}>
          {UygulamaKimligi.APP_NAME}
        </Text>
        <Text style={[styles.baslik, { color: palet.text }]}>
          {t('gorunum.secBaslik')}
        </Text>
        <Text style={[styles.alt, { color: palet.textMuted }]}>
          {t('gorunum.secAlt')}
        </Text>
        <GorunumSecimKartlari />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kok: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: BoslukTokenlari.xl,
    paddingBottom: BoslukTokenlari.xxxl,
  },
  marka: {
    ...TipografiTokenlari.micro,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: BoslukTokenlari.sm,
  },
  baslik: {
    ...TipografiTokenlari.title,
    marginBottom: BoslukTokenlari.md,
  },
  alt: {
    ...TipografiTokenlari.body,
    marginBottom: BoslukTokenlari.xl,
  },
});
