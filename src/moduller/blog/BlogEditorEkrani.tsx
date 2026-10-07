import React, { createElement, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../components/Screen';
import { EkranBasligi } from '../../components/EkranBasligi';
import { RenkTokenlari as R } from '../../tasarim-sistemi/RenkTokenlari';
import { BlogAltMenu } from './BlogAltMenu';
import { BlogCeviriSeridi } from './BlogCeviriSeridi';
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
  blogDurum,
  blogGorselYukle,
  blogKaliciSil,
  blogKategoriler,
  blogKaydet,
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
  const editorRef = useRef<HTMLDivElement | null>(null);
  const slugElle = useRef(false);
  const seoElle = useRef(false);
  const aciklamaElle = useRef(false);
  const kanonikElle = useRef(false);
  const [hazir, setHazir] = useState(!id);
  const [kayitId, setKayitId] = useState(id);
  const [updatedAt, setUpdatedAt] = useState<string | undefined>();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [html, setHtml] = useState('<p></p>');
  const [cover, setCover] = useState<string | null>(null);
  const [coverAlt, setCoverAlt] = useState('');
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
  const [yonler, setYonler] = useState<{ from_slug: string; to_slug: string }[]>([]);
  const kaydediliyor = useRef(false);
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
      setIndexle(yazi.robots_index);
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
    if (editorRef.current.innerHTML !== html) editorRef.current.innerHTML = html;
  }, [hazir, html]);

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
  const gorunenKanonik = kanonik(slug, canonical);
  const kontrol = useMemo(
    () => seoKontrol({
      title, slug, excerpt, content_html: html, seo_title: seoTitle, meta_description: meta,
      canonical_url: canonical, cover_image_url: cover, cover_image_alt: coverAlt,
    }),
    [title, slug, excerpt, html, seoTitle, meta, canonical, cover, coverAlt],
  );

  async function kaydet(hedef: BlogDurum, yayinla = false) {
    if (kaydediliyor.current) return;
    const govde = icerik();
    setHtml(govde);
    const zaman = yayin ? new Date(yayin) : new Date();
    const gelecek = yayinla && !Number.isNaN(zaman.getTime()) && zaman.getTime() > Date.now() + 30000;
    const status: BlogDurum = yayinla ? (gelecek ? 'planlandi' : 'yayinda') : hedef;
    let published_at = publishedIso.current;
    if (yayinla) {
      published_at = Number.isNaN(zaman.getTime()) ? new Date().toISOString() : zaman.toISOString();
      publishedIso.current = published_at;
    }
    if (status === 'taslak' || status === 'cop') published_at = null;
    if (yayinla) {
      if (await blogSlugBaska(slug, kayitId, 'tr')) {
        setHata('Bu slug kullanılıyor.');
        return;
      }
      const denetim = seoKontrol({
        title, slug, excerpt, content_html: govde, seo_title: seoTitle, meta_description: meta,
        canonical_url: canonical, cover_image_url: cover, cover_image_alt: coverAlt,
      });
      if (denetim.engel.length) {
        setHata(denetim.engel.join(' '));
        return;
      }
      if (denetim.uyari.length && !(await onay(`${denetim.uyari.join('\n')}\n\nYine de yayınlansın mı?`))) return;
    }
    kaydediliyor.current = true;
    setHata('');
    try {
      const yazi = await blogKaydet({
        id: kayitId,
        updated_at: updatedAt,
        title,
        slug,
        excerpt,
        content_html: govde,
        cover_image_url: cover,
        cover_image_alt: coverAlt || null,
        category_id: kategoriId,
        author_id: null,
        author_name: null,
        author_bio: null,
        author_avatar_url: null,
        content_group_id: grupId,
        language_code: 'tr',
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
        etiketler: etiketMetin.split(',').map((ad) => ({ name: ad.trim() })).filter((e) => e.name),
        sehirler,
      });
      setKayitId(yazi.id);
      setUpdatedAt(yazi.updated_at);
      setGrupId(yazi.content_group_id);
      setDurum(yazi.status);
      setSonKayit(yazi.updated_at);
      setMesaj(yayinla ? 'Yayınlandı. Adres bir sonraki site dışa aktarımında site haritasına girer.' : 'Kaydedildi.');
      if (!id) router.replace(`/admin/blog/${yazi.id}` as never);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Kayıt olmadı');
    } finally {
      kaydediliyor.current = false;
    }
  }

  useEffect(() => {
    if (!hazir || !title.trim()) return;
    if (ilkKayit.current) {
      ilkKayit.current = false;
      return;
    }
    const t = setTimeout(() => {
      void kaydet(durum === 'yayinda' || durum === 'planlandi' ? durum : 'taslak', false);
    }, 4000);
    return () => clearTimeout(t);
  }, [title, slug, excerpt, html, cover, coverAlt, kategoriId, etiketMetin, faqs, seoTitle, meta, canonical, hazir]);

  async function gorselSec(dosya: File | undefined, kapakMi: boolean) {
    if (!dosya) return;
    const alt = Platform.OS === 'web' ? window.prompt('Görsel alt metni', title || 'Görsel') : '';
    if (!alt?.trim()) {
      setHata('Alt metin olmadan görsel eklenmez.');
      return;
    }
    try {
      const url = await blogGorselYukle(dosya, slug || 'gorsel');
      if (kapakMi) {
        setCover(url);
        setCoverAlt(alt.trim());
      } else if (editorRef.current) {
        editorRef.current.focus();
        document.execCommand(
          'insertHTML',
          false,
          `<figure><img src="${url}" alt="${alt.trim()}" loading="lazy" /><figcaption>${alt.trim()}</figcaption></figure>`,
        );
        setHtml(editorRef.current.innerHTML);
      }
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Görsel yüklenmedi');
    }
  }

  function komut(ad: string, deger?: string) {
    if (Platform.OS !== 'web') return;
    editorRef.current?.focus();
    document.execCommand(ad, false, deger);
    if (editorRef.current) setHtml(editorRef.current.innerHTML);
  }

  return (
    <Screen edges={['top']}>
      <EkranBasligi title={id ? 'Yazıyı düzenle' : 'Yeni yazı'} subtitle={sonKayit ? `Son kayıt: ${saat(sonKayit)}` : 'Taslak'} />
      <ScrollView contentContainerStyle={styles.sayfa}>
        <BlogAltMenu />
        <BlogCeviriSeridi yaziId={kayitId} grupId={grupId} />
        {hata ? <Text style={styles.hata}>{hata}</Text> : null}
        {mesaj ? <Text style={styles.mesaj}>{mesaj}</Text> : null}
        <View style={[styles.kolon, genis && styles.kolonYan]}>
          <View style={styles.sol}>
            <Text style={styles.etiket}>Başlık</Text>
            <TextInput value={title} onChangeText={baslikYaz} style={styles.girdi} placeholder="Yazı başlığı" placeholderTextColor={R.textMuted} />
            <Text style={styles.etiket}>İçerik</Text>
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
                  onInput: (e: { currentTarget: HTMLDivElement }) => setHtml(e.currentTarget.innerHTML),
                })
              : (
                <TextInput
                  value={html}
                  onChangeText={setHtml}
                  multiline
                  style={[styles.girdi, styles.uzun]}
                />
              )}
            <Text style={styles.kucuk}>{okumaDakika(html)} dk okuma. Sayfadaki tek H1 başlıktır; içerikte H2 ve H3 kullanın.</Text>
            <Text style={styles.etiket}>Sık sorulanlar</Text>
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
            <Text style={styles.etiket}>Kısa açıklama</Text>
            <TextInput value={excerpt} onChangeText={setExcerpt} style={styles.girdi} multiline />
            <Text style={styles.etiket}>Slug</Text>
            <TextInput value={slug} onChangeText={(v) => { slugElle.current = true; setSlug(slugYap(v) || v.toLowerCase()); }} style={styles.girdi} autoCapitalize="none" />
            <Text style={styles.etiket}>Kategori</Text>
            <ScrollView horizontal contentContainerStyle={styles.serit}>
              {kategoriler.map((k) => (
                <Pressable key={k.id} onPress={() => setKategoriId(k.id)} style={[styles.cip, kategoriId === k.id && styles.cipAktif]}>
                  <Text style={styles.cipYazi}>{k.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.etiket}>Etiketler</Text>
            <TextInput value={etiketMetin} onChangeText={setEtiketMetin} placeholder="Trabzon, Karadeniz" placeholderTextColor={R.textMuted} style={styles.girdi} />
            <Text style={styles.etiket}>İlgili şehir</Text>
            <TextInput value={sehirQ} onChangeText={(v) => { setSehirQ(v); void blogSehirAra(v).then(setSehirSonuc); }} placeholder="Şehir ara" placeholderTextColor={R.textMuted} style={styles.girdi} />
            {sehirSonuc.map((s) => (
              <Pressable key={s.id} onPress={() => setSehirler((liste) => liste.some((x) => x.city_id === s.id) ? liste : [...liste, { city_id: s.id, city_name: s.name, city_slug: s.slug }])}>
                <Text style={styles.link}>{s.name}</Text>
              </Pressable>
            ))}
            <Text style={styles.kucuk}>{sehirler.map((s) => s.city_name).join(', ')}</Text>
            <Text style={styles.etiket}>Kapak</Text>
            {Platform.OS === 'web' ? createElement('input', {
              type: 'file',
              accept: 'image/*',
              'aria-label': 'Kapak görseli',
              onChange: (e: { target: { files?: FileList | null } }) => void gorselSec(e.target.files?.[0], true),
            }) : null}
            <TextInput value={coverAlt} onChangeText={setCoverAlt} placeholder="Kapak alt metni" placeholderTextColor={R.textMuted} style={styles.girdi} />
            {cover ? <Text style={styles.kucuk}>{cover}</Text> : <Text style={styles.uyari}>Kapak yoksa paylaşım önizlemesi görselsiz kalır.</Text>}
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
            <Text style={styles.etiket}>SEO title · {[...gorunenBaslik].length} · {baslikDurumu(gorunenBaslik)}</Text>
            <TextInput value={seoTitle} onChangeText={(v) => { seoElle.current = true; setSeoTitle(v); }} placeholder={seoBaslik(title)} placeholderTextColor={R.textMuted} style={styles.girdi} />
            <Text style={styles.etiket}>Meta açıklama · {[...gorunenAciklama].length} · {aciklamaDurumu(gorunenAciklama)}</Text>
            <TextInput value={meta} onChangeText={(v) => { aciklamaElle.current = true; setMeta(v); }} placeholder={gorunenAciklama} placeholderTextColor={R.textMuted} style={styles.girdi} multiline />
            <Text style={styles.etiket}>Canonical</Text>
            <TextInput value={canonical} onChangeText={(v) => { kanonikElle.current = true; setCanonical(v); }} placeholder={gorunenKanonik} placeholderTextColor={R.textMuted} style={styles.girdi} autoCapitalize="none" />
            <Text style={styles.etiket}>OG title / açıklama</Text>
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
              {cover ? <Text style={styles.kucuk}>Kapak kullanılacak</Text> : <Text style={styles.uyari}>Görsel yok</Text>}
              <Text style={styles.gBaslik}>{ogTitle || gorunenBaslik}</Text>
              <Text style={styles.gAcik}>{ogDesc || gorunenAciklama}</Text>
            </View>
            <Text style={styles.etiket}>Teknik kontrol {kontrol.puan}/100</Text>
            <Text style={styles.kucuk}>{kontrol.not}</Text>
            {kontrol.maddeler.map((m) => (
              <Text key={m.ad} style={styles.kucuk}>{m.tamam ? 'Tamam' : 'Eksik'} · {m.ad}</Text>
            ))}
            <Text style={styles.etiket}>Editoryal notlar</Text>
            <TextInput value={konu} onChangeText={setKonu} placeholder="Anahtar konu" placeholderTextColor={R.textMuted} style={styles.girdi} />
            <TextInput value={niyet} onChangeText={setNiyet} placeholder="Arama niyeti" placeholderTextColor={R.textMuted} style={styles.girdi} />
            <TextInput value={kelimeler} onChangeText={setKelimeler} placeholder="İlgili kelimeler" placeholderTextColor={R.textMuted} style={styles.girdi} />
            <Text style={styles.kucuk}>Bu üç alan sitede gösterilmez.</Text>
            {yonler.length ? (
              <Text style={styles.kucuk}>Eski adresler: {yonler.map((y) => y.from_slug).join(', ')}</Text>
            ) : null}
            <Pressable style={styles.dugme} onPress={() => void kaydet('taslak')}><Text style={styles.dugmeYazi}>Taslak kaydet</Text></Pressable>
            <Pressable style={styles.dugme} onPress={() => void kaydet(durum, true)}><Text style={styles.dugmeYazi}>Yayınla</Text></Pressable>
            {kayitId ? (
              <Pressable onPress={() => router.push(`/admin/blog/onizleme/${kayitId}` as never)}><Text style={styles.link}>Önizle</Text></Pressable>
            ) : null}
            {kayitId && durum !== 'cop' ? (
              <Pressable onPress={() => void blogDurum(kayitId, 'cop').then(() => setDurum('cop'))}><Text style={styles.link}>Çöpe taşı</Text></Pressable>
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
    </Screen>
  );
}

const editorStil = {
  minHeight: 280,
  border: '1px solid #2c2840',
  borderRadius: 12,
  padding: 12,
  color: '#f4f1ea',
  background: '#100e18',
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
  dugmeYazi: { color: '#fff', fontWeight: '700' },
});
