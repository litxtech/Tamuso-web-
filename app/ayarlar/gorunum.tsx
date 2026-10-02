import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { GorunumSecimKartlari } from '../../src/moduller/gorunum/bilesenler/GorunumSecimKartlari';
import { useTema } from '../../src/tasarim-sistemi/tema/TemaSaglayici';
import { TEMA_META } from '../../src/tasarim-sistemi/tema/TemaTipleri';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari, HeaderTokenlari } from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri, type CeviriAnahtari } from '../../src/i18n/useCeviri';
import { YUZEN_TAB_ICERIK_BOSLUGU } from '../../src/components/YuzenTabBar';

/** Uygulama görünüm kataloğu — onlarca premium skin */
export default function GorunumAyarlariEkrani() {
  const { t } = useCeviri();
  const { kod, palet } = useTema();
  const aktifAd = t(TEMA_META[kod].adKey as CeviriAnahtari);

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri modulAdi="ayarlar-gorunum">
        <EkranBasligi
          title={t('gorunum.baslik')}
          subtitle={t('gorunum.alt')}
          fallbackHref="/ayarlar"
        />
        <ScrollView
          contentContainerStyle={styles.icerik}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.aktif, { color: palet.textDim }]}>
            {t('gorunum.aktif', { tema: aktifAd })}
          </Text>
          <GorunumSecimKartlari katalogMu />
          <View style={{ height: YUZEN_TAB_ICERIK_BOSLUGU }} />
        </ScrollView>
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  icerik: {
    paddingHorizontal: HeaderTokenlari.horizontal,
    paddingTop: HeaderTokenlari.contentGap,
    paddingBottom: BoslukTokenlari.xxl,
    gap: 10,
  },
  aktif: {
    ...TipografiTokenlari.micro,
    marginBottom: 6,
  },
});
