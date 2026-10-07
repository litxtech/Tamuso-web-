import { supabase } from '../../lib/supabase';
import { blogHtmlTemizle } from './blogHtmlTemizle';
import { slugYap } from './blogSlug';

export type BlogDurum = 'taslak' | 'inceleme' | 'planlandi' | 'yayinda' | 'arsiv' | 'cop';

export type BlogFaq = { id?: string; question: string; answer: string; sort_order: number };
export type BlogEtiket = { id: string; name: string; slug: string };
export type BlogSehir = { city_id: string; city_name: string; city_slug: string };
export type BlogKategori = {
  id: string;
  name: string;
  slug: string;
  description: string;
  seo_title: string | null;
  meta_description: string | null;
};

export type BlogYazi = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content_html: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  category_id: string | null;
  author_id: string | null;
  author_name: string | null;
  author_bio: string | null;
  author_avatar_url: string | null;
  status: BlogDurum;
  published_at: string | null;
  seo_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  robots_index: boolean;
  featured: boolean;
  reading_minutes: number;
  focus_topic: string | null;
  search_intent: string | null;
  keywords: string | null;
  language_code?: string;
  content_group_id?: string;
  translation_status?: string;
  blog_author_id?: string | null;
  twitter_title?: string | null;
  twitter_description?: string | null;
  created_at: string;
  updated_at: string;
  blog_categories?: BlogKategori | null;
  blog_faqs?: BlogFaq[];
  blog_post_tags?: { blog_tags: BlogEtiket | null }[];
  blog_post_cities?: BlogSehir[];
};

const SECIM = `
  id,title,slug,excerpt,content_html,cover_image_url,cover_image_alt,category_id,
  author_id,author_name,author_bio,author_avatar_url,status,published_at,
  seo_title,meta_description,canonical_url,og_title,og_description,og_image_url,
  robots_index,featured,reading_minutes,focus_topic,search_intent,keywords,
  language_code,content_group_id,translation_status,blog_author_id,twitter_title,twitter_description,
  created_at,updated_at,
  blog_categories(id,name,slug,description,seo_title,meta_description),
  blog_faqs(id,question,answer,sort_order),
  blog_post_tags(blog_tags(id,name,slug)),
  blog_post_cities(city_id,city_name,city_slug)
`;

function hata(error: { message: string } | null, yedek: string): never {
  const mesaj = error?.message ?? yedek;
  if (/duplicate key|blog_posts_slug/i.test(mesaj)) throw new Error('Bu slug kullanılıyor.');
  if (/güvenlik|ayrılmış/i.test(mesaj)) throw new Error(mesaj);
  throw new Error(mesaj);
}

async function blogSay(kur: (q: any) => any) {
  const { count, error } = await kur(supabase.from('blog_posts').select('id', { count: 'exact', head: true }));
  if (error) return 0;
  return count ?? 0;
}

export async function blogIstatistik() {
  const simdi = new Date();
  const yedi = new Date(simdi.getTime() - 7 * 86400000).toISOString();
  const otuz = new Date(simdi.getTime() - 30 * 86400000).toISOString();
  const iso = simdi.toISOString();
  const [toplam, yayinda, taslak, son7, son30] = await Promise.all([
    blogSay((q) => q.neq('status', 'cop')),
    blogSay((q) => q.in('status', ['yayinda', 'planlandi']).lte('published_at', iso)),
    blogSay((q) => q.eq('status', 'taslak')),
    blogSay((q) => q.in('status', ['yayinda', 'planlandi']).gte('published_at', yedi).lte('published_at', iso)),
    blogSay((q) => q.in('status', ['yayinda', 'planlandi']).gte('published_at', otuz).lte('published_at', iso)),
  ]);
  return { toplam, yayinda, taslak, son7, son30 };
}

export async function blogYazilari(durum?: BlogDurum | 'hepsi', sayfa = 0) {
  const boyut = 20;
  let q = supabase
    .from('blog_posts')
    .select('id,title,slug,status,language_code,translation_status,published_at,updated_at,featured,blog_categories(name)', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(sayfa * boyut, sayfa * boyut + boyut - 1);
  if (durum && durum !== 'hepsi') q = q.eq('status', durum);
  const { data, error, count } = await q;
  if (error) hata(error, 'Yazılar alınamadı');
  return { satirlar: data ?? [], toplam: count ?? 0, boyut };
}

export async function blogYaziGetir(id: string): Promise<BlogYazi | null> {
  const { data, error } = await supabase.from('blog_posts').select(SECIM).eq('id', id).maybeSingle();
  if (error) hata(error, 'Yazı alınamadı');
  return (data as BlogYazi | null) ?? null;
}

export async function blogHerkeseAcik(slug: string, dil = 'tr'): Promise<BlogYazi | null> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select(SECIM)
    .eq('slug', slug)
    .eq('language_code', dil)
    .in('status', ['yayinda', 'planlandi'])
    .lte('published_at', new Date().toISOString())
    .maybeSingle();
  if (error) return null;
  return (data as BlogYazi | null) ?? null;
}

export async function blogListeHerkese(sayfa = 0, boyut = 12, dil = 'tr') {
  const { data, error, count } = await supabase
    .from('blog_posts')
    .select('title,slug,excerpt,cover_image_url,cover_image_alt,published_at,featured,reading_minutes,language_code,blog_categories(name,slug)', { count: 'exact' })
    .eq('language_code', dil)
    .in('status', ['yayinda', 'planlandi'])
    .lte('published_at', new Date().toISOString())
    .order('featured', { ascending: false })
    .order('published_at', { ascending: false })
    .range(sayfa * boyut, sayfa * boyut + boyut - 1);
  if (error) return { satirlar: [], toplam: 0 };
  return { satirlar: data ?? [], toplam: count ?? 0 };
}

export async function blogKategoriler(): Promise<BlogKategori[]> {
  const { data, error } = await supabase.from('blog_categories').select('*').order('name');
  if (error) hata(error, 'Kategoriler alınamadı');
  return (data ?? []) as BlogKategori[];
}

export async function blogEtiketler(): Promise<BlogEtiket[]> {
  const { data, error } = await supabase.from('blog_tags').select('*').order('name');
  if (error) hata(error, 'Etiketler alınamadı');
  return (data ?? []) as BlogEtiket[];
}

export async function blogSehirAra(ad: string) {
  const q = ad.trim();
  if (q.length < 2) return [];
  const { data, error } = await supabase
    .from('geo_cities')
    .select('id,name,slug')
    .ilike('name', `%${q}%`)
    .eq('is_active', true)
    .limit(8);
  if (error) return [];
  return data ?? [];
}

export async function blogSlugBaska(slug: string, id?: string, dil = 'tr') {
  let q = supabase.from('blog_posts').select('id').eq('slug', slug).eq('language_code', dil);
  if (id) q = q.neq('id', id);
  const { data } = await q.limit(1);
  return Boolean(data?.length);
}

export type BlogKayit = {
  id?: string;
  updated_at?: string;
  title: string;
  slug: string;
  excerpt: string;
  content_html: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  category_id: string | null;
  author_id: string | null;
  author_name: string | null;
  author_bio: string | null;
  author_avatar_url: string | null;
  status: BlogDurum;
  published_at: string | null;
  seo_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  robots_index: boolean;
  featured: boolean;
  focus_topic: string | null;
  search_intent: string | null;
  keywords: string | null;
  language_code?: string;
  content_group_id?: string;
  blog_author_id?: string | null;
  twitter_title?: string | null;
  twitter_description?: string | null;
  faqs: BlogFaq[];
  etiketler: { name: string }[];
  sehirler: BlogSehir[];
};

export async function blogKaydet(kayit: BlogKayit): Promise<BlogYazi> {
  const govde = {
    title: kayit.title.trim(),
    slug: kayit.slug,
    excerpt: kayit.excerpt.trim(),
    content_html: blogHtmlTemizle(kayit.content_html),
    cover_image_url: kayit.cover_image_url,
    cover_image_alt: kayit.cover_image_alt,
    category_id: kayit.category_id,
    author_id: kayit.author_id,
    author_name: kayit.author_name,
    author_bio: kayit.author_bio,
    author_avatar_url: kayit.author_avatar_url,
    status: kayit.status,
    published_at: kayit.published_at,
    seo_title: kayit.seo_title?.trim() || null,
    meta_description: kayit.meta_description?.trim() || null,
    canonical_url: kayit.canonical_url?.trim() || null,
    og_title: kayit.og_title?.trim() || null,
    og_description: kayit.og_description?.trim() || null,
    og_image_url: kayit.og_image_url,
    robots_index: kayit.status === 'taslak' || kayit.status === 'cop' ? false : kayit.robots_index,
    featured: kayit.featured,
    focus_topic: kayit.focus_topic,
    search_intent: kayit.search_intent,
    keywords: kayit.keywords,
    language_code: kayit.language_code || 'tr',
    content_group_id: kayit.content_group_id,
    blog_author_id: kayit.blog_author_id ?? null,
    twitter_title: kayit.twitter_title ?? null,
    twitter_description: kayit.twitter_description ?? null,
  };

  let id = kayit.id;
  if (!id) {
    const { data, error } = await supabase.from('blog_posts').insert(govde).select('id').single();
    if (error) hata(error, 'Kayıt açılamadı');
    id = data.id as string;
  } else {
    let q = supabase.from('blog_posts').update(govde).eq('id', id);
    if (kayit.updated_at) q = q.eq('updated_at', kayit.updated_at);
    const { data, error } = await q.select('id');
    if (error) hata(error, 'Kayıt güncellenemedi');
    if (!data?.length) throw new Error('Bu yazı başka bir oturumda değişmiş. Sayfayı yenileyin.');
  }

  const { error: faqSil } = await supabase.from('blog_faqs').delete().eq('post_id', id);
  if (faqSil) hata(faqSil, 'SSS kaydedilemedi');
  const faqlar = kayit.faqs.filter((f) => f.question.trim() && f.answer.trim());
  if (faqlar.length) {
    const { error } = await supabase.from('blog_faqs').insert(
      faqlar.map((f, i) => ({
        post_id: id,
        question: f.question.trim(),
        answer: f.answer.trim(),
        sort_order: i,
      })),
    );
    if (error) hata(error, 'SSS kaydedilemedi');
  }

  const etiketId: string[] = [];
  for (const et of kayit.etiketler) {
    const name = et.name.trim();
    const slug = slugYap(name);
    if (!name || !slug) continue;
    const { data: varOlan } = await supabase.from('blog_tags').select('id').eq('slug', slug).maybeSingle();
    if (varOlan?.id) {
      etiketId.push(varOlan.id as string);
      continue;
    }
    const { data, error } = await supabase.from('blog_tags').insert({ name, slug }).select('id').single();
    if (error) hata(error, 'Etiket kaydedilemedi');
    etiketId.push(data.id as string);
  }
  await supabase.from('blog_post_tags').delete().eq('post_id', id);
  if (etiketId.length) {
    const { error } = await supabase.from('blog_post_tags').insert(
      [...new Set(etiketId)].map((tag_id) => ({ post_id: id, tag_id })),
    );
    if (error) hata(error, 'Etiket bağlanamadı');
  }

  await supabase.from('blog_post_cities').delete().eq('post_id', id);
  if (kayit.sehirler.length) {
    const { error } = await supabase.from('blog_post_cities').insert(
      kayit.sehirler.map((s) => ({
        post_id: id,
        city_id: s.city_id,
        city_name: s.city_name,
        city_slug: s.city_slug,
      })),
    );
    if (error) hata(error, 'Şehir bağlanamadı');
  }

  const yazi = await blogYaziGetir(id);
  if (!yazi) throw new Error('Kayıt okunamadı');
  return yazi;
}

export async function blogDurum(id: string, status: BlogDurum) {
  const robots_index = status === 'taslak' || status === 'cop' || status === 'arsiv' || status === 'inceleme' ? false : undefined;
  const yama: { status: BlogDurum; robots_index?: boolean } = { status };
  if (robots_index === false) yama.robots_index = false;
  const { error } = await supabase.from('blog_posts').update(yama).eq('id', id);
  if (error) hata(error, 'Durum değişmedi');
}

export async function blogKaliciSil(id: string) {
  const { error } = await supabase.from('blog_posts').delete().eq('id', id).eq('status', 'cop');
  if (error) hata(error, 'Silinemedi');
}

export async function blogKategoriKaydet(satir: Partial<BlogKategori> & { name: string }) {
  const slug = satir.slug?.trim() || slugYap(satir.name);
  const govde = {
    name: satir.name.trim(),
    slug,
    description: satir.description ?? '',
    seo_title: satir.seo_title ?? null,
    meta_description: satir.meta_description ?? null,
  };
  if (satir.id) {
    const { error } = await supabase.from('blog_categories').update(govde).eq('id', satir.id);
    if (error) hata(error, 'Kategori güncellenemedi');
    return;
  }
  const { error } = await supabase.from('blog_categories').insert(govde);
  if (error) hata(error, 'Kategori eklenemedi');
}

export async function blogKategoriSil(id: string) {
  const { error } = await supabase.from('blog_categories').delete().eq('id', id);
  if (error) hata(error, 'Kategori silinemedi');
}

export async function blogEtiketSil(id: string) {
  const { error } = await supabase.from('blog_tags').delete().eq('id', id);
  if (error) hata(error, 'Etiket silinemedi');
}

export async function blogYonlendirmeler(slug: string) {
  const { data } = await supabase
    .from('blog_redirects')
    .select('from_slug,to_slug,created_at')
    .eq('to_slug', slug)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function blogAyarGetir() {
  const { data } = await supabase.from('blog_settings').select('tag_index_min,updated_at').eq('id', 1).maybeSingle();
  return { tag_index_min: data?.tag_index_min ?? 3, updated_at: data?.updated_at ?? null };
}

export async function blogAyarKaydet(tag_index_min: number) {
  const { error } = await supabase.from('blog_settings').update({ tag_index_min }).eq('id', 1);
  if (error) hata(error, 'Ayar kaydedilemedi');
}

export async function blogDilleri() {
  const { data, error } = await supabase.from('blog_languages').select('*').order('sort_order');
  if (error) hata(error, 'Diller alınamadı');
  return data ?? [];
}

export async function blogDilKaydet(code: string, yama: { is_active?: boolean; is_default?: boolean; is_publishable?: boolean }) {
  if (yama.is_default) {
    await supabase.from('blog_languages').update({ is_default: false }).neq('code', code);
  }
  const { error } = await supabase.from('blog_languages').update(yama).eq('code', code);
  if (error) hata(error, 'Dil kaydedilemedi');
}

export async function blogYazarlar() {
  const { data, error } = await supabase.from('blog_authors').select('*').order('name');
  if (error) hata(error, 'Yazarlar alınamadı');
  return data ?? [];
}

export async function blogYazarKaydet(satir: { id?: string; name: string; slug?: string; bio?: string; role?: string; website?: string; avatar_url?: string | null; kind?: string }) {
  const govde = {
    name: satir.name.trim(),
    slug: satir.slug?.trim() || slugYap(satir.name),
    bio: satir.bio ?? '',
    role: satir.role ?? '',
    website: satir.website ?? null,
    avatar_url: satir.avatar_url ?? null,
    kind: satir.kind === 'person' ? 'person' : 'organization',
  };
  if (satir.id) {
    const { error } = await supabase.from('blog_authors').update(govde).eq('id', satir.id);
    if (error) hata(error, 'Yazar güncellenemedi');
    return;
  }
  const { error } = await supabase.from('blog_authors').insert(govde);
  if (error) hata(error, 'Yazar eklenemedi');
}

export async function blogMedyaListele(kind?: string) {
  let q = supabase.from('blog_media').select('*').order('created_at', { ascending: false }).limit(80);
  if (kind) q = q.eq('kind', kind);
  const { data, error } = await q;
  if (error) return [];
  return data ?? [];
}

export async function blogYolYonlendirmeleri() {
  const { data, error } = await supabase.from('blog_path_redirects').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) hata(error, 'Yönlendirmeler alınamadı');
  return data ?? [];
}

export async function blogYolYonlendirmeEkle(old_path: string, new_path: string) {
  const { error } = await supabase.from('blog_path_redirects').insert({ old_path, new_path, status_code: 301 });
  if (error) hata(error, 'Yönlendirme eklenemedi');
}

export async function blogCeviriGruplari() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id,title,slug,language_code,status,translation_status,content_group_id,updated_at')
    .neq('status', 'cop')
    .order('updated_at', { ascending: false })
    .limit(200);
  if (error) hata(error, 'Çeviriler alınamadı');
  return data ?? [];
}

export async function blogCeviriTaslagi(kaynakId: string, dil: string) {
  const kaynak = await blogYaziGetir(kaynakId);
  if (!kaynak?.content_group_id) throw new Error('İçerik grubu yok');
  const { data: varOlan } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('content_group_id', kaynak.content_group_id)
    .eq('language_code', dil)
    .maybeSingle();
  if (varOlan?.id) return varOlan.id as string;
  const slug = slugYap(`taslak ${dil} ${kaynak.slug}`) || `taslak-${dil}`;
  const { data, error } = await supabase.from('blog_posts').insert({
    title: dil,
    slug,
    excerpt: '',
    content_html: '<p></p>',
    language_code: dil,
    content_group_id: kaynak.content_group_id,
    category_id: kaynak.category_id,
    blog_author_id: kaynak.blog_author_id,
    status: 'taslak',
    translation_status: 'draft',
    robots_index: false,
    cover_image_url: kaynak.cover_image_url,
    cover_image_alt: '',
  }).select('id').single();
  if (error) hata(error, 'Çeviri taslağı açılmadı');
  if (kaynak.blog_post_cities?.length) {
    await supabase.from('blog_post_cities').insert(kaynak.blog_post_cities.map((s) => ({
      post_id: data.id,
      city_id: s.city_id,
      city_name: s.city_name,
      city_slug: s.city_slug,
    })));
  }
  return data.id as string;
}

export async function blogKardesler(groupId: string) {
  const { data } = await supabase
    .from('blog_posts')
    .select('id,language_code,slug,status,translation_status,published_at,robots_index')
    .eq('content_group_id', groupId);
  return data ?? [];
}

export async function blogGorselYukle(dosya: File, ad: string, tur: 'blog' | 'authors' | 'social' | 'video' = 'blog'): Promise<string> {
  if (/svg|html|javascript/i.test(dosya.type) || /\.svg$/i.test(dosya.name)) {
    throw new Error('Bu dosya türü yüklenemez.');
  }
  if (dosya.size > 8_000_000 && !dosya.type.startsWith('video/')) {
    throw new Error('Görsel 8 MB sınırını aşıyor.');
  }
  const blob = dosya.type.startsWith('video/') ? dosya : await webpYap(dosya);
  const uzanti = dosya.type.startsWith('video/') ? 'mp4' : 'webp';
  const mime = dosya.type.startsWith('video/') ? 'video/mp4' : 'image/webp';
  const yol = `${tur}/${slugYap(ad) || 'gorsel'}-${Date.now()}.${uzanti}`;
  const { error } = await supabase.storage.from('blog-gorseller').upload(yol, blob, {
    contentType: mime,
    upsert: false,
  });
  if (error) hata(error, 'Görsel yüklenemedi');
  await supabase.from('blog_media').insert({
    path: yol,
    filename: yol.split('/').pop(),
    mime,
    bytes: blob.size,
    alt_text: ad,
    kind: tur === 'authors' ? 'author' : tur === 'video' ? 'video' : 'image',
  });
  const { data } = supabase.storage.from('blog-gorseller').getPublicUrl(yol);
  return data.publicUrl;
}

function webpYap(dosya: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const max = 1600;
      const oran = Math.min(1, max / Math.max(img.width, img.height));
      const tuval = document.createElement('canvas');
      tuval.width = Math.max(1, Math.round(img.width * oran));
      tuval.height = Math.max(1, Math.round(img.height * oran));
      tuval.getContext('2d')?.drawImage(img, 0, 0, tuval.width, tuval.height);
      tuval.toBlob((b) => (b ? resolve(b) : reject(new Error('Görsel dönüşmedi'))), 'image/webp', 0.82);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error('Görsel okunamadı'));
    img.src = URL.createObjectURL(dosya);
  });
}
