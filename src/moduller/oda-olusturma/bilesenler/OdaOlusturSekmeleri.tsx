import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri, type CeviriAnahtari } from '../../../i18n/useCeviri';

export type OdaOlusturSekmeKodu = 'mod' | 'kapasite' | 'duzen' | 'tema' | 'detay';

const SEKME_SIRASI: Array<{
  kod: OdaOlusturSekmeKodu;
  etiketKey: CeviriAnahtari;
  adim: number;
}> = [
  { kod: 'mod', etiketKey: 'olusturTab.mod', adim: 1 },
  { kod: 'kapasite', etiketKey: 'olusturTab.boyut', adim: 2 },
  { kod: 'duzen', etiketKey: 'olusturTab.duzen', adim: 3 },
  { kod: 'tema', etiketKey: 'olusturTab.tema', adim: 4 },
  { kod: 'detay', etiketKey: 'olusturTab.detay', adim: 5 },
];

type Props = {
  aktif: OdaOlusturSekmeKodu;
  onSec: (kod: OdaOlusturSekmeKodu) => void;
};

export function OdaOlusturSekmeleri({ aktif, onSec }: Props) {
  const { t } = useCeviri();
  const sekmeler = useMemo(
    () =>
      SEKME_SIRASI.map((s) => ({
        ...s,
        etiket: t(s.etiketKey),
      })),
    [t],
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.serit}
    >
      {sekmeler.map((sekme) => {
        const secili = aktif === sekme.kod;
        return (
          <Pressable
            key={sekme.kod}
            onPress={() => onSec(sekme.kod)}
            style={styles.hit}
            accessibilityRole="tab"
            accessibilityState={{ selected: secili }}
          >
            {secili ? (
              <LinearGradient
                colors={[...RenkTokenlari.gradientPrimary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.chipAktif}
              >
                <Text style={styles.adimAktif}>{sekme.adim}</Text>
                <Text style={styles.etiketAktif}>{sekme.etiket}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.chip}>
                <Text style={styles.adim}>{sekme.adim}</Text>
                <Text style={styles.etiket}>{sekme.etiket}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function sonrakiSekme(aktif: OdaOlusturSekmeKodu): OdaOlusturSekmeKodu | null {
  const i = SEKME_SIRASI.findIndex((s) => s.kod === aktif);
  if (i < 0 || i >= SEKME_SIRASI.length - 1) return null;
  return SEKME_SIRASI[i + 1].kod;
}

export function oncekiSekme(aktif: OdaOlusturSekmeKodu): OdaOlusturSekmeKodu | null {
  const i = SEKME_SIRASI.findIndex((s) => s.kod === aktif);
  if (i <= 0) return null;
  return SEKME_SIRASI[i - 1].kod;
}

const styles = StyleSheet.create({
  serit: {
    paddingHorizontal: BoslukTokenlari.xl,
    gap: BoslukTokenlari.sm,
    paddingBottom: BoslukTokenlari.md,
  },
  hit: {},
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },
  chipAktif: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.pill,
  },
  adim: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontSize: 10,
  },
  adimAktif: {
    ...TipografiTokenlari.micro,
    color: 'rgba(18,4,12,0.7)',
    fontSize: 10,
    fontWeight: '800',
  },
  etiket: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '600',
  },
  etiketAktif: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textOnPrimary,
    fontWeight: '800',
  },
});
