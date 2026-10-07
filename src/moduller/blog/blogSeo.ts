import { blogDuzMetin, altsizGorselVar } from './blogHtmlTemizle';
import { slugGecerli, slugYap } from './blogSlug';

export const BLOG_ORIGIN = 'https://www.tamuso.com';

export function seoBaslik(baslik: string, ozel?: string | null): string {
  const elle = String(ozel ?? '').trim();
  if (elle) return elle;
  const ham = baslik.trim();
  if (!ham) return 'Tamuso';
  if (/tamuso\s*$/i.test(ham)) return ham;
  return `${ham} | Tamuso`;
}

export function baslikDurumu(metin: string): 'kisa' | 'ideal' | 'uzun' {
  const n = [...metin].length;
  if (n < 45) return 'kisa';
  if (n <= 60) return 'ideal';
  return 'uzun';
}

export function aciklamaOlustur(ozel: string | null | undefined, excerpt: string, html: string): string {
  const elle = String(ozel ?? '').trim();
  if (elle) return elle.slice(0, 180);
  const kaynak = excerpt.trim() || blogDuzMetin(html);
  if (!kaynak) return '';
  if (kaynak.length <= 160) return kaynak;
  const kesik = kaynak.slice(0, 157);
  const bosluk = kesik.lastIndexOf(' ');
  return `${(bosluk > 80 ? kesik.slice(0, bosluk) : kesik).trim()}…`;
}

export function aciklamaDurumu(metin: string): 'kisa' | 'ideal' | 'uzun' {
  const n = [...metin].length;
  if (n < 80) return 'kisa';
  if (n <= 160) return 'ideal';
  return 'uzun';
}

export function kanonik(slug: string, ozel?: string | null, dil = 'tr'): string {
  const yol = !dil || dil === 'tr' ? `/blog/${slug}` : `/${dil}/blog/${slug}`;
  const self = `${BLOG_ORIGIN}${yol}`;
  const elle = String(ozel ?? '').trim();
  if (!elle) return self;
  try {
    const u = new URL(elle);
    if (u.origin !== BLOG_ORIGIN) return self;
    if (u.pathname.replace(/\/$/, '') !== yol) return self;
    return self;
  } catch {
    return self;
  }
}

export function okumaDakika(html: string): number {
  const kelime = blogDuzMetin(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(kelime / 180));
}

export type SeoKontrol = {
  puan: number;
  maddeler: { ad: string; tamam: boolean }[];
  not: string;
  engel: string[];
  uyari: string[];
};

export function seoKontrol(girdi: {
  title: string;
  slug: string;
  excerpt: string;
  content_html: string;
  seo_title?: string | null;
  meta_description?: string | null;
  canonical_url?: string | null;
  cover_image_url?: string | null;
  cover_image_alt?: string | null;
}): SeoKontrol {
  const title = seoBaslik(girdi.title, girdi.seo_title);
  const description = aciklamaOlustur(girdi.meta_description, girdi.excerpt, girdi.content_html);
  const metin = blogDuzMetin(girdi.content_html);
  const h2 = (girdi.content_html.match(/<h2[\s>]/gi) || []).length;
  const canonical = kanonik(girdi.slug, girdi.canonical_url);
  const maddeler = [
    { ad: 'Başlık', tamam: Boolean(girdi.title.trim()) },
    { ad: 'SEO title', tamam: baslikDurumu(title) === 'ideal' },
    { ad: 'Meta açıklama', tamam: aciklamaDurumu(description) === 'ideal' },
    { ad: 'Slug', tamam: slugGecerli(girdi.slug) },
    { ad: 'Tek H1', tamam: !/<h1[\s>]/i.test(girdi.content_html) },
    { ad: 'H2', tamam: h2 > 0 },
    { ad: 'Alt metin', tamam: !altsizGorselVar(girdi.content_html) && (!girdi.cover_image_url || Boolean(girdi.cover_image_alt?.trim())) },
    { ad: 'Canonical', tamam: canonical.startsWith(`${BLOG_ORIGIN}/`) },
    { ad: 'Kapak', tamam: Boolean(girdi.cover_image_url) },
    { ad: 'Uzunluk', tamam: metin.length >= 400 },
  ];
  const engel: string[] = [];
  if (!girdi.title.trim()) engel.push('Başlık gerekli.');
  if (metin.length < 40) engel.push('İçerik çok kısa.');
  if (!slugGecerli(girdi.slug)) engel.push('Slug geçersiz veya ayrılmış bir kelime.');
  if (altsizGorselVar(girdi.content_html)) engel.push('İçerikteki bir görselin alt metni yok.');
  if (girdi.cover_image_url && !girdi.cover_image_alt?.trim()) engel.push('Kapak görselinin alt metni yok.');
  if (girdi.canonical_url && !/^https:\/\/www\.tamuso\.com\//.test(girdi.canonical_url.trim())) {
    engel.push('Canonical https://www.tamuso.com ile başlamalı.');
  }
  const uyari: string[] = [];
  if (!girdi.excerpt.trim()) uyari.push('Kısa açıklama boş. Metnin başı kullanılacak.');
  if (baslikDurumu(title) !== 'ideal') uyari.push(`SEO title ${baslikDurumu(title) === 'kisa' ? 'kısa' : 'uzun'}.`);
  if (aciklamaDurumu(description) !== 'ideal') uyari.push(`Meta açıklama ${aciklamaDurumu(description) === 'kisa' ? 'kısa' : 'uzun'}.`);
  if (h2 === 0) uyari.push('H2 başlık yok.');
  if (metin.length < 400) uyari.push('Metin 400 karakterin altında.');
  if (!/<a\s/i.test(girdi.content_html)) uyari.push('İçerikte bağlantı yok.');
  return {
    puan: Math.round((maddeler.filter((m) => m.tamam).length / maddeler.length) * 100),
    maddeler,
    not: 'Teknik içerik kontrolü. Arama sırası değildir.',
    engel,
    uyari,
  };
}

export function otomatikSlug(baslik: string, elle: boolean, mevcut: string): string {
  if (elle) return mevcut;
  return slugYap(baslik);
}
