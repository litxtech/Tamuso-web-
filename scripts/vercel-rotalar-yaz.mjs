/**
 * Bilinen uygulama yollarını Vercel rewrite listesine yazar.
 * Listede olmayan adres dosya da değilse 404.html ile 404 döner.
 * Herkese açık SEO sayfaları dist içinde kendi HTML dosyasıdır; dosya rewrite'dan önce gelir.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appDizin = path.join(kok, 'app');
const vercelYol = path.join(kok, 'vercel.json');

function parca(ad) {
  const tum = ad.match(/^\[\.\.\.(.+)\]$/);
  if (tum) return `:${tum[1]}*`;
  const tek = ad.match(/^\[(.+)\]$/);
  if (tek) return `:${tek[1]}`;
  return ad;
}

function yolYap(goreli) {
  const parcalar = goreli.split(path.sep);
  const dosya = parcalar.pop();
  if (!/\.(tsx|ts|jsx|js)$/.test(dosya)) return null;
  const govde = dosya.replace(/\.(tsx|ts|jsx|js)$/, '');
  if (govde.startsWith('_') || govde.startsWith('+')) return null;
  const segmentler = [];
  for (const p of parcalar) {
    if (p.startsWith('_') || p.startsWith('+')) return null;
    if (p.startsWith('(') && p.endsWith(')')) continue;
    segmentler.push(parca(p));
  }
  if (govde === 'index') {
    /* klasör index */
  } else if (goreli.replace(/\\/g, '/') === 'politika/[kod].tsx') {
    return null;
  } else {
    segmentler.push(parca(govde));
  }
  return `/${segmentler.join('/')}`;
}

function yuru(dizin, goreli = '') {
  const bulunan = [];
  for (const ad of fs.readdirSync(dizin)) {
    const tam = path.join(dizin, ad);
    const sonraki = goreli ? path.join(goreli, ad) : ad;
    if (fs.statSync(tam).isDirectory()) {
      bulunan.push(...yuru(tam, sonraki));
      continue;
    }
    const yol = yolYap(sonraki);
    if (yol && yol !== '/') bulunan.push(yol);
  }
  return bulunan;
}

const SABIT = [
  { source: '/sitemap-blog.xml', destination: '/api/sitemap-blog' },
  { source: '/sitemap-posts.xml', destination: '/api/sitemap-public?tur=posts' },
  { source: '/sitemap-posts-:sayfa.xml', destination: '/api/sitemap-public?tur=posts&sayfa=:sayfa' },
  { source: '/sitemap-profiles.xml', destination: '/api/sitemap-public?tur=profiles' },
  { source: '/sitemap-profiles-:sayfa.xml', destination: '/api/sitemap-public?tur=profiles&sayfa=:sayfa' },
  { source: '/sitemap-cities.xml', destination: '/api/sitemap-public?tur=cities' },
  { source: '/sitemap-topics.xml', destination: '/api/sitemap-public?tur=topics' },
  { source: '/sitemap-agencies.xml', destination: '/api/sitemap-public?tur=agencies' },
  { source: '/blog', destination: '/api/blog-yol' },
  { source: '/en/blog', destination: '/api/blog-yol?lang=en' },
  { source: '/de/blog', destination: '/api/blog-yol?lang=de' },
  { source: '/es/blog', destination: '/api/blog-yol?lang=es' },
  { source: '/ar/blog', destination: '/api/blog-yol?lang=ar' },
  { source: '/ru/blog', destination: '/api/blog-yol?lang=ru' },
  { source: '/yazar/:slug', destination: '/api/blog-yol?yazar=:slug' },
  { source: '/blog/:slug', destination: '/api/blog-yol?slug=:slug' },
  { source: '/en/blog/:slug', destination: '/api/blog-yol?lang=en&slug=:slug' },
  { source: '/de/blog/:slug', destination: '/api/blog-yol?lang=de&slug=:slug' },
  { source: '/es/blog/:slug', destination: '/api/blog-yol?lang=es&slug=:slug' },
  { source: '/ar/blog/:slug', destination: '/api/blog-yol?lang=ar&slug=:slug' },
  { source: '/ru/blog/:slug', destination: '/api/blog-yol?lang=ru&slug=:slug' },
  { source: '/p/:slug', destination: '/api/public-icerik?tur=post&slug=:slug' },
  { source: '/u/:username', destination: '/api/public-icerik?tur=profile&slug=:username' },
  { source: '/city/:slug/posts', destination: '/api/public-icerik?tur=city_posts&slug=:slug' },
  { source: '/city/:slug', destination: '/api/public-icerik?tur=city&slug=:slug' },
  { source: '/hashtag/:tag', destination: '/api/public-icerik?tur=hashtag&slug=:tag' },
  { source: '/topics/:slug', destination: '/api/public-icerik?tur=topic&slug=:slug' },
  { source: '/discover', destination: '/api/public-icerik?tur=discover' },
  { source: '/people', destination: '/api/public-icerik?tur=people' },
  { source: '/ajanslar', destination: '/api/public-icerik?tur=agencies' },
  { source: '/ajans-profil/:slug', destination: '/api/public-icerik?tur=agency&slug=:slug' },
];
const sabitKaynak = new Set(SABIT.map((r) => r.source));
const yollar = [...new Set(yuru(appDizin))]
  .filter((yol) => yol === '/blog' || !yol.startsWith('/blog/'))
  .filter((yol) => !sabitKaynak.has(yol))
  .sort((a, b) => b.length - a.length || a.localeCompare(b));
const rewrites = [
  ...SABIT,
  ...yollar.map((source) => ({ source, destination: '/index.html' })),
];
const vercel = JSON.parse(fs.readFileSync(vercelYol, 'utf8'));
vercel.rewrites = rewrites;
fs.writeFileSync(vercelYol, `${JSON.stringify(vercel, null, 2)}\n`);
console.log(`rotalar: ${rewrites.length} bilinen yol, diğerleri 404`);
