import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDil } from '../../i18n/DilSaglayici';
import { RenkTokenlariKoyu as C } from '../../tasarim-sistemi/tema/RenkPaletleri';
import { BlogHtmlGorunum } from './BlogHtmlGorunum';
import { blogHerkeseAcik, blogListeHerkese, blogOkunmaYazi, type BlogYazi } from './blogApi';
import { okumaDakika } from './blogSeo';

type Kart = {
  title: string;
  slug: string;
  excerpt?: string | null;
  published_at?: string | null;
  reading_minutes?: number;
  okunma_sayisi?: number;
  cover_image_url?: string | null;
  cover_image_alt?: string | null;
  language_code?: string;
};

type Props = {
  baslik: string;
  bosGizle?: boolean;
};

function dilKodu(dil: string) {
  return dil.toLowerCase().split('-')[0] || 'tr';
}

export function BlogBlokOkuyucu({ baslik, bosGizle = false }: Props) {
  const { dil } = useDil();
  const [kartlar, setKartlar] = useState<Kart[]>([]);
  const [secili, setSecili] = useState<string | null>(null);
  const [yazi, setYazi] = useState<BlogYazi | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    let iptal = false;
    const kod = dilKodu(dil);
    setYukleniyor(true);
    void blogListeHerkese(0, 24, kod).then(async (gelen) => {
      const liste = gelen.satirlar as Kart[];
      const sonuc = liste.length || kod === 'tr' ? liste : (await blogListeHerkese(0, 24, 'tr')).satirlar as Kart[];
      if (iptal) return;
      setKartlar(sonuc);
      setSecili(sonuc[0]?.slug ?? null);
      setYukleniyor(false);
    });
    return () => {
      iptal = true;
    };
  }, [dil]);

  useEffect(() => {
    if (!secili) {
      setYazi(null);
      return;
    }
    const kart = kartlar.find((k) => k.slug === secili);
    let iptal = false;
    void blogHerkeseAcik(secili, kart?.language_code || dilKodu(dil)).then((gelen) => {
      if (!iptal) setYazi(gelen);
    });
    return () => {
      iptal = true;
    };
  }, [secili, kartlar, dil]);

  if (!yukleniyor && !kartlar.length) {
    if (bosGizle) return null;
    return (
      <View style={styles.kutu}>
        <Text style={styles.baslik}>{baslik}</Text>
        <Text style={styles.bos}>Henüz yayınlanmış yazı yok.</Text>
      </View>
    );
  }

  return (
    <View style={styles.kutu}>
      <Text style={styles.ust}>TAMUSO</Text>
      <Text style={styles.baslik}>{baslik}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.serit}
      >
        {kartlar.map((kart) => {
          const aktif = kart.slug === secili;
          return (
            <Pressable
              key={kart.slug}
              onPress={() => setSecili(kart.slug)}
              style={[styles.blok, aktif && styles.blokAktif]}
              accessibilityRole="button"
              accessibilityState={{ selected: aktif }}
              accessibilityLabel={kart.title}
            >
              {kart.cover_image_url ? (
                <Image
                  source={{ uri: kart.cover_image_url }}
                  accessibilityLabel={kart.cover_image_alt || kart.title}
                  style={styles.kapak}
                />
              ) : (
                <View style={[styles.kapak, styles.kapakBos]} />
              )}
              <Text style={styles.blokBaslik} numberOfLines={3}>{kart.title}</Text>
              <Text style={styles.kucuk}>
                {[
                  kart.reading_minutes ? `${kart.reading_minutes} dk` : '',
                  blogOkunmaYazi(kart.okunma_sayisi),
                ].filter(Boolean).join(' · ')}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {yazi ? (
        <View style={styles.okuma}>
          <Text style={styles.yaziBaslik}>{yazi.title}</Text>
          {yazi.excerpt ? <Text style={styles.ozet}>{yazi.excerpt}</Text> : null}
          <Text style={styles.kucuk}>
            {`${yazi.reading_minutes || okumaDakika(yazi.content_html)} dk okuma`}
          </Text>
          {yazi.cover_image_url ? (
            <Image
              source={{ uri: yazi.cover_image_url }}
              accessibilityLabel={yazi.cover_image_alt || yazi.title}
              style={styles.buyukKapak}
            />
          ) : null}
          <BlogHtmlGorunum html={yazi.content_html} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kutu: { gap: 14, marginTop: 28 },
  ust: { color: C.primary, letterSpacing: 1.4, fontSize: 12, fontWeight: '700' },
  baslik: { color: C.text, fontSize: 28, lineHeight: 34, fontWeight: '700' },
  bos: { color: C.textMuted, fontSize: 16, lineHeight: 24 },
  serit: { gap: 12, paddingRight: 8 },
  blok: {
    width: 210,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 10,
    gap: 8,
    backgroundColor: C.bgCard,
  },
  blokAktif: { borderColor: C.primary },
  kapak: { width: '100%', aspectRatio: 16 / 10, borderRadius: 12 },
  kapakBos: { backgroundColor: C.surface },
  blokBaslik: { color: C.text, fontSize: 15, lineHeight: 20, fontWeight: '700', minHeight: 60 },
  kucuk: { color: C.textMuted, fontSize: 12, lineHeight: 18 },
  okuma: { gap: 12, paddingTop: 8 },
  yaziBaslik: { color: C.text, fontSize: 26, lineHeight: 32, fontWeight: '700' },
  ozet: { color: C.textMuted, fontSize: 16, lineHeight: 24 },
  buyukKapak: { width: '100%', aspectRatio: 16 / 9, borderRadius: 16 },
});
