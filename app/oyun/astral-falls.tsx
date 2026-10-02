/**
 * Fair Spin rotası benzeri — Astral Falls.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useCeviri } from '../../src/i18n/useCeviri';
import { AstralFallsEkrani } from '../../src/moduller/oyunlar/astral-falls/ekranlar/AstralFallsEkrani';
import { registerAstralFalls } from '../../src/moduller/oyunlar/astral-falls/AstralFallsKayit';
import { isGameVisible } from '../../src/moduller/oyunlar/ortak/servisler/OyunKontrolServisi';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import {
  koyuSahneKilidiCik,
  koyuSahneKilidiGir,
} from '../../src/tasarim-sistemi/tema/TemaDurumu';

type Durum = 'yukleniyor' | 'acik' | 'kapali';

export default function AstralFallsOyunSayfasi() {
  const { t } = useCeviri();
  const { user } = useAuth();
  const [durum, setDurum] = useState<Durum>('yukleniyor');

  useEffect(() => {
    registerAstralFalls();
    koyuSahneKilidiGir();
    let alive = true;
    void (async () => {
      const acik = await isGameVisible('astral_falls');
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
        <Text style={styles.baslik}>Astral Falls</Text>
        <Text style={styles.mesaj}>{t('oyun.acikOyunYokBody')}</Text>
        <Pressable style={styles.btn} onPress={kapat}>
          <Text style={styles.btnText}>{t('ortak.geriDon')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AstralFallsEkrani roomId={null} onClose={kapat} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111a2b' },
  merkez: {
    flex: 1,
    backgroundColor: '#111a2b',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  baslik: { color: '#fff', fontSize: 20, fontWeight: '700' },
  mesaj: { color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  btn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: RenkTokenlari.accent,
  },
  btnText: { color: '#111', fontWeight: '700' },
});
