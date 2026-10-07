import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { EkranBasligi } from '../../components/EkranBasligi';
import { RenkTokenlari as R } from '../../tasarim-sistemi/RenkTokenlari';
import { BlogAltMenu } from './BlogAltMenu';
import { blogAyarGetir, blogEtiketSil, blogEtiketler, type BlogEtiket } from './blogApi';

export function BlogEtiketEkrani() {
  const [liste, setListe] = useState<BlogEtiket[]>([]);
  const [esik, setEsik] = useState(3);
  useEffect(() => {
    void blogEtiketler().then(setListe);
    void blogAyarGetir().then((a) => setEsik(a.tag_index_min));
  }, []);
  return (
    <Screen edges={['top']}>
      <EkranBasligi title="Etiketler" subtitle="Blog" />
      <ScrollView contentContainerStyle={styles.ic}>
        <BlogAltMenu />
        <Text style={styles.kucuk}>
          Bir etiket {esik} yayındaki yazıya ulaşmadan noindex kalır ve site haritasına girmez.
        </Text>
        {liste.map((e) => (
          <View key={e.id} style={styles.satir}>
            <Text style={styles.ad}>{e.name}</Text>
            <Text style={styles.kucuk}>/blog/etiket/{e.slug}</Text>
            <Pressable onPress={async () => { await blogEtiketSil(e.id); setListe(await blogEtiketler()); }}>
              <Text style={styles.hata}>Sil</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  ic: { padding: 16, gap: 10 },
  ad: { color: R.text, fontWeight: '700' },
  kucuk: { color: R.textMuted, fontSize: 12 },
  hata: { color: R.danger },
  satir: { gap: 2, paddingVertical: 6 },
});
