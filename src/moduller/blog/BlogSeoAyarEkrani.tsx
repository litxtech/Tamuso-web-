import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { Screen } from '../../components/Screen';
import { EkranBasligi } from '../../components/EkranBasligi';
import { RenkTokenlari as R } from '../../tasarim-sistemi/RenkTokenlari';
import { BlogAltMenu } from './BlogAltMenu';
import { blogAyarGetir, blogAyarKaydet } from './blogApi';

export function BlogSeoAyarEkrani() {
  const [esik, setEsik] = useState('3');
  const [mesaj, setMesaj] = useState('');
  useEffect(() => { void blogAyarGetir().then((a) => setEsik(String(a.tag_index_min))); }, []);
  return (
    <Screen edges={['top']}>
      <EkranBasligi title="SEO ayarları" subtitle="Blog" />
      <ScrollView contentContainerStyle={styles.ic}>
        <BlogAltMenu />
        <Text style={styles.yazi}>Kanoni adres her zaman https://www.tamuso.com/blog/slug biçimindedir. Apex adres kullanılmaz.</Text>
        <Text style={styles.yazi}>Taslak, çöp, arşiv ve yayın tarihi gelmemiş yazılar herkese kapalıdır ve site haritasında yoktur.</Text>
        <Text style={styles.yazi}>Arama sayfası noindex. Etiket sayfası aşağıdaki sayıya gelmeden noindex.</Text>
        <Text style={styles.etiket}>Etiket dizine girme eşiği</Text>
        <TextInput value={esik} onChangeText={setEsik} keyboardType="number-pad" style={styles.girdi} />
        <Pressable onPress={async () => {
          const n = Math.min(20, Math.max(1, Number(esik) || 3));
          await blogAyarKaydet(n);
          setMesaj('Kaydedildi. Site haritası bu eşiği bir sonraki istekte okur.');
        }}><Text style={styles.link}>Kaydet</Text></Pressable>
        {mesaj ? <Text style={styles.yazi}>{mesaj}</Text> : null}
        <Text style={styles.kucuk}>Bu puan arama sırası değildir. Yazı ekranındaki kontrol yalnızca teknik eksikleri gösterir.</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  ic: { padding: 16, gap: 10 },
  yazi: { color: R.text, lineHeight: 22 },
  kucuk: { color: R.textMuted, fontSize: 12 },
  etiket: { color: R.text, fontWeight: '700' },
  girdi: { borderWidth: 1, borderColor: R.border, borderRadius: 10, color: R.text, padding: 10, maxWidth: 120 },
  link: { color: R.primarySoft },
});
