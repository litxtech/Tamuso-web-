import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { RenkTokenlari as R } from '../../tasarim-sistemi/RenkTokenlari';
import { blogIstatistik } from './blogApi';

export function BlogIstatistik() {
  const [s, setS] = useState<{ toplam: number; yayinda: number; taslak: number; son7: number; son30: number } | null>(null);
  useEffect(() => { void blogIstatistik().then(setS).catch(() => setS(null)); }, []);
  if (!s) return null;
  const hucre = [
    ['Toplam', s.toplam],
    ['Yayında', s.yayinda],
    ['Taslak', s.taslak],
    ['Son 7 gün', s.son7],
    ['Son 30 gün', s.son30],
  ] as const;
  return (
    <Pressable onPress={() => router.push('/admin/blog' as never)} style={styles.kutu}>
      <Text style={styles.baslik}>Blog</Text>
      <View style={styles.satir}>
        {hucre.map(([ad, n]) => (
          <View key={ad}>
            <Text style={styles.sayi}>{n}</Text>
            <Text style={styles.ad}>{ad}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kutu: { borderWidth: 1, borderColor: R.border, borderRadius: 16, padding: 14, gap: 8 },
  baslik: { color: R.text, fontWeight: '700' },
  satir: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  sayi: { color: R.primarySoft, fontSize: 20, fontWeight: '700' },
  ad: { color: R.textMuted, fontSize: 12 },
});
