/**
 * Realm of Storms — bağımsız oyun ekranı (oda dışı, solo).
 * Görünürlük admin kontrolüne bağlı: kapalı/bakımdaysa oynanamaz.
 * Oda içinden açılan sürüm OyunOdaKatmani üzerinden çalışmaya devam eder.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useCeviri } from '../../src/i18n/useCeviri';
import { KozmikKaskadEkrani } from '../../src/moduller/oyunlar/kaskad/ekranlar/KozmikKaskadEkrani';
import { registerKozmikKaskad } from '../../src/moduller/oyunlar/kaskad/KaskadKayit';
import { isGameVisible } from '../../src/moduller/oyunlar/ortak/servisler/OyunKontrolServisi';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import {
  koyuSahneKilidiCik,
  koyuSahneKilidiGir,
} from '../../src/tasarim-sistemi/tema/TemaDurumu';

type Durum = 'yukleniyor' | 'acik' | 'kapali';

export default function KaskadOyunSayfasi() {
  const { t } = useCeviri();
  const { user } = useAuth();
  const [durum, setDurum] = useState<Durum>('yukleniyor');

  useEffect(() => {
    registerKozmikKaskad();
    koyuSahneKilidiGir();
    let alive = true;
    void (async () => {
      const acik = await isGameVisible('kozmik_kaskad');
      if (alive) setDurum(acik ? 'acik' : 'kapali');
    })();
    return () => {
      alive = false;
      koyuSahneKilidiCik();
    };
  }, []);

  const kapat = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, []);

  if (!user) {
    router.replace('/(auth)' as never);
    return null;
  }

  if (durum === 'yukleniyor') {
    return (
      <View style={styles.merkez}>
        <ActivityIndicator color={RenkTokenlari.accent} size="large" />
      </View>
    );
  }

  if (durum === 'kapali') {
    return (
      <View style={styles.merkez}>
        <Text style={styles.baslik}>{t('oyun.kaskad')}</Text>
        <Text style={styles.mesaj}>{t('oyun.acikOyunYokBody')}</Text>
        <Pressable style={styles.btn} onPress={kapat}>
          <Text style={styles.btnText}>{t('ortak.geriDon')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <KozmikKaskadEkrani roomId={null} voiceActive={false} onClose={kapat} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: RenkTokenlari.bg },
  merkez: {
    flex: 1,
    backgroundColor: RenkTokenlari.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  baslik: {
    color: '#8FD0FF',
    fontWeight: '900',
    fontSize: 20,
    letterSpacing: 2,
  },
  mesaj: {
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
    fontSize: 14,
  },
  btn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: RenkTokenlari.primary,
  },
  btnText: { color: RenkTokenlari.text, fontWeight: '700' },
});
