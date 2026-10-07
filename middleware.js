/**
 * Blog belgesi ve site haritası, dosya sisteminden önce üretilir.
 * Böylece yeni yazı yeniden derleme beklemeden ilk HTML'de yer alır.
 * Statik tanıtım sayfaları aynı site haritasının içinde kalır.
 */
import sayfalar from './src/moduller/web-tanitim/seoSayfalari.json' with { type: 'json' };
import {
  ORIGIN,
  SAYFA_BOYUTU,
  bulunamadiBelgesi,
  listeBelgesi,
  siteHaritasi,
  yaziBelgesi,
  ilgiliYazilar,
} from './scripts/blog-motor.mjs';

export const config = {
  matcher: ['/sitemap.xml', '/blog', '/blog/:path*'],
};

function env() {
  return {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    key: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  };
}

async function rest(yol) {
  const { url, key } = env();
  if (!url || !key) return { ok: false, status: 0, json: null, toplam: 0 };
  const res = await fetch(`${url}/rest/v1/${yol}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      Prefer: 'count=exact',
    },
  });
  const toplam = Number((res.headers.get('content-range') || '').split('/')[1] || 0);
  const json = res.ok ? await res.json() : null;
  return { ok: res.ok, status: res.status, json, toplam };
}

function sekil(row) {
  if (!row) return null;
  return {
    ...row,
    kategori: row.blog_categories || null,
    etiketler: (row.blog_post_tags || []).map((t) => t.blog_tags).filter(Boolean),
    sehirler: row.blog_post_cities || [],
    faqs: [...(row.blog_faqs || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
  };
}

function gorunur() {
  return `status=in.(yayinda,planlandi)&published_at=lte.${encodeURIComponent(new Date().toISOString())}`;
}
const KART = 'title,slug,excerpt,cover_image_url,cover_image_alt,published_at,updated_at,featured,robots_index,author_name,seo_title,meta_description,canonical_url,og_image_url,blog_categories(name,slug),blog_post_cities(city_id,city_name)';

function html(govde, status, ekstra) {
  return new Response(govde, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=120',
      ...(status === 404 ? { 'x-robots-tag': 'noindex' } : {}),
      ...ekstra,
    },
  });
}

async function yonlen(slug, derinlik = 0) {
  if (!slug || derinlik > 4) return '';
  const sorgu = await rest(`blog_redirects?from_slug=eq.${encodeURIComponent(slug)}&select=to_slug&limit=1`);
  const hedef = sorgu.json?.[0]?.to_slug;
  if (!hedef || hedef === slug) return '';
  const ote = await yonlen(hedef, derinlik + 1);
  return ote || hedef;
}

async function yaziGetir(slug) {
  const sec = `${KART},content_html,author_bio,blog_faqs(question,answer,sort_order),blog_post_tags(blog_tags(name,slug)),blog_post_cities(city_id,city_name,city_slug)`;
  const sorgu = await rest(
    `blog_posts?select=${sec}&slug=eq.${encodeURIComponent(slug)}&${gorunur()}&limit=1`,
  );
  return sekil(sorgu.json?.[0]);
}

export default async function middleware(istek) {
  const url = new URL(istek.url);
  const yol = url.pathname.replace(/\/+$/, '') || '/';
  try {
    if (yol === '/sitemap.xml') return await siteHaritasiYaniti();
    if (yol === '/blog' || yol.startsWith('/blog/')) return await blogYaniti(yol, url.searchParams);
  } catch {
    if (yol === '/sitemap.xml') return statikHarita();
    return html(bulunamadiBelgesi(), 503);
  }
  return html(bulunamadiBelgesi(), 404);
}

function statikHarita() {
  const xml = siteHaritasi(sayfalar, [], [], [], 1);
  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=300',
    },
  });
}

async function siteHaritasiYaniti() {
  const yazilar = [];
  for (let ofset = 0; ofset < 20000; ofset += 1000) {
    const sorgu = await rest(
      `blog_posts?select=slug,updated_at,published_at,robots_index&${gorunur()}&robots_index=eq.true&order=published_at.desc&limit=1000&offset=${ofset}`,
    );
    const dilim = sorgu.json || [];
    yazilar.push(...dilim);
    if (dilim.length < 1000) break;
  }
  const kat = await rest(
    `blog_posts?select=category_id,blog_categories!inner(name,slug)&${gorunur()}&blog_categories.slug=not.is.null&limit=1000`,
  );
  const sayac = new Map();
  for (const row of kat.json || []) {
    const slug = row.blog_categories?.slug;
    if (!slug) continue;
    sayac.set(slug, (sayac.get(slug) || 0) + 1);
  }
  const et = await rest(
    `blog_post_tags?select=tag_id,blog_tags!inner(slug),blog_posts!inner(status,published_at)&blog_posts.status=in.(yayinda,planlandi)&blog_posts.published_at=lte.${encodeURIComponent(new Date().toISOString())}&limit=5000`,
  );
  const ayar = await rest('blog_settings?select=tag_index_min&id=eq.1&limit=1');
  const etiketEsik = Number(ayar.json?.[0]?.tag_index_min || 3);
  const etiketSayac = new Map();
  for (const row of et.json || []) {
    const slug = row.blog_tags?.slug;
    if (!slug) continue;
    etiketSayac.set(slug, (etiketSayac.get(slug) || 0) + 1);
  }
  const toplamYazi = yazilar.length;
  const sayfaSayisi = Math.max(1, Math.ceil(toplamYazi / SAYFA_BOYUTU));
  const xml = siteHaritasi(
    sayfalar,
    yazilar,
    [...sayac.entries()].map(([slug, adet]) => ({ slug, adet })),
    [...etiketSayac.entries()].filter(([, adet]) => adet >= etiketEsik).map(([slug, adet]) => ({ slug, adet })),
    sayfaSayisi,
  );
  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=120',
    },
  });
}

async function blogYaniti(yol, params) {
  const parca = yol.split('/').filter(Boolean).slice(1);
  if (parca[0] === 'ara') {
    const q = String(params.get('q') || '').replace(/[%*,]/g, ' ').trim().slice(0, 60);
    const filtre = q ? `&or=(title.ilike.*${encodeURIComponent(q)}*,excerpt.ilike.*${encodeURIComponent(q)}*)` : '';
    const sorgu = await rest(`blog_posts?select=${KART}&${gorunur()}${filtre}&order=published_at.desc&limit=20`);
    const yazilar = (sorgu.json || []).map(sekil);
    const govde = listeBelgesi({
      yazilar,
      sayfa: 1,
      sayfaSayisi: 1,
      baslik: q ? `Arama: ${q}` : 'Blog araması',
      aciklama: 'Blog arama sonuçları.',
      canonical: `${ORIGIN}/blog/ara`,
      robots: 'noindex,follow',
      giris: q ? `“${q}” için bulunan yazılar.` : 'Bir kelime yazın.',
    });
    return html(govde, 200);
  }
  if (parca[0] === 'kategori' && parca[1]) {
    const slug = parca[1];
    const sayfa = parca[2] === 'sayfa' ? Number(parca[3] || 1) : 1;
    const ofset = (Math.max(1, sayfa) - 1) * SAYFA_BOYUTU;
    const sorgu = await rest(
      `blog_posts?select=${KART},blog_categories!inner(name,slug)&${gorunur()}&blog_categories.slug=eq.${encodeURIComponent(slug)}&order=published_at.desc&limit=${SAYFA_BOYUTU}&offset=${ofset}`,
    );
    if (!sorgu.ok) return html(bulunamadiBelgesi(), 404);
    const yazilar = (sorgu.json || []).map(sekil);
    if (!yazilar.length && sayfa === 1) {
      const kat = await rest(`blog_categories?select=name,slug,description,seo_title,meta_description&slug=eq.${encodeURIComponent(slug)}&limit=1`);
      const kategori = kat.json?.[0];
      if (!kategori) return html(bulunamadiBelgesi(), 404);
      return html(listeBelgesi({
        yazilar: [],
        sayfa: 1,
        sayfaSayisi: 1,
        baslik: kategori.seo_title || kategori.name,
        aciklama: kategori.meta_description || kategori.description || kategori.name,
        canonical: `${ORIGIN}/blog/kategori/${slug}`,
        robots: 'noindex,follow',
        giris: kategori.description || kategori.name,
      }), 200);
    }
    if (!yazilar.length) return html(bulunamadiBelgesi(), 404);
    const ad = yazilar[0].kategori?.name || slug;
    const sayfaSayisi = Math.max(1, Math.ceil((sorgu.toplam || yazilar.length) / SAYFA_BOYUTU));
    return html(listeBelgesi({
      yazilar,
      sayfa,
      sayfaSayisi,
      baslik: ad,
      aciklama: `${ad} yazıları.`,
      canonical: sayfa > 1 ? `${ORIGIN}/blog/kategori/${slug}/sayfa/${sayfa}` : `${ORIGIN}/blog/kategori/${slug}`,
      robots: 'index,follow',
      giris: `${ad} kategorisindeki yazılar.`,
    }), 200);
  }
  if (parca[0] === 'etiket' && parca[1]) {
    const slug = parca[1];
    const sorgu = await rest(
      `blog_posts?select=${KART},blog_post_tags!inner(blog_tags!inner(name,slug))&${gorunur()}&blog_post_tags.blog_tags.slug=eq.${encodeURIComponent(slug)}&order=published_at.desc&limit=${SAYFA_BOYUTU}`,
    );
    const yazilar = (sorgu.json || []).map(sekil);
    const adet = sorgu.toplam || yazilar.length;
    const ayar = await rest('blog_settings?select=tag_index_min&id=eq.1&limit=1');
    const etiketEsik = Number(ayar.json?.[0]?.tag_index_min || 3);
    if (!yazilar.length) return html(bulunamadiBelgesi(), 404);
    const ad = yazilar[0].etiketler?.find((e) => e.slug === slug)?.name || slug;
    return html(listeBelgesi({
      yazilar,
      sayfa: 1,
      sayfaSayisi: 1,
      baslik: ad,
      aciklama: `${ad} etiketli yazılar.`,
      canonical: `${ORIGIN}/blog/etiket/${slug}`,
      robots: adet >= etiketEsik ? 'index,follow' : 'noindex,follow',
      giris: `${ad} ile ilgili yazılar.`,
    }), 200);
  }
  if (parca[0] === 'sayfa') {
    const n = Number(parca[1] || 0);
    if (n <= 1) {
      return new Response(null, { status: 301, headers: { Location: `${ORIGIN}/blog` } });
    }
    return listeSayfasi(n);
  }
  if (parca.length === 1) {
    const yazi = await yaziGetir(parca[0]);
    if (!yazi) {
      const hedef = await yonlen(parca[0]);
      if (hedef) {
        return new Response(null, {
          status: 301,
          headers: { Location: `${ORIGIN}/blog/${hedef}`, 'cache-control': 'public, max-age=3600' },
        });
      }
      return html(bulunamadiBelgesi(), 404);
    }
    const aday = await rest(`blog_posts?select=${KART},blog_post_tags(blog_tags(slug)),blog_post_cities(city_id)&${gorunur()}&order=published_at.desc&limit=40`);
    const ilgili = ilgiliYazilar(yazi, (aday.json || []).map(sekil));
    return html(yaziBelgesi(yazi, ilgili), 200);
  }
  if (parca.length === 0) return listeSayfasi(1);
  return html(bulunamadiBelgesi(), 404);
}

async function listeSayfasi(sayfa) {
  const ofset = (sayfa - 1) * SAYFA_BOYUTU;
  const sorgu = await rest(
    `blog_posts?select=${KART}&${gorunur()}&order=featured.desc,published_at.desc&limit=${SAYFA_BOYUTU}&offset=${ofset}`,
  );
  if (!sorgu.ok && !env().url) {
    return html(listeBelgesi({
      yazilar: [],
      sayfa: 1,
      sayfaSayisi: 1,
      baslik: 'Blog',
      aciklama: 'Karadeniz’den sosyal yaşama, şehir rehberlerinden Tamuso dünyasına kadar güncel içerikler.',
      canonical: `${ORIGIN}/blog`,
      robots: 'index,follow',
      giris: 'Karadeniz’den sosyal yaşama, şehir rehberlerinden Tamuso dünyasına kadar güncel içerikler.',
    }), 200);
  }
  const yazilar = (sorgu.json || []).map(sekil);
  const sayfaSayisi = Math.max(1, Math.ceil((sorgu.toplam || 0) / SAYFA_BOYUTU));
  if (sayfa > sayfaSayisi) return html(bulunamadiBelgesi(), 404);
  return html(listeBelgesi({
    yazilar,
    sayfa,
    sayfaSayisi,
    baslik: 'Blog',
    aciklama: 'Karadeniz’den sosyal yaşama, şehir rehberlerinden Tamuso dünyasına kadar güncel içerikler.',
    canonical: sayfa > 1 ? `${ORIGIN}/blog/sayfa/${sayfa}` : `${ORIGIN}/blog`,
    robots: 'index,follow',
    giris: 'Karadeniz’den sosyal yaşama, şehir rehberlerinden Tamuso dünyasına kadar güncel içerikler.',
  }), 200);
}
