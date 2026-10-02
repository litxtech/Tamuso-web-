import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  ODA_DUZEN_KATEGORILERI,
  OdaDuzenleriniFiltrele,
  type OdaDuzenKategori,
  type OdaDuzenTanim,
  type OdaDuzenVaryant,
} from '../duzen/OdaDuzeniniCoz';
import { OdaDuzenOnizlemeMini } from './OdaDuzenOnizlemeMini';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { YaricapTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri, type CeviriAnahtari } from '../../../i18n/useCeviri';

type Props = {
  seciliKod?: string | null;
  onSec: (duzen: OdaDuzenTanim) => void;
};

const VARYANT_IKON: Record<OdaDuzenVaryant, keyof typeof Ionicons.glyphMap> = {
  grid: 'grid-outline',
  stage_spotlight: 'easel-outline',
  orbit: 'aperture-outline',
  lounge: 'wine-outline',
  diamond: 'diamond-outline',
  theater: 'film-outline',
  arena: 'trophy-outline',
  duo_focus: 'people-outline',
  cascade: 'git-branch-outline',
  vip_rail: 'ribbon-outline',
  hex: 'apps-outline',
  equal_grid: 'grid',
  club_stage: 'mic-outline',
  spaces_strip: 'radio-outline',
  party_wave: 'musical-notes-outline',
};

/**
 * Kategori filtreli modern / premium görünüm (düzen) seçici.
 * Kart önizlemesi gerçek koltuk yerleşimini gösterir.
 */
export function OdaDuzenSecimSeridi({ seciliKod, onSec }: Props) {
  const { t } = useCeviri();
  const [kategori, setKategori] = useState<OdaDuzenKategori | 'hepsi'>('hepsi');
  const duzenler = useMemo(() => OdaDuzenleriniFiltrele(kategori), [kategori]);

  return (
    <View style={styles.kok}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.kategoriSerit}
      >
        {ODA_DUZEN_KATEGORILERI.map((k) => {
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
        {t('odaDuzen.duzenSayisi', { n: duzenler.length })}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.serit}
      >
        {duzenler.map((duzen) => {
          const secili = seciliKod === duzen.kod;
          return (
            <Pressable
              key={duzen.kod}
              onPress={() => onSec(duzen)}
              accessibilityRole="button"
              accessibilityState={{ selected: secili }}
              accessibilityLabel={t('odaDuzen.a11y', { duzen: duzen.ad })}
              style={({ pressed }) => [
                styles.hit,
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.kart,
                  secili && { borderColor: duzen.vurgu },
                ]}
              >
                <LinearGradient
                  colors={[...duzen.onizleme]}
                  start={{ x: 0.1, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={styles.onizleme}
                >
                  <OdaDuzenOnizlemeMini duzen={duzen} />
                  <View style={styles.ikonRozet}>
                    <Ionicons
                      name={VARYANT_IKON[duzen.varyant] ?? 'grid-outline'}
                      size={11}
                      color="#fff"
                    />
                  </View>
                  {secili ? (
                    <View
                      style={[styles.onay, { backgroundColor: duzen.vurgu }]}
                    >
                      <Ionicons name="checkmark" size={11} color="#fff" />
                    </View>
                  ) : null}
                </LinearGradient>
                <Text
                  style={[styles.ad, secili && { color: '#fff' }]}
                  numberOfLines={1}
                >
                  {duzen.ad}
                </Text>
                <Text style={styles.alt} numberOfLines={1}>
                  {duzen.alt}
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
  kategoriYaziAktif: { color: '#fff' },
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
    width: 112,
    borderRadius: YaricapTokenlari.md,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  onizleme: {
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ikonRozet: {
    position: 'absolute',
    left: 5,
    top: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
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
