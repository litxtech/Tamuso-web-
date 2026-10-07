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
  blogOkumaKaydet,
  blogOkunmaYazi,
  type BlogYazi,
} from './blogApi';

type Kart = {
  title: string;
  slug: string;
  excerpt?: string | null;
  cover_image_url?: string | null;
  published_at?: string | null;
  reading_minutes?: number;
  okunma_sayisi?: number;
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

function siraNo(n: number) {
  return String(n).padStart(2, '0');
}

function Buton({
  yazi,
  onPress,
  ana = false,
}: {
  yazi: string;
  onPress: () => void;
  ana?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.btn, ana && styles.btnAna]}
    >
      <Text style={[styles.btnYazi, ana && styles.btnAnaYazi]}>{yazi}</Text>
    </Pressable>
  );
}

export function BlogListeGorunum({ baslik = 'Blog', giris = 'Yazılar tarih sırasıyla. Birini aç, bitince listeye dönüp diğerine geç.' }: { baslik?: string; giris?: string }) {
  const [satirlar, setSatirlar] = useState<Kart[]>([]);
  const [arama, setArama] = useState('');
  const [sayfa, setSayfa] = useState(0);
  const [toplam, setToplam] = useState(0);
  const boyut = 24;
  useEffect(() => {
    void blogListeHerkese(sayfa, boyut).then((g) => {
      setSatirlar(g.satirlar as Kart[]);
      setToplam(g.toplam);
    });
  }, [sayfa]);
  const goster = arama.trim()
    ? satirlar.filter((s) => `${s.title} ${s.excerpt ?? ''}`.toLocaleLowerCase('tr').includes(arama.trim().toLocaleLowerCase('tr')))
    : satirlar;
  const bas = sayfa * boyut;
  return (
    <View style={styles.sayfa}>
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
      <View style={styles.liste}>
        {goster.map((s, i) => (
          <Pressable key={s.slug} style={styles.kart} onPress={() => ac(`/blog/${s.slug}`)}>
            <Text style={styles.sira}>{siraNo(bas + i + 1)}</Text>
            {s.cover_image_url ? (
              <Image source={{ uri: s.cover_image_url }} accessibilityLabel={s.title} style={styles.kartKapak} />
            ) : null}
            <View style={styles.kartMetin}>
              <Text style={styles.kucuk}>{[katAd(s), tarih(s.published_at), blogOkunmaYazi(s.okunma_sayisi)].filter(Boolean).join(' · ')}</Text>
              <Text style={styles.h2}>{s.title}</Text>
              {s.excerpt ? <Text style={styles.govde}>{s.excerpt}</Text> : null}
              <Text style={styles.oku}>Yazıyı oku</Text>
            </View>
          </Pressable>
        ))}
      </View>
      {goster.length === 0 ? <Text style={styles.govde}>Henüz yayınlanmış yazı yok.</Text> : null}
      {toplam > boyut && !arama ? (
        <View style={styles.satir}>
          {sayfa > 0 ? <Buton yazi="Önceki" onPress={() => setSayfa((n) => Math.max(0, n - 1))} /> : null}
          {(sayfa + 1) * boyut < toplam ? <Buton yazi="Sonraki" onPress={() => setSayfa((n) => n + 1)} /> : null}
        </View>
      ) : null}
    </View>
  );
}

export function BlogYaziGorunum({ yazi, taslak = false }: { yazi: BlogYazi; taslak?: boolean }) {
  const dil = yazi.language_code || 'tr';
  const listeYol = dil === 'tr' ? '/blog' : `/${dil}/blog`;
  const yol = dil === 'tr' ? `/blog/${yazi.slug}` : `/${dil}/blog/${yazi.slug}`;
  const url = `https://www.tamuso.com${yol}`;
  const kat = yazi.blog_categories;
  const kategori = Array.isArray(kat) ? kat[0] : kat;
  const faqs = [...(yazi.blog_faqs ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const [acik, setAcik] = useState<number | null>(0);
  const [kardes, setKardes] = useState<{ language_code: string; slug: string; status: string }[]>([]);
  const [diger, setDiger] = useState<Kart[]>([]);
  const [okunma, setOkunma] = useState(yazi.okunma_sayisi ?? 0);
  useEffect(() => {
    setOkunma(yazi.okunma_sayisi ?? 0);
    if (taslak) return;
    void blogOkumaKaydet(yazi.slug, dil).then((n) => {
      if (n != null) setOkunma(n);
    });
  }, [yazi.id, yazi.slug, yazi.okunma_sayisi, dil, taslak]);
  useEffect(() => {
    if (yazi.content_group_id) {
      void blogKardesler(yazi.content_group_id).then((liste) => setKardes(liste as { language_code: string; slug: string; status: string }[]));
    }
    void blogListeHerkese(0, 48, dil).then((g) => setDiger((g.satirlar as Kart[]).filter((s) => s.slug !== yazi.slug)));
  }, [yazi.content_group_id, yazi.slug, dil]);
  const adlar: Record<string, string> = { tr: 'Türkçe', en: 'English', de: 'Deutsch', es: 'Español', ar: 'العربية', ru: 'Русский' };
  const diller = kardes.filter((k) => k.status === 'yayinda' && k.language_code !== dil);
  return (
    <View style={styles.sayfa}>
      {taslak ? <Text style={styles.uyari}>Önizleme. Bu adres dizine eklenmez.</Text> : null}
      <Buton yazi="Yazılara dön" onPress={() => ac(listeYol)} />
      <Text style={styles.kucuk}>
        {kategori?.name ? `${kategori.name} · ` : ''}
        {tarih(yazi.published_at)}
        {yazi.updated_at ? ` · Güncelleme ${tarih(yazi.updated_at)}` : ''}
        {` · ${yazi.author_name || 'Tamuso Yayın Ekibi'} · ${yazi.reading_minutes || okumaDakika(yazi.content_html)} dk · ${blogOkunmaYazi(okunma)}`}
      </Text>
      {diller.length ? (
        <View style={styles.satir}>
          {diller.map((k) => (
            <Buton
              key={k.language_code}
              yazi={adlar[k.language_code] || k.language_code}
              onPress={() => ac(k.language_code === 'tr' ? `/blog/${k.slug}` : `/${k.language_code}/blog/${k.slug}`)}
            />
          ))}
        </View>
      ) : null}
      <Text style={styles.h1}>{yazi.title}</Text>
      {yazi.excerpt ? <Text style={styles.giris}>{yazi.excerpt}</Text> : null}
      {yazi.cover_image_url ? (
        <Image
          source={{ uri: yazi.cover_image_url }}
          accessibilityLabel={yazi.cover_image_alt || yazi.title}
          style={styles.kapak}
        />
      ) : null}
      <View style={styles.okuma}>
        <BlogHtmlGorunum html={yazi.content_html} />
      </View>
      {(yazi.blog_post_cities ?? []).length ? (
        <View style={styles.satir}>
          {(yazi.blog_post_cities ?? []).map((s) => (
            <Buton key={s.city_id} yazi={s.city_name} onPress={() => ac(`/sehir/${s.city_id}`)} />
          ))}
        </View>
      ) : null}
      {faqs.map((f, i) => (
        <Pressable key={f.question} onPress={() => setAcik(acik === i ? null : i)} style={styles.kart}>
          <Text style={styles.h2}>{f.question}</Text>
          {acik === i ? <Text style={styles.govde}>{f.answer}</Text> : null}
        </Pressable>
      ))}
      <View style={styles.satir}>
        <Buton yazi="WhatsApp" onPress={() => void Linking.openURL(`https://wa.me/?text=${encodeURIComponent(`${yazi.title} ${url}`)}`)} />
        <Buton yazi="X" onPress={() => void Linking.openURL(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`)} />
        <Buton yazi="Facebook" onPress={() => void Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)} />
        <Buton yazi="LinkedIn" onPress={() => void Linking.openURL(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`)} />
        <Buton yazi="Linki kopyala" onPress={() => void Clipboard.setStringAsync(url)} />
      </View>
      {diger.length ? <Text style={styles.h2}>Diğer yazılar</Text> : null}
      <View style={styles.liste}>
        {diger.map((s, i) => (
          <Pressable key={s.slug} style={styles.kart} onPress={() => ac(dil === 'tr' ? `/blog/${s.slug}` : `/${dil}/blog/${s.slug}`)}>
            <Text style={styles.sira}>{siraNo(i + 1)}</Text>
            <View style={styles.kartMetin}>
              <Text style={styles.kucuk}>{[tarih(s.published_at), blogOkunmaYazi(s.okunma_sayisi)].filter(Boolean).join(' · ')}</Text>
              <Text style={styles.h2}>{s.title}</Text>
              {s.excerpt ? <Text style={styles.govde} numberOfLines={3}>{s.excerpt}</Text> : null}
              <Text style={styles.oku}>Yazıyı oku</Text>
            </View>
          </Pressable>
        ))}
      </View>
      <Buton yazi="Tüm yazılara dön" ana onPress={() => ac(listeYol)} />
    </View>
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
      <View style={styles.sayfa}>
        <Text style={styles.h1}>Sayfa bulunamadı</Text>
        <Buton yazi="Yazılara dön" ana onPress={() => ac('/blog')} />
      </View>
    );
  }
  if (!yazi) return <View style={styles.sayfa}><Text style={styles.kucuk}> </Text></View>;
  return <BlogYaziGorunum yazi={yazi} />;
}

export function BlogOnizlemeEkrani({ id }: { id: string }) {
  const [yazi, setYazi] = useState<BlogYazi | null>(null);
  useEffect(() => {
    void import('./blogApi').then((m) => m.blogYaziGetir(id).then(setYazi));
  }, [id]);
  if (!yazi) return <Screen edges={['top']}><Text style={styles.kucuk}> </Text></Screen>;
  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={styles.onizleme}>
        <BlogYaziGorunum yazi={yazi} taslak />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sayfa: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 28,
    gap: 18,
  },
  onizleme: { paddingBottom: 48 },
  okuma: { gap: 8, paddingVertical: 8 },
  ust: { color: C.primary, letterSpacing: 2, fontSize: 12, fontWeight: '700' },
  h1: { color: C.text, fontSize: 34, lineHeight: 42, fontWeight: '700' },
  h2: { color: C.text, fontSize: 20, lineHeight: 28, fontWeight: '700' },
  giris: { color: C.textMuted, fontSize: 18, lineHeight: 30 },
  govde: { color: C.textMuted, fontSize: 16, lineHeight: 26 },
  kucuk: { color: C.textMuted, fontSize: 14, lineHeight: 22 },
  oku: { color: C.primary, fontSize: 14, fontWeight: '700', marginTop: 4 },
  sira: { color: C.primary, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  kart: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    padding: 18,
    gap: 10,
    backgroundColor: C.bgCard,
  },
  kartMetin: { gap: 6 },
  kartKapak: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12 },
  liste: { gap: 14 },
  arama: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    color: C.text,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: C.surface,
  },
  satir: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  btn: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnYazi: { color: C.text, fontWeight: '700', fontSize: 14 },
  btnAna: { backgroundColor: C.primary, borderColor: C.primary },
  btnAnaYazi: { color: '#12040C' },
  uyari: { color: C.warning },
  kapak: { width: '100%', aspectRatio: 16 / 9, borderRadius: 18 },
});
