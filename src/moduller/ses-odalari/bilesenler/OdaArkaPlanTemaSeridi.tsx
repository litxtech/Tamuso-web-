import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  ODA_TEMA_KATEGORILERI,
  OdaTemalariniFiltrele,
  type OdaTemaKategori,
  type OdaTemaTanim,
} from '../../oda-olusturma/katalog/OdaTemaKatalogu';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { YaricapTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri, type CeviriAnahtari } from '../../../i18n/useCeviri';

type Props = {
  seciliKod?: string | null;
  onSec: (tema: OdaTemaTanim) => void;
};

/**
 * Kategori filtreli modern / premium tema seçici.
 * Onlarca temayı rahat tarayıp seçmek için yatay şerit + kategori chip'leri.
 */
export function OdaArkaPlanTemaSeridi({ seciliKod, onSec }: Props) {
  const { t } = useCeviri();
  const [kategori, setKategori] = useState<OdaTemaKategori | 'hepsi'>('hepsi');
  const temalar = useMemo(() => OdaTemalariniFiltrele(kategori), [kategori]);

  return (
    <View style={styles.kok}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.kategoriSerit}
      >
        {ODA_TEMA_KATEGORILERI.map((k) => {
          const secili = kategori === k.kod;
          return (
            <Pressable
              key={k.kod}
              onPress={() => setKategori(k.kod)}
              accessibilityRole="button"
              accessibilityState={{ selected: secili }}
              style={({ pressed }) => [
                styles.kategoriChip,
                secili && styles.kategoriChipAktif,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.kategoriYazi,
                  secili && styles.kategoriYaziAktif,
                ]}
              >
                {t(k.adKey as CeviriAnahtari)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.sayac}>
        {t('odaTema.temaSayisi', { n: temalar.length })}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.serit}
      >
        {temalar.map((tema) => {
          const secili = seciliKod === tema.kod;
          return (
            <Pressable
              key={tema.kod}
              onPress={() => onSec(tema)}
              accessibilityRole="button"
              accessibilityState={{ selected: secili }}
              accessibilityLabel={t('sesOda.temaA11y', { tema: tema.ad })}
              style={({ pressed }) => [
                styles.hit,
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.kart,
                  secili && {
                    borderColor: tema.vurgu,
                  },
                ]}
              >
                <LinearGradient
                  colors={[...tema.renkler]}
                  start={{ x: 0.1, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={styles.onizleme}
                >
                  <View
                    style={[
                      styles.vurguHalka,
                      { borderColor: `${tema.vurgu}99` },
                    ]}
                  >
                    <View
                      style={[
                        styles.vurguNokta,
                        { backgroundColor: tema.vurgu },
                      ]}
                    />
                  </View>
                  {secili ? (
                    <View
                      style={[styles.onay, { backgroundColor: tema.vurgu }]}
                    >
                      <Ionicons name="checkmark" size={11} color="#fff" />
                    </View>
                  ) : null}
                </LinearGradient>
                <Text
                  style={[styles.ad, secili && { color: '#fff' }]}
                  numberOfLines={1}
                >
                  {tema.ad}
                </Text>
                <Text style={styles.alt} numberOfLines={1}>
                  {tema.alt}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  kok: { gap: 8 },
  kategoriSerit: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
    paddingVertical: 2,
  },
  kategoriChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  kategoriChipAktif: {
    borderColor: 'rgba(255,255,255,0.42)',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  kategoriYazi: {
    ...TipografiTokenlari.micro,
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.62)',
  },
  kategoriYaziAktif: {
    color: '#fff',
  },
  sayac: {
    ...TipografiTokenlari.micro,
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    paddingLeft: 2,
  },
  serit: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 2,
    paddingRight: 8,
  },
  hit: { flexShrink: 0 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
  kart: {
    width: 92,
    borderRadius: YaricapTokenlari.md,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  onizleme: {
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vurguHalka: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vurguNokta: {
    width: 12,
    height: 12,
    borderRadius: 6,
    opacity: 0.95,
  },
  onay: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ad: {
    ...TipografiTokenlari.micro,
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
    paddingHorizontal: 4,
    paddingTop: 6,
  },
  alt: {
    ...TipografiTokenlari.micro,
    fontSize: 9,
    color: 'rgba(255,255,255,0.42)',
    textAlign: 'center',
    paddingHorizontal: 4,
    paddingBottom: 7,
    paddingTop: 1,
  },
});
