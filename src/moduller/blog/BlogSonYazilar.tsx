import React, { useEffect, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { RenkTokenlariKoyu as C } from '../../tasarim-sistemi/tema/RenkPaletleri';
import { blogListeHerkese } from './blogApi';

type Kart = {
  title: string;
  slug: string;
  excerpt?: string | null;
  published_at?: string | null;
  reading_minutes?: number;
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
              <Text style={styles.kucuk}>{kat}{s.published_at ? ` · ${new Date(s.published_at).toLocaleDateString('tr-TR')}` : ''}{s.reading_minutes ? ` · ${s.reading_minutes} dk` : ''}</Text>
              <Text style={styles.h}>{s.title}</Text>
              <Text style={styles.p} numberOfLines={3}>{s.excerpt}</Text>
              <Text style={styles.link}>Devamını oku</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kutu: { gap: 12, marginTop: 28 },
  ust: { color: C.primary, letterSpacing: 1.4, fontSize: 12, fontWeight: '700' },
  baslik: { color: C.text, fontSize: 28, fontWeight: '700' },
  grid: { gap: 12 },
  kart: { borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14, gap: 6 },
  kapak: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12 },
  kucuk: { color: C.textMuted, fontSize: 12 },
  h: { color: C.text, fontSize: 18, fontWeight: '700' },
  p: { color: C.textMuted, lineHeight: 20 },
  link: { color: C.primary },
});
