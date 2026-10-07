import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { EkranBasligi } from '../../components/EkranBasligi';
import { RenkTokenlari as R } from '../../tasarim-sistemi/RenkTokenlari';
import { BlogAltMenu } from './BlogAltMenu';
import { blogKategoriKaydet, blogKategoriSil, blogKategoriler, type BlogKategori } from './blogApi';

export function BlogKategoriEkrani() {
  const [liste, setListe] = useState<BlogKategori[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hata, setHata] = useState('');

  async function yenile() {
    setListe(await blogKategoriler());
  }
  useEffect(() => { void yenile().catch((e) => setHata(e.message)); }, []);

  return (
    <Screen edges={['top']}>
      <EkranBasligi title="Kategoriler" subtitle="Blog" />
      <ScrollView contentContainerStyle={styles.ic}>
        <BlogAltMenu />
        {hata ? <Text style={styles.hata}>{hata}</Text> : null}
        <TextInput value={name} onChangeText={setName} placeholder="Kategori adı" placeholderTextColor={R.textMuted} style={styles.girdi} />
        <TextInput value={description} onChangeText={setDescription} placeholder="Kısa açıklama" placeholderTextColor={R.textMuted} style={styles.girdi} />
        <Pressable onPress={async () => {
          try {
            await blogKategoriKaydet({ name, description });
            setName('');
            setDescription('');
            await yenile();
          } catch (e) {
            setHata(e instanceof Error ? e.message : 'Kaydedilemedi');
          }
        }}><Text style={styles.link}>Ekle</Text></Pressable>
        {liste.map((k) => (
          <View key={k.id} style={styles.satir}>
            <Text style={styles.ad}>{k.name}</Text>
            <Text style={styles.kucuk}>/blog/kategori/{k.slug}</Text>
            <Pressable onPress={async () => { await blogKategoriSil(k.id); await yenile(); }}><Text style={styles.hata}>Sil</Text></Pressable>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  ic: { padding: 16, gap: 10, paddingBottom: 48 },
  girdi: { borderWidth: 1, borderColor: R.border, borderRadius: 10, color: R.text, padding: 10 },
  link: { color: R.primarySoft },
  hata: { color: R.danger },
  ad: { color: R.text, fontWeight: '700' },
  kucuk: { color: R.textMuted, fontSize: 12 },
  satir: { gap: 2, paddingVertical: 8 },
});
