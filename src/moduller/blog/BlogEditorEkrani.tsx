import React, { createElement, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Screen } from '../../components/Screen';
import { EkranBasligi } from '../../components/EkranBasligi';
import { KlavyeGuvenliAlan } from '../../bilesenler/klavye/KlavyeGuvenliAlan';
import { RenkTokenlari as R } from '../../tasarim-sistemi/RenkTokenlari';
import { BlogAiKapisi } from './BlogAiKapisi';
import { BlogAltMenu } from './BlogAltMenu';
import { BlogCeviriSeridi } from './BlogCeviriSeridi';
import { blogAsistanCevir, blogAsistanDoldur, type BlogAsistanOneri, type BlogGorselAday } from './blogAsistan';
import {
  aciklamaDurumu,
  aciklamaOlustur,
  baslikDurumu,
  kanonik,
  okumaDakika,
  seoBaslik,
  seoKontrol,
} from './blogSeo';
import { slugYap } from './blogSlug';
import {
  blogCeviriKaydet,
  blogDurum,
  blogGorselYukle,
  blogKaliciSil,
  blogKategoriler,
  blogKaydet,
  blogSehirAdlariEsle,
  blogSehirAra,
  blogSlugBaska,
  blogYaziGetir,
  blogYonlendirmeler,
  type BlogDurum,
  type BlogFaq,
  type BlogKategori,
  type BlogSehir,
} from './blogApi';

type Props = { id?: string };

function onay(mesaj: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return Promise.resolve(window.confirm(mesaj));
  return Promise.resolve(true);
}

function saat(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export function BlogEditorEkrani({ id }: Props) {
  const { width } = useWindowDimensions();
  const genis = width >= 980;
  const DILLER = ['en', 'de', 'es', 'ar', 'ru'];
  const editorRef = useRef<HTMLDivElement | null>(null);
  const kaydirRef = useRef<ScrollView | null>(null);
  const slugElle = useRef(false);
  const seoElle = useRef(false);
  const aciklamaElle = useRef(false);
  const kanonikElle = useRef(false);
  const [hazir, setHazir] = useState(!id);
  const [kayitId, setKayitId] = useState(id);
  const [updatedAt, setUpdatedAt] = useState<string | undefined>();
  const updatedAtRef = useRef<string | undefined>(undefined);
  updatedAtRef.current = updatedAt;
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [html, setHtml] = useState('<p></p>');
  const [cover, setCover] = useState<string | null>(null);
  const [coverAlt, setCoverAlt] = useState('');
  const [coverCredit, setCoverCredit] = useState<string | null>(null);
  const [dil, setDil] = useState('tr');
  const [kategoriId, setKategoriId] = useState<string | null>(null);
  const [kategoriler, setKategoriler] = useState<BlogKategori[]>([]);
  const [etiketMetin, setEtiketMetin] = useState('');
  const [sehirler, setSehirler] = useState<BlogSehir[]>([]);
  const [sehirQ, setSehirQ] = useState('');
  const [sehirSonuc, setSehirSonuc] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [faqs, setFaqs] = useState<BlogFaq[]>([]);
  const [durum, setDurum] = useState<BlogDurum>('taslak');
  const [yayin, setYayin] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [meta, setMeta] = useState('');
  const [canonical, setCanonical] = useState('');
  const [ogTitle, setOgTitle] = useState('');
  const [ogDesc, setOgDesc] = useState('');
  const [indexle, setIndexle] = useState(true);
  const [oneCikan, setOneCikan] = useState(false);
  const [konu, setKonu] = useState('');
  const [niyet, setNiyet] = useState('');
  const [kelimeler, setKelimeler] = useState('');
  const [grupId, setGrupId] = useState<string | undefined>();
  const [mesaj, setMesaj] = useState('');
  const [hata, setHata] = useState('');
  const [sonKayit, setSonKayit] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);
  const [ai, setAi] = useState<{ alan: string; baslik: string } | null>(null);
  const [aiCalisiyor, setAiCalisiyor] = useState(false);
  const [oneriler, setOneriler] = useState<BlogAsistanOneri>({ etiketler: [], sehir_adlari: [], baliklar: [] });
  const [gorseller, setGorseller] = useState<BlogGorselAday[]>([]);
  const [yonler, setYonler] = useState<{ from_slug: string; to_slug: string }[]>([]);
  const kaydediliyor = useRef(false);
  const bekleyen = useRef<{ hedef: BlogDurum; yayinla: boolean } | null>(null);
  const ceviriSuruyor = useRef(false);
  const oneriDurdu = useRef(false);
  const publishedIso = useRef<string | null>(null);
  const ilkKayit = useRef(true);

  useEffect(() => {
    void blogKategoriler().then(setKategoriler).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!id) return;
    void blogYaziGetir(id).then((yazi) => {
      if (!yazi) {
        setHata('Yazı bulunamadı');
        return;
      }
      slugElle.current = true;
      seoElle.current = Boolean(yazi.seo_title);
      aciklamaElle.current = Boolean(yazi.meta_description);
      kanonikElle.current = Boolean(yazi.canonical_url);
      setKayitId(yazi.id);
      setUpdatedAt(yazi.updated_at);
      setTitle(yazi.title);
      setSlug(yazi.slug);
      setExcerpt(yazi.excerpt);
      setHtml(yazi.content_html || '<p></p>');
      setCover(yazi.cover_image_url);
      setCoverAlt(yazi.cover_image_alt ?? '');
      setCoverCredit(yazi.cover_credit ?? null);
      setDil(yazi.language_code || 'tr');
      setKategoriId(yazi.category_id);
      setEtiketMetin((yazi.blog_post_tags ?? []).map((t) => t.blog_tags?.name).filter(Boolean).join(', '));
      setSehirler(yazi.blog_post_cities ?? []);
      setFaqs([...(yazi.blog_faqs ?? [])].sort((a, b) => a.sort_order - b.sort_order));
      setDurum(yazi.status);
      publishedIso.current = yazi.published_at;
      setYayin(yazi.published_at ? yazi.published_at.slice(0, 16) : '');
      setSeoTitle(yazi.seo_title ?? '');
      setMeta(yazi.meta_description ?? '');
      setCanonical(yazi.canonical_url ?? '');
      setOgTitle(yazi.og_title ?? '');
      setOgDesc(yazi.og_description ?? '');
      const taslakKilidi = yazi.status === 'taslak' || yazi.status === 'inceleme' || yazi.status === 'cop' || yazi.status === 'arsiv';
      setIndexle(taslakKilidi ? true : yazi.robots_index);
      setOneCikan(yazi.featured);
      setKonu(yazi.focus_topic ?? '');
      setNiyet(yazi.search_intent ?? '');
      setKelimeler(yazi.keywords ?? '');
      setGrupId(yazi.content_group_id);
      setSonKayit(yazi.updated_at);
      setHazir(true);
      void blogYonlendirmeler(yazi.slug).then(setYonler);
    }).catch((e) => setHata(e instanceof Error ? e.message : 'Yazı açılmadı'));
  }, [id]);

  useEffect(() => {
    if (!hazir || !editorRef.current) return;
    if (typeof document !== 'undefined' && document.activeElement === editorRef.current) return;
    if (editorRef.current.innerHTML !== html) editorRef.current.innerHTML = html;
  }, [hazir, html]);

  function imleciGorunurYap() {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const rect = sel.getRangeAt(0).getClientRects()[0] || sel.getRangeAt(0).getBoundingClientRect();
    const vv = window.visualViewport;
    const gorunenAlt = (vv?.offsetTop ?? 0) + (vv?.height ?? window.innerHeight);
    if (rect && rect.bottom > gorunenAlt - 36) {
      window.scrollBy({ top: rect.bottom - gorunenAlt + 88, left: 0 });
    }
  }

  function icerik(): string {
    if (Platform.OS === 'web' && editorRef.current) return editorRef.current.innerHTML;
    return html;
  }

  function baslikYaz(deger: string) {
    setTitle(deger);
    if (!slugElle.current) setSlug(slugYap(deger));
  }

  const gorunenBaslik = seoBaslik(title, seoTitle);
  const gorunenAciklama = aciklamaOlustur(meta, excerpt, icerik());
  const gorunenKanonik = kanonik(slug, canonical, dil);
  const kontrol = useMemo(
    () => seoKontrol({
      title, slug, excerpt, content_html: html, seo_title: seoTitle, meta_description: meta,
      canonical_url: canonical, cover_image_url: cover, cover_image_alt: coverAlt,
    }),
    [title, slug, excerpt, html, seoTitle, meta, canonical, cover, coverAlt],
  );

  function etiketListe(ek: string[] = []) {
    const hepsi = [...etiketMetin.split(','), ...ek].map((ad) => ad.trim()).filter(Boolean);
    return [...new Set(hepsi)];
  }

  function taslakPaket() {
    return {
      title,
      excerpt,
      content_html: icerik(),
      seo_title: seoTitle,
      meta_description: meta,
      keywords: kelimeler,
      focus_topic: konu,
      sehirler: sehirler.map((s) => s.city_name),
      etiketler: etiketListe(),
    };
  }

  async function paylasAdres(adresSlug: string, baslik: string) {
    const url = kanonik(adresSlug, null, dil);
    try {
      const sonuc = await Share.share({ message: `${baslik}\n${url}`, url });
      if (sonuc.action === Share.dismissedAction) await Clipboard.setStringAsync(url);
    } catch {
      await Clipboard.setStringAsync(url);
    }
    return url;
  }

  async function dillereHazirla(kaynakId: string, yayinla: boolean) {
    if (dil !== 'tr' || ceviriSuruyor.current) return;
    ceviriSuruyor.current = true;
    const paket = taslakPaket();
    try {
      for (const hedef of DILLER) {
        setMesaj(`${hedef} hazırlanıyor…`);
        const sonuc = await blogAsistanCevir({ dil: hedef, taslak: paket });
        if (!sonuc.ok || !sonuc.ceviri.title) {
          setHata((eski) => `${eski ? `${eski} ` : ''}${hedef} hazırlanamadı.`);
          continue;
        }
        const c = sonuc.ceviri;
        await blogCeviriKaydet({
          kaynakId,
          dil: hedef,
          title: c.title || hedef,
          slug: c.slug || '',
          excerpt: c.excerpt || '',
          content_html: c.content_html || '<p></p>',
          seo_title: c.seo_title,
          meta_description: c.meta_description,
          og_title: c.og_title,
          og_description: c.og_description,
          keywords: c.keywords,
          focus_topic: c.focus_topic,
          search_intent: c.search_intent,
          cover_alt: c.cover_alt,
          faqs: c.faqs.map((f, i) => ({ ...f, sort_order: i })),
          etiketler: c.etiketler.map((name) => ({ name })),
          yayinla,
        });
      }
    } finally {
      ceviriSuruyor.current = false;
    }
  }

  async function kaydet(hedef: BlogDurum, yayinla = false, elle = false) {
    if (kaydediliyor.current) {
      if (elle) {
        bekleyen.current = { hedef, yayinla };
        setMesaj('Kayıt sıraya alındı.');
      }
      return;
    }
    const govde = icerik();
    setHtml(govde);
    const kullanilacakSlug = slugYap(slug) || slugYap(title) || `taslak-${Date.now().toString(36)}`;
    if (kullanilacakSlug !== slug) setSlug(kullanilacakSlug);
    if (!title.trim()) {
      setHata('Önce bir başlık yazın.');
      return;
    }
    const zaman = yayin ? new Date(yayin) : new Date();
    const gelecek = yayinla && !Number.isNaN(zaman.getTime()) && zaman.getTime() > Date.now() + 30000;
    const status: BlogDurum = yayinla ? (gelecek ? 'planlandi' : 'yayinda') : hedef;
    let published_at = publishedIso.current;
    if (yayinla) {
      published_at = Number.isNaN(zaman.getTime()) ? new Date().toISOString() : zaman.toISOString();
      publishedIso.current = published_at;
    }
    if (status === 'taslak' || status === 'cop') published_at = null;
    let uyarilar: string[] = [];
    if (yayinla) {
      if (await blogSlugBaska(kullanilacakSlug, kayitId, dil)) {
        setHata('Bu slug kullanılıyor.');
        return;
      }
      const denetim = seoKontrol({
        title, slug: kullanilacakSlug, excerpt, content_html: govde, seo_title: seoTitle, meta_description: meta,
        canonical_url: canonical, cover_image_url: cover, cover_image_alt: coverAlt,
      });
      if (denetim.engel.length) {
        setHata(denetim.engel.join(' '));
        return;
      }
      uyarilar = denetim.uyari;
    }
    kaydediliyor.current = true;
    setMesgul(true);
    setHata('');
    try {
      const yazi = await blogKaydet({
        id: kayitId,
        updated_at: updatedAtRef.current,
        title,
        slug: kullanilacakSlug,
        excerpt,
        content_html: govde,
        cover_image_url: cover,
        cover_image_alt: coverAlt || null,
        cover_credit: coverCredit,
        category_id: kategoriId,
        author_id: null,
        author_name: null,
        author_bio: null,
        author_avatar_url: null,
        content_group_id: grupId,
        language_code: dil,
        status,
        published_at,
        seo_title: seoTitle || null,
        meta_description: meta || null,
        canonical_url: canonical || null,
        og_title: ogTitle || null,
        og_description: ogDesc || null,
        og_image_url: cover,
        robots_index: status === 'taslak' || status === 'cop' || status === 'arsiv' ? false : indexle,
        featured: oneCikan,
        focus_topic: konu || null,
        search_intent: niyet || null,
        keywords: kelimeler || null,
        faqs,
        etiketler: etiketListe().map((name) => ({ name })),
        sehirler,
        zorla: elle,
      });
      setKayitId(yazi.id);
      updatedAtRef.current = yazi.updated_at;
      setUpdatedAt(yazi.updated_at);
      setGrupId(yazi.content_group_id);
      setDurum(yazi.status);
      setSonKayit(yazi.updated_at);
      const url = kanonik(yazi.slug, null, dil);
      setMesaj(yayinla
        ? `Yayınlandı. Paylaş: ${url}${uyarilar.length ? ` · ${uyarilar[0]}` : ''}`
        : 'Taslak kaydedildi.');
      if (yayinla) {
        await paylasAdres(yazi.slug, yazi.title);
        await dillereHazirla(yazi.id, true);
        setMesaj(`Yayınlandı. ${url}`);
      }
      if (!id && yazi.id) router.replace(`/admin/blog/${yazi.id}` as never);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Kayıt olmadı');
    } finally {
      kaydediliyor.current = false;
      setMesgul(false);
      const sonraki = bekleyen.current;
      bekleyen.current = null;
      if (sonraki) void kaydet(sonraki.hedef, sonraki.yayinla, true);
    }
  }

  useEffect(() => {
    if (!hazir || !title.trim()) return;
    if (ilkKayit.current) {
      ilkKayit.current = false;
      return;
    }
    const t = setTimeout(() => {
      if (ceviriSuruyor.current || aiCalisiyor) return;
      void kaydet(durum === 'yayinda' || durum === 'planlandi' ? durum : 'taslak', false);
    }, 4000);
    return () => clearTimeout(t);
  }, [title, slug, excerpt, html, cover, coverAlt, kategoriId, etiketMetin, faqs, seoTitle, meta, canonical, hazir]);

  async function gorselSec(dosya: Blob | undefined, kapakMi: boolean, mime?: string) {
    if (!dosya) return;
    const alt = (kapakMi ? coverAlt || title : title || 'Görsel').trim() || 'Görsel';
    try {
      const url = await blogGorselYukle(dosya, slug || title || 'gorsel', 'blog', mime);
      if (kapakMi) {
        setCover(url);
        if (!coverAlt.trim()) setCoverAlt(alt);
        setCoverCredit(null);
      } else if (editorRef.current) {
        editorRef.current.focus();
        document.execCommand(
          'insertHTML',
          false,
          `<figure><img src="${url}" alt="${alt}" loading="lazy" /><figcaption>${alt}</figcaption></figure>`,
        );
        setHtml(editorRef.current.innerHTML);
      }
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Görsel yüklenmedi');
    }
  }

  async function galeridenKapak() {
    const { ImagePickerModuluYukle } = await import('../../ortak/medya/ImagePickerHazirMi');
    const yuklu = await ImagePickerModuluYukle();
    if (!yuklu.ok) {
      setHata(yuklu.hata);
      return;
    }
    const izin = await yuklu.ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!izin.granted) {
      setHata('Galeri izni gerekli.');
      return;
    }
    const secim = await yuklu.ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (secim.canceled || !secim.assets[0]) return;
    const asset = secim.assets[0];
    const yanit = await fetch(asset.uri);
    await gorselSec(await yanit.blob(), true, asset.mimeType || 'image/jpeg');
  }

  function kapakSec(aday: BlogGorselAday) {
    setCover(aday.url);
    setCoverAlt(aday.alt || title || 'Kapak');
    setCoverCredit(aday.credit);
  }

  function oneriUygula(liste: BlogAsistanOneri, adaylar: BlogGorselAday[]) {
    setOneriler(liste);
    if (adaylar.length) setGorseller(adaylar);
    const ek = [...liste.etiketler, ...liste.baliklar];
    if (ek.length) setEtiketMetin(etiketListe(ek).join(', '));
    if (liste.sehir_adlari.length) {
      void blogSehirAdlariEsle(liste.sehir_adlari).then((bulunan) => {
        setSehirler((eski) => {
          const sonraki = [...eski];
          for (const sehir of bulunan) {
            if (!sonraki.some((s) => s.city_id === sehir.city_id)) sonraki.push(sehir);
          }
          return sonraki;
        });
      });
    }
  }

  async function aiGonder(istek: string) {
    if (!ai) return;
    setAiCalisiyor(true);
    setHata('');
    try {
      const sonuc = await blogAsistanDoldur({
        mod: ai.alan === 'kapak' ? 'gorsel' : 'doldur',
        alan: ai.alan,
        istek,
        taslak: taslakPaket(),
      });
      if (!sonuc.ok) {
        setHata(sonuc.code === 'FORBIDDEN' ? 'Bu işlem için yönetici gerekir.' : 'DeepSeek yanıt vermedi.');
        return;
      }
      const t = sonuc.taslak;
      if (t?.title) baslikYaz(t.title);
      if (t?.excerpt) setExcerpt(t.excerpt);
      if (t?.content_html) {
        setHtml(t.content_html);
        if (editorRef.current) editorRef.current.innerHTML = t.content_html;
      }
      if (t?.seo_title) { seoElle.current = true; setSeoTitle(t.seo_title); }
      if (t?.meta_description) { aciklamaElle.current = true; setMeta(t.meta_description); }
      if (t?.og_title) setOgTitle(t.og_title);
      if (t?.og_description) setOgDesc(t.og_description);
      if (t?.keywords) setKelimeler(t.keywords);
      if (t?.focus_topic) setKonu(t.focus_topic);
      if (t?.search_intent) setNiyet(t.search_intent);
      if (t?.cover_alt) setCoverAlt(t.cover_alt);
      if (t?.slug && !slugElle.current) setSlug(slugYap(t.slug) || slugYap(t.title || ''));
      if (t?.faqs?.length) setFaqs(t.faqs.map((f, i) => ({ ...f, sort_order: i })));
      oneriUygula(
        {
          etiketler: [...(t?.etiketler ?? []), ...sonuc.oneriler.etiketler],
          sehir_adlari: sonuc.oneriler.sehir_adlari,
          baliklar: sonuc.oneriler.baliklar,
        },
        sonuc.gorseller,
      );
      if (!cover && sonuc.gorseller[0]) kapakSec(sonuc.gorseller[0]);
      setMesaj('DeepSeek alanları doldurdu.');
      setAi(null);
    } finally {
      setAiCalisiyor(false);
    }
  }

  useEffect(() => {
    if (!hazir || title.trim().length + html.trim().length < 48) return;
    const t = setTimeout(() => {
      if (oneriDurdu.current || ceviriSuruyor.current) return;
      void blogAsistanDoldur({ mod: 'oner', taslak: taslakPaket() }).then((sonuc) => {
        if (!sonuc.ok) {
          oneriDurdu.current = true;
          return;
        }
        setOneriler(sonuc.oneriler);
        if (sonuc.gorseller.length) setGorseller((eski) => (eski.length ? eski : sonuc.gorseller));
      });
    }, 6000);
    return () => clearTimeout(t);
  }, [title, html, hazir]);

  function komut(ad: string, deger?: string) {
    if (Platform.OS !== 'web') return;
    editorRef.current?.focus();
    document.execCommand(ad, false, deger);
    if (editorRef.current) setHtml(editorRef.current.innerHTML);
  }

  function aiSatir(etiket: string, anahtar: string) {
    return (
      <View style={styles.alanUst}>
        <Text style={styles.etiket}>{etiket}</Text>
        <Pressable onPress={() => setAi({ alan: anahtar, baslik: etiket })} hitSlop={8} accessibilityLabel={`${etiket} için DeepSeek`}>
          <Text style={styles.ai}>DeepSeek</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Screen edges={['top']}>
      <EkranBasligi title={id ? 'Yazıyı düzenle' : 'Yeni yazı'} subtitle={sonKayit ? `Son kayıt: ${saat(sonKayit)}` : durum} />
      <KlavyeGuvenliAlan style={styles.klavye}>
      <ScrollView
        ref={kaydirRef}
        style={styles.kaydir}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.sayfa}
      >
        <BlogAltMenu />
        <BlogCeviriSeridi yaziId={kayitId} grupId={grupId} />
        {hata ? <Text style={styles.hata}>{hata}</Text> : null}
        {mesaj ? <Text style={styles.mesaj}>{mesaj}</Text> : null}
        <View style={[styles.kolon, genis && styles.kolonYan]}>
          <View style={styles.sol}>
            {aiSatir('Başlık', 'title')}
            <TextInput value={title} onChangeText={baslikYaz} style={styles.girdi} placeholder="Yazı başlığı" placeholderTextColor={R.textMuted} />
            {aiSatir('İçerik', 'content_html')}
            {Platform.OS === 'web' ? (
              <View style={styles.araclar}>
                {[
                  ['bold', 'Kalın'],
                  ['italic', 'İtalik'],
                  ['underline', 'Altı çizili'],
                ].map(([ad, et]) => (
                  <Pressable key={ad} onPress={() => komut(ad)} style={styles.arac}><Text style={styles.aracYazi}>{et}</Text></Pressable>
                ))}
                <Pressable onPress={() => komut('formatBlock', 'H2')} style={styles.arac}><Text style={styles.aracYazi}>H2</Text></Pressable>
                <Pressable onPress={() => komut('formatBlock', 'H3')} style={styles.arac}><Text style={styles.aracYazi}>H3</Text></Pressable>
                <Pressable onPress={() => komut('insertUnorderedList')} style={styles.arac}><Text style={styles.aracYazi}>Liste</Text></Pressable>
                <Pressable onPress={() => komut('insertOrderedList')} style={styles.arac}><Text style={styles.aracYazi}>Sıra</Text></Pressable>
                <Pressable onPress={() => komut('formatBlock', 'BLOCKQUOTE')} style={styles.arac}><Text style={styles.aracYazi}>Alıntı</Text></Pressable>
                <Pressable onPress={() => {
                  const href = window.prompt('Bağlantı', 'https://');
                  if (href) komut('createLink', href);
                }} style={styles.arac}><Text style={styles.aracYazi}>Link</Text></Pressable>
                <Pressable onPress={() => komut('insertHorizontalRule')} style={styles.arac}><Text style={styles.aracYazi}>Çizgi</Text></Pressable>
                {createElement('input', {
                  type: 'file',
                  accept: 'image/*',
                  'aria-label': 'İçerik görseli',
                  onChange: (e: { target: { files?: FileList | null } }) => void gorselSec(e.target.files?.[0], false),
                })}
                <Pressable onPress={() => {
                  const src = window.prompt('YouTube veya Vimeo adresi');
                  if (!src) return;
                  if (!/^https:\/\/(www\.youtube\.com|www\.youtube-nocookie\.com|player\.vimeo\.com)\//.test(src)) {
                    setHata('Yalnızca YouTube veya Vimeo adresi gömülür.');
                    return;
                  }
                  komut('insertHTML', `<iframe src="${src}" title="Video" loading="lazy" allowfullscreen></iframe>`);
                }} style={styles.arac}><Text style={styles.aracYazi}>Video</Text></Pressable>
              </View>
            ) : null}
            {Platform.OS === 'web'
              ? createElement('div', {
                  ref: editorRef,
                  contentEditable: true,
                  role: 'textbox',
                  'aria-label': 'Yazı içeriği',
                  style: editorStil,
                  onInput: (e: { currentTarget: HTMLDivElement }) => {
                    setHtml(e.currentTarget.innerHTML);
                    imleciGorunurYap();
                  },
                  onKeyUp: () => imleciGorunurYap(),
                })
              : (
                <TextInput
                  value={html}
                  onChangeText={setHtml}
                  multiline
                  scrollEnabled={false}
                  textAlignVertical="top"
                  style={[styles.girdi, styles.uzun]}
                />
              )}
            <Text style={styles.kucuk}>{okumaDakika(html)} dk okuma. Sayfadaki tek H1 başlıktır; içerikte H2 ve H3 kullanın.</Text>
            {aiSatir('Sık sorulanlar', 'faqs')}
            {faqs.map((f, i) => (
              <View key={i} style={styles.kutu}>
                <TextInput value={f.question} placeholder="Soru" placeholderTextColor={R.textMuted} style={styles.girdi} onChangeText={(question) => setFaqs((liste) => liste.map((x, n) => n === i ? { ...x, question } : x))} />
                <TextInput value={f.answer} placeholder="Cevap" placeholderTextColor={R.textMuted} style={styles.girdi} onChangeText={(answer) => setFaqs((liste) => liste.map((x, n) => n === i ? { ...x, answer } : x))} />
              </View>
            ))}
            <Pressable onPress={() => setFaqs((liste) => [...liste, { question: '', answer: '', sort_order: liste.length }])}>
              <Text style={styles.link}>Soru ekle</Text>
            </Pressable>
          </View>
          <View style={styles.sag}>
            {aiSatir('Kısa açıklama', 'excerpt')}
            <TextInput value={excerpt} onChangeText={setExcerpt} style={styles.girdi} multiline />
            {aiSatir('Slug', 'slug')}
            <TextInput value={slug} onChangeText={(v) => { slugElle.current = true; setSlug(slugYap(v) || v.toLowerCase()); }} style={styles.girdi} autoCapitalize="none" />
            <Text style={styles.etiket}>Kategori</Text>
            <ScrollView horizontal contentContainerStyle={styles.serit}>
              {kategoriler.map((k) => (
                <Pressable key={k.id} onPress={() => setKategoriId(k.id)} style={[styles.cip, kategoriId === k.id && styles.cipAktif]}>
                  <Text style={styles.cipYazi}>{k.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {aiSatir('Etiketler', 'etiketler')}
            <TextInput value={etiketMetin} onChangeText={setEtiketMetin} placeholder="Trabzon, Karadeniz" placeholderTextColor={R.textMuted} style={styles.girdi} />
            {oneriler.etiketler.length || oneriler.baliklar.length || oneriler.sehir_adlari.length ? (
              <View style={styles.oneriSerit}>
                {oneriler.etiketler.map((ad) => (
                  <Pressable key={`e-${ad}`} onPress={() => setEtiketMetin(etiketListe([ad]).join(', '))} style={styles.cip}>
                    <Text style={styles.cipYazi}>{ad}</Text>
                  </Pressable>
                ))}
                {oneriler.baliklar.map((ad) => (
                  <Pressable key={`b-${ad}`} onPress={() => setEtiketMetin(etiketListe([ad]).join(', '))} style={styles.cip}>
                    <Text style={styles.cipYazi}>Balık · {ad}</Text>
                  </Pressable>
                ))}
                {oneriler.sehir_adlari.map((ad) => (
                  <Pressable key={`s-${ad}`} onPress={() => { setSehirQ(ad); void blogSehirAdlariEsle([ad]).then((bulunan) => setSehirler((eski) => {
                    const sonraki = [...eski];
                    for (const sehir of bulunan) if (!sonraki.some((x) => x.city_id === sehir.city_id)) sonraki.push(sehir);
                    return sonraki;
                  })); }} style={styles.cip}>
                    <Text style={styles.cipYazi}>Şehir · {ad}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {aiSatir('İlgili şehir', 'sehir')}
            <TextInput value={sehirQ} onChangeText={(v) => { setSehirQ(v); void blogSehirAra(v).then(setSehirSonuc); }} placeholder="Şehir ara" placeholderTextColor={R.textMuted} style={styles.girdi} />
            {sehirSonuc.map((s) => (
              <Pressable key={s.id} onPress={() => setSehirler((liste) => liste.some((x) => x.city_id === s.id) ? liste : [...liste, { city_id: s.id, city_name: s.name, city_slug: s.slug }])}>
                <Text style={styles.link}>{s.name}</Text>
              </Pressable>
            ))}
            <Text style={styles.kucuk}>{sehirler.map((s) => s.city_name).join(', ')}</Text>
            {aiSatir('Kapak', 'kapak')}
            {cover ? (
              <Image source={{ uri: cover }} accessibilityLabel={coverAlt || title || 'Kapak'} style={styles.kapak} />
            ) : (
              <Text style={styles.uyari}>Kapak yoksa paylaşım önizlemesi görselsiz kalır.</Text>
            )}
            <View style={styles.satir}>
              {Platform.OS === 'web' ? createElement('input', {
                type: 'file',
                accept: 'image/*',
                'aria-label': 'Kapak görseli',
                onChange: (e: { target: { files?: FileList | null } }) => void gorselSec(e.target.files?.[0], true),
              }) : (
                <Pressable onPress={() => void galeridenKapak()} style={styles.arac}><Text style={styles.aracYazi}>Galeriden seç</Text></Pressable>
              )}
              <Pressable onPress={() => setAi({ alan: 'kapak', baslik: 'Kapak fotoğrafı' })} style={styles.arac}>
                <Text style={styles.aracYazi}>Gerçek fotoğraf bul</Text>
              </Pressable>
            </View>
            {gorseller.length ? (
              <ScrollView horizontal contentContainerStyle={styles.serit}>
                {gorseller.map((g) => (
                  <Pressable key={g.url} onPress={() => kapakSec(g)}>
                    <Image source={{ uri: g.url }} accessibilityLabel={g.alt} style={styles.aday} />
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
            <TextInput value={coverAlt} onChangeText={setCoverAlt} placeholder="Kapak alt metni" placeholderTextColor={R.textMuted} style={styles.girdi} />
            {coverCredit ? <Text style={styles.kucuk}>{coverCredit}</Text> : null}
            <Text style={styles.etiket}>Yayın tarihi</Text>
            {Platform.OS === 'web' ? createElement('input', {
              type: 'datetime-local',
              value: yayin,
              'aria-label': 'Yayın tarihi',
              onChange: (e: { target: { value: string } }) => setYayin(e.target.value),
              style: { color: '#f4f1ea', background: '#12101a', border: '1px solid #2c2840', borderRadius: 8, padding: 8 },
            }) : (
              <TextInput value={yayin} onChangeText={setYayin} placeholder="2026-10-10T19:30" placeholderTextColor={R.textMuted} style={styles.girdi} />
            )}
            <Text style={styles.kucuk}>Gelecek tarih planlar. Zamanı gelince yazı kendiliğinden açılır; cron gerekmez.</Text>
            <Pressable onPress={() => setOneCikan((v) => !v)}><Text style={styles.link}>{oneCikan ? 'Öne çıkan' : 'Öne çıkan yap'}</Text></Pressable>
            <Pressable onPress={() => setIndexle((v) => !v)}><Text style={styles.link}>{indexle ? 'Index' : 'Noindex'}</Text></Pressable>
            {aiSatir(`SEO title · ${[...gorunenBaslik].length} · ${baslikDurumu(gorunenBaslik)}`, 'seo_title')}
            <TextInput value={seoTitle} onChangeText={(v) => { seoElle.current = true; setSeoTitle(v); }} placeholder={seoBaslik(title)} placeholderTextColor={R.textMuted} style={styles.girdi} />
            {aiSatir(`Meta açıklama · ${[...gorunenAciklama].length} · ${aciklamaDurumu(gorunenAciklama)}`, 'meta')}
            <TextInput value={meta} onChangeText={(v) => { aciklamaElle.current = true; setMeta(v); }} placeholder={gorunenAciklama} placeholderTextColor={R.textMuted} style={styles.girdi} multiline />
            {aiSatir('Canonical', 'canonical')}
            <TextInput value={canonical} onChangeText={(v) => { kanonikElle.current = true; setCanonical(v); }} placeholder={gorunenKanonik} placeholderTextColor={R.textMuted} style={styles.girdi} autoCapitalize="none" />
            {aiSatir('OG title / açıklama', 'og')}
            <TextInput value={ogTitle} onChangeText={setOgTitle} placeholder={gorunenBaslik} placeholderTextColor={R.textMuted} style={styles.girdi} />
            <TextInput value={ogDesc} onChangeText={setOgDesc} placeholder={gorunenAciklama} placeholderTextColor={R.textMuted} style={styles.girdi} />
            <View style={styles.onizleme}>
              <Text style={styles.kucuk}>Google önizleme</Text>
              <Text style={styles.gBaslik}>{gorunenBaslik}</Text>
              <Text style={styles.gUrl}>{gorunenKanonik}</Text>
              <Text style={styles.gAcik}>{gorunenAciklama}</Text>
            </View>
            <View style={styles.onizleme}>
              <Text style={styles.kucuk}>Paylaşım önizleme</Text>
              {cover ? (
                <Image source={{ uri: cover }} accessibilityLabel={coverAlt || 'Kapak'} style={styles.kapak} />
              ) : <Text style={styles.uyari}>Görsel yok</Text>}
              <Text style={styles.gBaslik}>{ogTitle || gorunenBaslik}</Text>
              <Text style={styles.gAcik}>{ogDesc || gorunenAciklama}</Text>
            </View>
            <Text style={styles.etiket}>Teknik kontrol {kontrol.puan}/100</Text>
            <Text style={styles.kucuk}>{kontrol.not}</Text>
            {kontrol.maddeler.map((m) => (
              <Text key={m.ad} style={styles.kucuk}>{m.tamam ? 'Tamam' : 'Eksik'} · {m.ad}</Text>
            ))}
            {aiSatir('Editoryal notlar', 'konu')}
            <TextInput value={konu} onChangeText={setKonu} placeholder="Anahtar konu" placeholderTextColor={R.textMuted} style={styles.girdi} />
            <TextInput value={niyet} onChangeText={setNiyet} placeholder="Arama niyeti" placeholderTextColor={R.textMuted} style={styles.girdi} />
            <TextInput value={kelimeler} onChangeText={setKelimeler} placeholder="İlgili kelimeler" placeholderTextColor={R.textMuted} style={styles.girdi} />
            <Text style={styles.kucuk}>Bu üç alan sitede gösterilmez.</Text>
            {yonler.length ? (
              <Text style={styles.kucuk}>Eski adresler: {yonler.map((y) => y.from_slug).join(', ')}</Text>
            ) : null}
            {kayitId && durum === 'cop' ? (
              <Pressable onPress={async () => {
                if (await onay('Yazı kalıcı olarak silinsin mi?')) {
                  await blogKaliciSil(kayitId);
                  router.replace('/admin/blog/cop' as never);
                }
              }}><Text style={styles.hata}>Kalıcı sil</Text></Pressable>
            ) : null}
          </View>
        </View>
      </ScrollView>
      {ai ? (
        <BlogAiKapisi
          baslik={ai.baslik}
          calisiyor={aiCalisiyor}
          kapat={() => setAi(null)}
          gonder={(istek) => void aiGonder(istek)}
        />
      ) : null}
      <View style={styles.altBar}>
        {hata ? <Text style={styles.hata}>{hata}</Text> : null}
        {mesaj ? <Text style={styles.mesaj}>{mesaj}</Text> : null}
        <View style={styles.satir}>
          <Pressable style={[styles.dugme, styles.dugmeYan, mesgul && styles.soluk]} disabled={mesgul} onPress={() => void kaydet('taslak', false, true)}>
            {mesgul ? <ActivityIndicator color="#fff" /> : <Text style={styles.dugmeYazi}>Taslak</Text>}
          </Pressable>
          <Pressable style={[styles.dugme, styles.dugmeYan, mesgul && styles.soluk]} disabled={mesgul} onPress={() => void kaydet(durum, true, true)}>
            <Text style={styles.dugmeYazi}>Yayınla</Text>
          </Pressable>
        </View>
        <View style={styles.satir}>
          {kayitId ? (
            <Pressable onPress={() => router.push(`/admin/blog/onizleme/${kayitId}` as never)}><Text style={styles.link}>Önizle</Text></Pressable>
          ) : null}
          {slug ? (
            <Pressable onPress={() => void paylasAdres(slug, title || 'Blog')}><Text style={styles.link}>Paylaş</Text></Pressable>
          ) : null}
          {kayitId ? (
            <Pressable onPress={() => void dillereHazirla(kayitId, durum === 'yayinda' || durum === 'planlandi')}><Text style={styles.link}>Tüm diller</Text></Pressable>
          ) : null}
          {kayitId && durum !== 'cop' ? (
            <Pressable onPress={() => void blogDurum(kayitId, 'cop').then(() => setDurum('cop'))}><Text style={styles.link}>Çöpe taşı</Text></Pressable>
          ) : null}
        </View>
      </View>
      </KlavyeGuvenliAlan>
    </Screen>
  );
}

const editorStil = {
  minHeight: 320,
  border: '1px solid #2c2840',
  borderRadius: 12,
  padding: 12,
  color: '#f4f1ea',
  background: '#100e18',
  whiteSpace: 'pre-wrap' as const,
  overflowWrap: 'break-word' as const,
  lineHeight: '1.6',
};

const styles = StyleSheet.create({
  sayfa: { padding: 16, gap: 12, paddingBottom: 80 },
  kolon: { gap: 16 },
  kolonYan: { flexDirection: 'row', alignItems: 'flex-start' },
  sol: { flex: 2, gap: 8, minWidth: 280 },
  sag: { flex: 1, gap: 8, minWidth: 260 },
  etiket: { color: R.text, fontWeight: '700', marginTop: 8 },
  girdi: { borderWidth: 1, borderColor: R.border, borderRadius: 10, color: R.text, padding: 10 },
  uzun: { minHeight: 220, textAlignVertical: 'top' },
  kucuk: { color: R.textMuted, fontSize: 12 },
  uyari: { color: R.warning, fontSize: 12 },
  hata: { color: R.danger },
  mesaj: { color: R.mint },
  link: { color: R.primarySoft, paddingVertical: 4 },
  araclar: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  arac: { borderWidth: 1, borderColor: R.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  aracYazi: { color: R.text, fontSize: 12 },
  serit: { gap: 6 },
  cip: { borderWidth: 1, borderColor: R.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  cipAktif: { borderColor: R.primarySoft },
  cipYazi: { color: R.text, fontSize: 12 },
  kutu: { gap: 6 },
  onizleme: { borderWidth: 1, borderColor: R.border, borderRadius: 12, padding: 10, gap: 4, maxWidth: 520 },
  gBaslik: { color: '#8ab4f8', fontSize: 16 },
  gUrl: { color: '#81c995', fontSize: 12 },
  gAcik: { color: R.textMuted, fontSize: 13 },
  dugme: { backgroundColor: R.primary, borderRadius: 10, padding: 12, alignItems: 'center' },
  dugmeYan: { flex: 1 },
  dugmeYazi: { color: '#fff', fontWeight: '700' },
  klavye: { flex: 1 },
  kaydir: { flex: 1 },
  alanUst: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ai: { color: R.primarySoft, fontSize: 12, fontWeight: '700' },
  kapak: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12 },
  aday: { width: 96, height: 64, borderRadius: 8 },
  altBar: { borderTopWidth: 1, borderTopColor: R.border, padding: 12, gap: 8, backgroundColor: '#100e18' },
  satir: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  oneriSerit: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  soluk: { opacity: 0.6 },
});
