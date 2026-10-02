import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  modAd: string;
  modKod: string;
  kapasiteAd: string;
  kapasiteKod: string;
  duzenAd: string;
  duzenKod: string;
  temaAd: string;
  temaKod: string;
  temaRenkler: readonly [string, string, string];
};

/** Seçim özeti — detay sekmesinde marka yüzü */
export function OdaOlusturOzetSeridi({
  modAd,
  modKod,
  kapasiteAd,
  kapasiteKod,
  duzenAd,
  duzenKod,
  temaAd,
  temaKod,
  temaRenkler,
}: Props) {
  const { t } = useCeviri();
  return (
    <LinearGradient colors={[...temaRenkler]} style={styles.wrap}>
      <Text style={styles.eyebrow}>{t('olusturTab.sahneOzeti')}</Text>
      <View style={styles.grid}>
        <OzetSatir etiket={t('olusturTab.mod')} deger={modAd} kod={modKod} />
        <OzetSatir etiket={t('olusturTab.boyut')} deger={kapasiteAd} kod={kapasiteKod} />
        <OzetSatir etiket={t('olusturTab.duzen')} deger={duzenAd} kod={duzenKod} />
        <OzetSatir etiket={t('olusturTab.tema')} deger={temaAd} kod={temaKod} />
      </View>
    </LinearGradient>
  );
}

function OzetSatir({
  etiket,
  deger,
  kod,
}: {
  etiket: string;
  deger: string;
  kod: string;
}) {
  return (
    <View style={styles.satir}>
      <Text style={styles.etiket}>{etiket}</Text>
      <Text style={styles.deger}>{deger}</Text>
      <Text style={styles.kod}>{kod}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: YaricapTokenlari.lg,
    padding: BoslukTokenlari.lg,
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
    gap: BoslukTokenlari.md,
    overflow: 'hidden',
  },
  eyebrow: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    letterSpacing: 1.4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: BoslukTokenlari.md,
  },
  satir: {
    width: '47%',
    gap: 2,
  },
  etiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontSize: 9,
  },
  deger: {
    ...TipografiTokenlari.body,
    fontWeight: '700',
    color: RenkTokenlari.text,
  },
  kod: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontSize: 9,
  },
});
