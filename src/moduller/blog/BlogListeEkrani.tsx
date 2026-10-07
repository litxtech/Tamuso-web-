import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../components/Screen';
import { EkranBasligi } from '../../components/EkranBasligi';
import { RenkTokenlari as R } from '../../tasarim-sistemi/RenkTokenlari';
import { blogYazilari, type BlogDurum } from './blogApi';
import { BlogAltMenu } from './BlogAltMenu';

const ETIKET: Record<string, string> = {
  taslak: 'Taslak',
  inceleme: 'İnceleme',
  planlandi: 'Planlandı',
  yayinda: 'Yayında',
  arsiv: 'Arşiv',
  cop: 'Çöp',
};

export function BlogListeEkrani({ durum = 'hepsi' }: { durum?: BlogDurum | 'hepsi' }) {
  const [satirlar, setSatirlar] = useState<any[]>([]);
  const [hata, setHata] = useState('');
  const [sayfa, setSayfa] = useState(0);
  const [toplam, setToplam] = useState(0);

  const yukle = useCallback(async () => {
    try {
      const gelen = await blogYazilari(durum, sayfa);
      setSatirlar(gelen.satirlar);
      setToplam(gelen.toplam);
      setHata('');
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Liste alınamadı');
    }
  }, [durum, sayfa]);

  useFocusEffect(useCallback(() => {
    void yukle();
  }, [yukle]));

  return (
    <Screen edges={['top']}>
      <EkranBasligi title="Blog" subtitle="Yazılar" />
      <ScrollView contentContainerStyle={styles.ic}>
        <BlogAltMenu />
        {hata ? <Text style={styles.hata}>{hata}</Text> : null}
        <Text style={styles.meta}>{toplam} kayıt</Text>
        {satirlar.map((s) => (
          <Pressable key={s.id} style={styles.kart} onPress={() => router.push(`/admin/blog/${s.id}` as never)}>
            <Text style={styles.baslik}>{s.title}</Text>
            <Text style={styles.alt}>{s.language_code || 'tr'} · {s.translation_status || ''} · {ETIKET[s.status] ?? s.status} · {s.slug}</Text>
          </Pressable>
        ))}
        <View style={styles.sayfa}>
          <Pressable disabled={sayfa === 0} onPress={() => setSayfa((n) => Math.max(0, n - 1))}>
            <Text style={styles.link}>Önceki</Text>
          </Pressable>
          <Pressable disabled={(sayfa + 1) * 20 >= toplam} onPress={() => setSayfa((n) => n + 1)}>
            <Text style={styles.link}>Sonraki</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  ic: { padding: 16, gap: 10, paddingBottom: 48 },
  hata: { color: R.danger },
  meta: { color: R.textMuted },
  kart: { borderWidth: 1, borderColor: R.border, borderRadius: 12, padding: 12, gap: 4 },
  baslik: { color: R.text, fontSize: 16, fontWeight: '700' },
  alt: { color: R.textMuted, fontSize: 13 },
  sayfa: { flexDirection: 'row', gap: 16 },
  link: { color: R.primarySoft },
});
