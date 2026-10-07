import React, { useEffect, useState } from 'react';
import {
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Screen } from '../../components/Screen';
import { RenkTokenlariKoyu as C } from '../../tasarim-sistemi/tema/RenkPaletleri';
import { BlogHtmlGorunum } from './BlogHtmlGorunum';
import { okumaDakika } from './blogSeo';
import {
  blogHerkeseAcik,
  blogKardesler,
  blogListeHerkese,
  type BlogYazi,
} from './blogApi';

type Kart = {
  title: string;
  slug: string;
  excerpt?: string | null;
  cover_image_url?: string | null;
  published_at?: string | null;
  blog_categories?: { name?: string; slug?: string } | { name?: string; slug?: string }[] | null;
};

function katAd(kart: Kart) {
  const k = kart.blog_categories;
  if (!k) return '';
  return Array.isArray(k) ? k[0]?.name ?? '' : k.name ?? '';
}

function ac(yol: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.assign(yol);
    return;
  }
  router.push(yol as never);
}

function tarih(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function BlogListeGorunum({ baslik = 'Blog', giris = 'Karadeniz’den sosyal yaşama, şehir rehberlerinden Tamuso dünyasına kadar güncel içerikler.' }: { baslik?: string; giris?: string }) {
  const [satirlar, setSatirlar] = useState<Kart[]>([]);
  const [arama, setArama] = useState('');
  useEffect(() => {
    void blogListeHerkese(0, 24).then((g) => setSatirlar(g.satirlar as Kart[]));
  }, []);
  const goster = arama.trim()
    ? satirlar.filter((s) => `${s.title} ${s.excerpt ?? ''}`.toLocaleLowerCase('tr').includes(arama.trim().toLocaleLowerCase('tr')))
    : satirlar;
  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={styles.sayfa}>
        <Text style={styles.ust}>BLOG</Text>
        <Text style={styles.h1}>{baslik}</Text>
        <Text style={styles.giris}>{giris}</Text>
        <TextInput
          value={arama}
          onChangeText={setArama}
          placeholder="Yazılarda ara"
          placeholderTextColor={C.textMuted}
          style={styles.arama}
          accessibilityLabel="Blog araması"
        />
        {arama ? <Text style={styles.kucuk}>Arama sonuçları dizine eklenmez.</Text> : null}
        <View style={styles.grid}>
          {goster.map((s) => (
            <Pressable key={s.slug} style={styles.kart} onPress={() => ac(`/blog/${s.slug}`)}>
              {s.cover_image_url ? (
                <Image source={{ uri: s.cover_image_url }} accessibilityLabel={s.title} style={styles.kartKapak} />
              ) : null}
              <Text style={styles.kucuk}>{katAd(s)} · {tarih(s.published_at)}</Text>
              <Text style={styles.h2}>{s.title}</Text>
              <Text style={styles.govde}>{s.excerpt}</Text>
              <Text style={styles.link}>Devamını oku</Text>
            </Pressable>
          ))}
        </View>
        {goster.length === 0 ? <Text style={styles.govde}>Henüz yayınlanmış yazı yok.</Text> : null}
      </ScrollView>
    </Screen>
  );
}

export function BlogYaziGorunum({ yazi, taslak = false }: { yazi: BlogYazi; taslak?: boolean }) {
  const dil = yazi.language_code || 'tr';
  const yol = dil === 'tr' ? `/blog/${yazi.slug}` : `/${dil}/blog/${yazi.slug}`;
  const url = `https://www.tamuso.com${yol}`;
  const kat = yazi.blog_categories;
  const kategori = Array.isArray(kat) ? kat[0] : kat;
  const faqs = [...(yazi.blog_faqs ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const [acik, setAcik] = useState<number | null>(0);
  const [kardes, setKardes] = useState<{ language_code: string; slug: string; status: string }[]>([]);
  const [ilgili, setIlgili] = useState<Kart[]>([]);
  useEffect(() => {
    if (yazi.content_group_id) {
      void blogKardesler(yazi.content_group_id).then((liste) => setKardes(liste as { language_code: string; slug: string; status: string }[]));
    }
    void blogListeHerkese(0, 6, dil).then((g) => setIlgili((g.satirlar as Kart[]).filter((s) => s.slug !== yazi.slug).slice(0, 4)));
  }, [yazi.content_group_id, yazi.slug, dil]);
  const adlar: Record<string, string> = { tr: 'Türkçe', en: 'English', de: 'Deutsch', es: 'Español', ar: 'العربية', ru: 'Русский' };
  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={styles.sayfa}>
        {taslak ? <Text style={styles.uyari}>Önizleme. Bu adres dizine eklenmez.</Text> : null}
        <Text style={styles.kucuk}>
          <Text onPress={() => ac('/')}>Ana Sayfa</Text>
          {' / '}
          <Text onPress={() => ac(dil === 'tr' ? '/blog' : `/${dil}/blog`)}>Blog</Text>
          {kategori ? ` / ${kategori.name}` : ''}
          {` / ${yazi.title}`}
        </Text>
        <View style={styles.satir}>
          {kardes.filter((k) => k.status === 'yayinda').map((k) => (
            <Pressable key={k.language_code} onPress={() => ac(k.language_code === 'tr' ? `/blog/${k.slug}` : `/${k.language_code}/blog/${k.slug}`)}>
              <Text style={styles.link}>{adlar[k.language_code] || k.language_code}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.h1}>{yazi.title}</Text>
        {yazi.excerpt ? <Text style={styles.giris}>{yazi.excerpt}</Text> : null}
        <Text style={styles.kucuk}>
          {kategori?.name ? `${kategori.name} · ` : ''}
          {tarih(yazi.published_at)}
          {yazi.updated_at ? ` · Güncelleme ${tarih(yazi.updated_at)}` : ''}
          {` · ${yazi.author_name || 'Tamuso Yayın Ekibi'} · ${yazi.reading_minutes || okumaDakika(yazi.content_html)} dk`}
        </Text>
        {yazi.cover_image_url ? (
          <Image
            source={{ uri: yazi.cover_image_url }}
            accessibilityLabel={yazi.cover_image_alt || yazi.title}
            style={styles.kapak}
          />
        ) : null}
        <BlogHtmlGorunum html={yazi.content_html} />
        {(yazi.blog_post_cities ?? []).map((s) => (
          <Pressable key={s.city_id} onPress={() => ac(`/sehir/${s.city_id}`)}>
            <Text style={styles.link}>{s.city_name}</Text>
          </Pressable>
        ))}
        {faqs.map((f, i) => (
          <Pressable key={f.question} onPress={() => setAcik(acik === i ? null : i)} style={styles.kart}>
            <Text style={styles.h2}>{f.question}</Text>
            {acik === i ? <Text style={styles.govde}>{f.answer}</Text> : null}
          </Pressable>
        ))}
        {ilgili.length ? <Text style={styles.h2}>İlgili yazılar</Text> : null}
        {ilgili.map((s) => (
          <Pressable key={s.slug} onPress={() => ac(dil === 'tr' ? `/blog/${s.slug}` : `/${dil}/blog/${s.slug}`)}>
            <Text style={styles.link}>{s.title}</Text>
          </Pressable>
        ))}
        <View style={styles.satir}>
          <Pressable onPress={() => void Linking.openURL(`https://wa.me/?text=${encodeURIComponent(`${yazi.title} ${url}`)}`)}><Text style={styles.link}>WhatsApp</Text></Pressable>
          <Pressable onPress={() => void Linking.openURL(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`)}><Text style={styles.link}>X</Text></Pressable>
          <Pressable onPress={() => void Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)}><Text style={styles.link}>Facebook</Text></Pressable>
          <Pressable onPress={() => void Linking.openURL(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`)}><Text style={styles.link}>LinkedIn</Text></Pressable>
          <Pressable onPress={() => void Clipboard.setStringAsync(url)}><Text style={styles.link}>Linki kopyala</Text></Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

export function BlogYol({ parca }: { parca: string[] }) {
  const [yazi, setYazi] = useState<BlogYazi | null>(null);
  const [yok, setYok] = useState(false);
  useEffect(() => {
    if (parca.length !== 1 || ['kategori', 'etiket', 'ara', 'sayfa'].includes(parca[0])) {
      setYok(parca[0] !== 'kategori' && parca[0] !== 'etiket' && parca[0] !== 'sayfa' && parca[0] !== 'ara');
      return;
    }
    void blogHerkeseAcik(parca[0]).then((gelen) => {
      setYazi(gelen);
      setYok(!gelen);
    });
  }, [parca]);
  if (parca[0] === 'kategori' || parca[0] === 'etiket' || parca[0] === 'sayfa' || parca[0] === 'ara' || parca.length === 0) {
    return <BlogListeGorunum baslik={parca[1] || 'Blog'} />;
  }
  if (yok) {
    return (
      <Screen edges={['top']}>
        <View style={styles.sayfa}>
          <Text style={styles.h1}>Sayfa bulunamadı</Text>
          <Pressable onPress={() => ac('/blog')}><Text style={styles.link}>Bloga dön</Text></Pressable>
        </View>
      </Screen>
    );
  }
  if (!yazi) return <Screen edges={['top']}><Text style={styles.kucuk}> </Text></Screen>;
  return <BlogYaziGorunum yazi={yazi} />;
}

export function BlogOnizlemeEkrani({ id }: { id: string }) {
  const [yazi, setYazi] = useState<BlogYazi | null>(null);
  useEffect(() => {
    void import('./blogApi').then((m) => m.blogYaziGetir(id).then(setYazi));
  }, [id]);
  if (!yazi) return <Screen edges={['top']}><Text style={styles.kucuk}> </Text></Screen>;
  return <BlogYaziGorunum yazi={yazi} taslak />;
}

const styles = StyleSheet.create({
  sayfa: { padding: 20, gap: 12, paddingBottom: 64, maxWidth: 760, alignSelf: 'center', width: '100%' },
  ust: { color: C.primary, letterSpacing: 2, fontSize: 12, fontWeight: '700' },
  h1: { color: C.text, fontSize: 32, lineHeight: 38, fontWeight: '700' },
  h2: { color: C.text, fontSize: 18, fontWeight: '700' },
  giris: { color: C.textMuted, fontSize: 16, lineHeight: 24 },
  govde: { color: C.text, fontSize: 16, lineHeight: 26 },
  kucuk: { color: C.textMuted, fontSize: 13 },
  link: { color: C.primary, paddingVertical: 4 },
  kart: { borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14, gap: 6, overflow: 'hidden' },
  kartKapak: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12 },
  grid: { gap: 12 },
  arama: { borderWidth: 1, borderColor: C.border, borderRadius: 12, color: C.text, padding: 10 },
  satir: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  uyari: { color: C.warning },
  kapak: { width: '100%', aspectRatio: 16 / 9, borderRadius: 16 },
});
