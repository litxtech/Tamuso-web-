/**
 * ZEUS — bağımsız oyun ekranı (oda dışı).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useCeviri } from '../../src/i18n/useCeviri';
import { ZeusEkrani } from '../../src/moduller/oyunlar/zeus/ekranlar/ZeusEkrani';
import { registerZeus } from '../../src/moduller/oyunlar/zeus/ZeusKayit';
import { warmZeusAssetsEarly } from '../../src/moduller/oyunlar/zeus/assets/preloadZeusAssets';
import { isGameVisible } from '../../src/moduller/oyunlar/ortak/servisler/OyunKontrolServisi';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import {
  koyuSahneKilidiCik,
  koyuSahneKilidiGir,
} from '../../src/tasarim-sistemi/tema/TemaDurumu';

type Durum = 'yukleniyor' | 'acik' | 'kapali';

export default function ZeusOyunSayfasi() {
  const { t } = useCeviri();
  const { user } = useAuth();
  const [durum, setDurum] = useState<Durum>('yukleniyor');

  useEffect(() => {
    registerZeus();
    warmZeusAssetsEarly();
    koyuSahneKilidiGir();
    let alive = true;
    void (async () => {
      const acik = await isGameVisible('zeus');
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
        <Text style={styles.baslik}>{t('oyun.zeus')}</Text>
        <Text style={styles.mesaj}>{t('oyun.acikOyunYokBody')}</Text>
        <Pressable style={styles.btn} onPress={kapat}>
          <Text style={styles.btnText}>{t('ortak.geriDon')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ZeusEkrani roomId={null} voiceActive={false} onClose={kapat} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070B18' },
  merkez: {
    flex: 1,
    backgroundColor: '#070B18',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  baslik: {
    color: '#E8C547',
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
