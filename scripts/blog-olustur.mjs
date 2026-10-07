/**
 * Yayınlanmış blog HTML'ini dist içine yazar ve site haritasına ekler.
 * Kimlik yoksa site haritasını bozmaz.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { blogKok, blogYolu, indexlenebilirMi, yazarYolu } from './blog-dil.mjs';
import { listeBelgesi, yaziBelgesi } from './blog-motor.mjs';

const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://www.tamuso.com';

function envYukle() {
  const yol = path.join(kok, '.env');
  if (!fs.existsSync(yol)) return;
  for (const satir of fs.readFileSync(yol, 'utf8').split(/\n/)) {
    const es = satir.replace(/\r$/, '').match(/^([A-Z0-9_]+)=(.*)$/);
    if (!es || process.env[es[1]]) continue;
    process.env[es[1]] = es[2].trim().replace(/^["']|["']$/g, '');
  }
}

function yaz(dosya, icerik) {
  fs.mkdirSync(path.dirname(dosya), { recursive: true });
  fs.writeFileSync(dosya, icerik);
}

function haritayaEkle(yollar) {
  const dosyalar = [path.join(kok, 'public', 'sitemap.xml')];
  const dist = path.join(kok, 'dist', 'sitemap.xml');
  if (fs.existsSync(dist)) dosyalar.push(dist);
  for (const dosya of dosyalar) {
    if (!fs.existsSync(dosya)) continue;
    let xml = fs.readFileSync(dosya, 'utf8');
    if (!xml.includes('xmlns:image=')) {
      xml = xml.replace(
        'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"',
      );
    }
    const ek = [];
    for (const yol of yollar) {
      const loc = `${ORIGIN}${yol.yol}`;
      if (xml.includes(`<loc>${loc}</loc>`)) continue;
      const satir = ['  <url>', `    <loc>${loc}</loc>`];
      if (yol.lastmod) satir.push(`    <lastmod>${yol.lastmod}</lastmod>`);
      if (yol.image) {
        satir.push(`    <image:image><image:loc>${yol.image.replace(/&/g, '&amp;')}</image:loc></image:image>`);
      }
      satir.push('    <priority>0.7</priority>', '  </url>');
      ek.push(satir.join('\n'));
    }
    if (ek.length) xml = xml.replace('</urlset>', `${ek.join('\n')}\n</urlset>`);
    fs.writeFileSync(dosya, xml);
  }
}

envYukle();
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anahtar = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const dist = path.join(kok, 'dist');
const kayit = [];

if (!url || !anahtar) {
  fs.writeFileSync(path.join(kok, 'public', 'blog-url-kaydi.json'), '[]\n');
  console.log('blog: supabase anahtarı yok, statik yazı üretilmedi');
  process.exit(0);
}

const basliklar = {
  apikey: anahtar,
  authorization: `Bearer ${anahtar}`,
};
const simdi = new Date().toISOString();
const sorgu = new URL('/rest/v1/blog_posts', url);
sorgu.searchParams.set('select', 'id,title,slug,excerpt,content_html,cover_image_url,cover_image_alt,cover_width,cover_height,language_code,status,published_at,updated_at,seo_title,meta_description,canonical_url,og_title,og_description,og_image_url,twitter_title,twitter_description,twitter_image_url,robots_index,featured,author_name,author_bio,author_avatar_url,gallery,content_group_id,blog_categories(name,slug),blog_faqs(question,answer,sort_order),blog_post_cities(city_id,city_name,city_slug),blog_videos(provider,title,description,thumbnail_url,upload_date,duration_iso,embed_url,content_url),blog_related_pages(href,label),blog_authors(name,slug,kind,bio,avatar_url,avatar_alt)');
sorgu.searchParams.set('status', 'in.(yayinda,planlandi)');
sorgu.searchParams.set('published_at', `lte.${simdi}`);
const dilSorgu = new URL('/rest/v1/blog_languages', url);
dilSorgu.searchParams.set('select', 'code,is_active,is_publishable,locale,dir');
const [yaziYanit, dilYanit] = await Promise.all([
  fetch(sorgu, { headers: basliklar }),
  fetch(dilSorgu, { headers: basliklar }),
]);
if (!yaziYanit.ok || !dilYanit.ok) {
  console.error('blog: liste alınamadı');
  process.exit(1);
}
const diller = await dilYanit.json();
const gelen = await yaziYanit.json();
const yazilar = (Array.isArray(gelen) ? gelen : []).filter((y) => indexlenebilirMi(y, diller.find((d) => d.code === y.language_code)));
const grup = new Map();
for (const yazi of yazilar) {
  const liste = grup.get(yazi.content_group_id) || [];
  liste.push(yazi);
  grup.set(yazi.content_group_id, liste);
}

function hazirla(yazi) {
  return {
    ...yazi,
    kategori: Array.isArray(yazi.blog_categories) ? yazi.blog_categories[0] : yazi.blog_categories,
    faqs: yazi.blog_faqs || [],
    sehirler: yazi.blog_post_cities || [],
    videolar: yazi.blog_videos || [],
    sayfalar: yazi.blog_related_pages || [],
    yazar: Array.isArray(yazi.blog_authors) ? yazi.blog_authors[0] : yazi.blog_authors,
    surumler: (grup.get(yazi.content_group_id) || []).map((s) => ({ ...s, robots_index: s.robots_index })),
    diller,
  };
}

if (fs.existsSync(dist)) {
  const trListe = yazilar.filter((y) => (y.language_code || 'tr') === 'tr');
  const giris = 'Tamuso blogu, Karadeniz’de yeni insanlarla tanışmayı, şehirlerdeki sosyal hayatı ve uygulamadaki yayın, sohbet ile etkinlik özelliklerini günlük dille anlatır. Yazılar önce Türkçe yayınlanır. İngilizce, Almanca, İspanyolca, Arapça ve Rusça sürümler ancak editör kontrolünden sonra kendi adreslerinde açılır. Çevirisi hazır olmayan bir dil için boş sayfa üretilmez. Her yazının kendi adresi, başlığı, açıklaması, kapak görseli ve yazarı vardır.';
  yaz(path.join(dist, 'blog', 'index.html'), listeBelgesi({
    yazilar: trListe.map(hazirla),
    sayfa: 1,
    sayfaSayisi: 1,
    baslik: 'Blog',
    aciklama: 'Karadeniz’den sosyal yaşama, şehir rehberlerinden Tamuso dünyasına kadar güncel içerikler.',
    canonical: `${ORIGIN}/blog`,
    robots: 'index,follow',
    giris,
  }));
  kayit.push({ yol: '/blog', lastmod: '' });
  for (const [kod, adet] of [['en', 0], ['de', 0], ['es', 0], ['ar', 0], ['ru', 0]]) {
    const liste = yazilar.filter((y) => y.language_code === kod);
    if (!liste.length) continue;
    if (!diller.find((d) => d.code === kod && d.is_active)) continue;
    yaz(path.join(dist, kod, 'blog', 'index.html'), listeBelgesi({
      yazilar: liste.map(hazirla),
      sayfa: 1,
      sayfaSayisi: 1,
      baslik: 'Blog',
      aciklama: adet ? '' : 'Tamuso blog.',
      canonical: `${ORIGIN}${blogKok(kod)}`,
      robots: 'index,follow',
      giris: 'Tamuso blog.',
    }));
    kayit.push({ yol: blogKok(kod), lastmod: '' });
  }
  for (const yazi of yazilar) {
    const belge = yaziBelgesi(hazirla(yazi), yazilar.filter((d) => d.language_code === yazi.language_code && d.slug !== yazi.slug).slice(0, 4).map(hazirla));
    const parca = blogYolu(yazi.language_code, yazi.slug).split('/').filter(Boolean);
    yaz(path.join(dist, ...parca, 'index.html'), belge);
    kayit.push({
      yol: blogYolu(yazi.language_code, yazi.slug),
      lastmod: String(yazi.updated_at || yazi.published_at || '').slice(0, 10),
      image: yazi.cover_image_url || '',
    });
  }
  const yazarlar = new Map();
  for (const yazi of yazilar) {
    const yazar = Array.isArray(yazi.blog_authors) ? yazi.blog_authors[0] : yazi.blog_authors;
    if (!yazar?.slug) continue;
    const liste = yazarlar.get(yazar.slug) || { yazar, yazilar: [] };
    liste.yazilar.push(yazi);
    yazarlar.set(yazar.slug, liste);
  }
  for (const { yazar, yazilar: liste } of yazarlar.values()) {
    const yol = yazarYolu(yazar.slug);
    const html = listeBelgesi({
      yazilar: liste.map(hazirla),
      sayfa: 1,
      sayfaSayisi: 1,
      baslik: yazar.name,
      aciklama: yazar.bio || yazar.name,
      canonical: `${ORIGIN}${yol}`,
      robots: 'index,follow',
      giris: yazar.bio || '',
    });
    yaz(path.join(dist, ...yol.split('/').filter(Boolean), 'index.html'), html);
    kayit.push({ yol, lastmod: '' });
  }
}

fs.writeFileSync(path.join(kok, 'public', 'blog-url-kaydi.json'), `${JSON.stringify(kayit, null, 2)}\n`);
haritayaEkle(kayit.filter((y) => y.yol));
console.log(`blog: ${yazilar.length} yazı, ${kayit.length} adres`);
