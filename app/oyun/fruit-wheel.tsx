import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useCeviri } from '../../src/i18n/useCeviri';
import { FruitWheelEkrani } from '../../src/moduller/oyunlar/fruit-wheel/ekranlar/FruitWheelEkrani';
import { registerFruitWheel } from '../../src/moduller/oyunlar/fruit-wheel/FruitWheelKayit';
import { isGameVisible } from '../../src/moduller/oyunlar/ortak/servisler/OyunKontrolServisi';
import { koyuSahneKilidiCik, koyuSahneKilidiGir } from '../../src/tasarim-sistemi/tema/TemaDurumu';

export default function FruitWheelSayfa() {
  const { t } = useCeviri();
  const { user } = useAuth();
  const [kapali, setKapali] = useState(false);

  useEffect(() => {
    registerFruitWheel();
    koyuSahneKilidiGir();
    let alive = true;
    void isGameVisible('fruit_wheel').then((ok) => {
      if (alive && !ok) setKapali(true);
    });
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

  if (kapali) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{t('oyun.fwTitle')}</Text>
        <Text style={styles.body}>{t('oyun.fwClosed')}</Text>
        <Pressable onPress={kapat}><Text style={styles.link}>{t('ortak.geri')}</Text></Pressable>
      </View>
    );
  }

  return (
    <FruitWheelEkrani
      onClose={kapat}
      onHistory={() => router.push('/oyun/fruit-wheel-gecmis' as never)}
      onRules={() => router.push('/oyun/fruit-wheel-kurallar' as never)}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#07060F', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: '#F7F1E4', fontSize: 22, fontWeight: '800' },
  body: { color: '#E8DCC4', marginTop: 8, textAlign: 'center' },
  link: { color: '#E6CE92', marginTop: 16, fontWeight: '700' },
});
