import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../../../lib/supabase';
import { useCeviri } from '../../../../i18n/useCeviri';
import { DIL_LOCALE_MAP } from '../../../../i18n/diller';
import { fruitWheelOlay } from '../analitik/FruitWheelAnalitik';
import { FRUIT_IMAGES } from '../sabitler/FruitWheelSabitleri';
import type { FruitId } from '../tipler/FruitWheelTipleri';

type Olasilik = {
  id: string;
  multiplier: number;
  probability: number;
  return_to_player: number;
};

export function FruitWheelKurallar() {
  const { t, dil } = useCeviri();
  const locale = DIL_LOCALE_MAP[dil];
  const [liste, setListe] = useState<Olasilik[] | null>(null);
  const [hata, setHata] = useState(false);

  useEffect(() => {
    fruitWheelOlay('rules_open');
    let iptal = false;
    void supabase.rpc('fruit_wheel_olasiliklar').then(({ data, error }) => {
      if (iptal) return;
      if (error || !data) {
        setHata(true);
        return;
      }
      const fruits = ((data as { fruits?: Olasilik[] }).fruits ?? []).map((f) => ({
        id: String(f.id),
        multiplier: Number(f.multiplier),
        probability: Number(f.probability),
        return_to_player: Number(f.return_to_player),
      }));
      setListe(fruits);
    });
    return () => {
      iptal = true;
    };
  }, []);

  const yuzde = (n: number) =>
    (n * 100).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 2 });

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.body}>
      <Text style={styles.title}>{t('oyun.fwRules')}</Text>
      <Text style={styles.text}>{t('oyun.fwRulesBody')}</Text>

      <Text style={styles.altBaslik}>{t('oyunY.olasilikBaslik')}</Text>
      <Text style={styles.not}>{t('oyunY.olasilikAciklama')}</Text>
      {hata ? (
        <Text style={styles.not}>{t('oyunY.olasilikYuklenemedi')}</Text>
      ) : !liste ? (
        <ActivityIndicator color="#E6CE92" style={{ marginVertical: 16 }} />
      ) : (
        <View style={styles.tablo}>
          <View style={[styles.satir, styles.baslikSatir]}>
            <Text style={[styles.hucre, styles.hucreBaslik, { flex: 1.4 }]}>{t('oyunY.meyve')}</Text>
            <Text style={[styles.hucre, styles.hucreBaslik]}>{t('oyunY.carpan')}</Text>
            <Text style={[styles.hucre, styles.hucreBaslik]}>{t('oyunY.olasilik')}</Text>
            <Text style={[styles.hucre, styles.hucreBaslik]}>{t('oyunY.beklenenIade')}</Text>
          </View>
          {liste.map((f) => (
            <View key={f.id} style={styles.satir}>
              <View style={[styles.meyve, { flex: 1.4 }]}>
                {FRUIT_IMAGES[f.id as FruitId] ? (
                  <Image
                    source={FRUIT_IMAGES[f.id as FruitId]}
                    style={styles.gorsel}
                    accessibilityLabel={f.id}
                  />
                ) : (
                  <Text style={styles.hucre}>{f.id}</Text>
                )}
              </View>
              <Text style={styles.hucre}>×{f.multiplier.toLocaleString(locale)}</Text>
              <Text style={styles.hucre}>%{yuzde(f.probability)}</Text>
              <Text style={styles.hucre}>%{yuzde(f.return_to_player)}</Text>
            </View>
          ))}
        </View>
      )}
      <Text style={styles.not}>{t('oyunY.bagimsizTur')}</Text>
      <Text style={styles.not}>{t('oyunY.oyunCoinUyari')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07060F' },
  body: { padding: 20, gap: 10, paddingBottom: 48 },
  title: { color: '#F7F1E4', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  text: { color: '#E8DCC4', fontSize: 16, lineHeight: 24 },
  altBaslik: { color: '#F7F1E4', fontSize: 17, fontWeight: '800', marginTop: 12 },
  not: { color: 'rgba(232,220,196,0.75)', fontSize: 13, lineHeight: 19 },
  tablo: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(230,206,146,0.35)',
    overflow: 'hidden',
  },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(230,206,146,0.15)',
  },
  baslikSatir: { backgroundColor: 'rgba(230,206,146,0.08)', borderTopWidth: 0 },
  hucre: { flex: 1, color: '#E8DCC4', fontSize: 13, fontVariant: ['tabular-nums'] },
  hucreBaslik: { color: '#E6CE92', fontWeight: '700', fontSize: 12 },
  meyve: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gorsel: { width: 22, height: 22, borderRadius: 4 },
});
