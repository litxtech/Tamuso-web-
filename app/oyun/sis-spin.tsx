/**
 * SİS Spin — uygulama içi çark. Özellik bayrağı beklemez.
 */

import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { SisSpinEkrani } from '../../src/moduller/oyunlar/sis-spin/SisSpinEkrani';
import {
  koyuSahneKilidiCik,
  koyuSahneKilidiGir,
} from '../../src/tasarim-sistemi/tema/TemaDurumu';

export default function SisSpinSayfasi() {
  const { user, loading } = useAuth();

  useEffect(() => {
    koyuSahneKilidiGir();
    return () => koyuSahneKilidiCik();
  }, []);

  const kapat = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, []);

  if (loading) return <View style={styles.kok} />;

  if (!user) {
    router.replace('/(auth)' as never);
    return null;
  }

  return (
    <View style={styles.kok}>
      <SisSpinEkrani onClose={kapat} />
    </View>
  );
}

const styles = StyleSheet.create({
  kok: { flex: 1, backgroundColor: '#1a0033' },
});
