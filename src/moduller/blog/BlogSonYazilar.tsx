import React, { useEffect, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { RenkTokenlariKoyu as C } from '../../tasarim-sistemi/tema/RenkPaletleri';
import { blogListeHerkese, blogOkunmaYazi } from './blogApi';

type Kart = {
  title: string;
  slug: string;
  excerpt?: string | null;
  published_at?: string | null;
  reading_minutes?: number;
  okunma_sayisi?: number;
  cover_image_url?: string | null;
  cover_image_alt?: string | null;
  blog_categories?: { name?: string } | { name?: string }[] | null;
};

function ac(yol: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.assign(yol);
    return;
  }
  router.push(yol as never);
}

export function BlogSonYazilar() {
  const [satirlar, setSatirlar] = useState<Kart[]>([]);
  useEffect(() => {
    void blogListeHerkese(0, 6).then((g) => setSatirlar((g.satirlar as Kart[]).slice(0, 6)));
  }, []);
  if (!satirlar.length) return null;
  return (
    <View style={styles.kutu}>
      <Text style={styles.ust}>TAMUSO’DAN</Text>
      <Text style={styles.baslik}>Son yazılar</Text>
      <View style={styles.grid}>
        {satirlar.map((s) => {
          const kat = Array.isArray(s.blog_categories) ? s.blog_categories[0]?.name : s.blog_categories?.name;
          return (
            <Pressable key={s.slug} style={styles.kart} onPress={() => ac(`/blog/${s.slug}`)} accessibilityRole="link">
              {s.cover_image_url ? <Image source={{ uri: s.cover_image_url }} accessibilityLabel={s.cover_image_alt || s.title} style={styles.kapak} /> : null}
              <Text style={styles.kucuk}>{[kat, s.published_at ? new Date(s.published_at).toLocaleDateString('tr-TR') : '', s.reading_minutes ? `${s.reading_minutes} dk` : '', blogOkunmaYazi(s.okunma_sayisi)].filter(Boolean).join(' · ')}</Text>
              <Text style={styles.h}>{s.title}</Text>
              <Text style={styles.p} numberOfLines={3}>{s.excerpt}</Text>
              <View style={styles.oku}>
                <Text style={styles.okuYazi}>Yazıyı oku</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kutu: { gap: 16, marginTop: 48, paddingHorizontal: 22 },
  ust: { color: C.primary, letterSpacing: 1.4, fontSize: 12, fontWeight: '700' },
  baslik: { color: C.text, fontSize: 32, lineHeight: 40, fontWeight: '700' },
  grid: { gap: 14 },
  kart: { borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 18, gap: 8, backgroundColor: C.bgCard },
  kapak: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12 },
  kucuk: { color: C.textMuted, fontSize: 13, lineHeight: 20 },
  h: { color: C.text, fontSize: 20, lineHeight: 28, fontWeight: '700' },
  p: { color: C.textMuted, fontSize: 16, lineHeight: 24 },
  oku: {
    alignSelf: 'flex-start',
    marginTop: 4,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  okuYazi: { color: C.text, fontWeight: '700', fontSize: 14 },
});
