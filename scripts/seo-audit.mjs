/**
 * Yerel site haritası ve, varsa, web dışa aktarımındaki herkese açık HTML.
 * Ağ çağrısı yapmaz. Çalıştır: npm run seo:audit
 *
 * Birincil host www.tamuso.com olmalı. Apex 308 ile oraya gider;
 * haritaya https://tamuso.com yazmak yönlendirme hatasıdır.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = 'https://www.tamuso.com';
const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hatalar = [];
const notlar = [];

function hata(metin) {
  hatalar.push(metin);
}

const sitemapYol = path.join(kok, 'public', 'sitemap.xml');
const robotsYol = path.join(kok, 'public', 'robots.txt');
const kayitYol = path.join(kok, 'src', 'moduller', 'web-tanitim', 'seoSayfalari.json');

if (!fs.existsSync(sitemapYol)) hata('public/sitemap.xml yok');
if (!fs.existsSync(robotsYol)) hata('public/robots.txt yok');

const robots = fs.existsSync(robotsYol) ? fs.readFileSync(robotsYol, 'utf8') : '';
if (/^disallow:\s*\/\s*$/im.test(robots)) hata('robots.txt tüm siteyi kapatıyor');
if (!robots.includes(`Sitemap: ${ORIGIN}/sitemap.xml`)) {
  hata(`robots.txt site haritası ${ORIGIN}/sitemap.xml değil`);
}
if (/localhost|127\.0\.0\.1/i.test(robots)) hata('robots.txt localhost içeriyor');

const xml = fs.existsSync(sitemapYol) ? fs.readFileSync(sitemapYol, 'utf8') : '';
if (xml && !xml.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) {
  hata('sitemap xmlns eksik');
}
const loclar = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (loclar.length === 0) hata('sitemap boş');

const gorulen = new Set();
const ozel = /\/(admin|login|register|forgot-password|reset-password|dogrula-kod|dashboard|wallet|messages|kyc)(\/|$)/;
for (const loc of loclar) {
  if (gorulen.has(loc)) hata(`tekrar eden URL ${loc}`);
  gorulen.add(loc);
  if (!loc.startsWith(`${ORIGIN}/`) && loc !== `${ORIGIN}/`) hata(`yanlış host ${loc}`);
  if (loc.startsWith('http://')) hata(`http URL ${loc}`);
  if (/localhost|127\.0\.0\.1/i.test(loc)) hata(`localhost ${loc}`);
  if (loc.includes('://tamuso.com')) hata(`yönlendiren apex URL ${loc}`);
  if (ozel.test(new URL(loc).pathname)) hata(`özel yol site haritasında ${loc}`);
}

const sayfalar = JSON.parse(fs.readFileSync(kayitYol, 'utf8'));
const basliklar = new Set();
for (const sayfa of sayfalar) {
  if (!sayfa.title) hata(`başlık yok ${sayfa.yol}`);
  if (!sayfa.description) hata(`açıklama yok ${sayfa.yol}`);
  if (basliklar.has(sayfa.title)) hata(`aynı başlık ${sayfa.title}`);
  basliklar.add(sayfa.title);
  const beklenen = `${ORIGIN}${sayfa.yol === '/' ? '/' : sayfa.yol}`;
  if (!loclar.includes(beklenen)) hata(`haritada yok ${beklenen}`);
}

const dist = path.join(kok, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) {
  notlar.push('dist/index.html yok; HTML canonical kontrolü atlandı. npm run export:web sonrası tekrar çalıştır.');
} else {
  for (const sayfa of sayfalar) {
    const dosya =
      sayfa.yol === '/'
        ? path.join(dist, 'index.html')
        : path.join(dist, ...sayfa.yol.split('/').filter(Boolean), 'index.html');
    if (!fs.existsSync(dosya)) {
      hata(`HTML yok ${sayfa.yol}`);
      continue;
    }
    const html = fs.readFileSync(dosya, 'utf8');
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/);
    const title = html.match(/<title>([^<]*)<\/title>/);
    const desc = html.match(/<meta name="description" content="([^"]*)"/);
    const robotsMeta = html.match(/<meta name="robots" content="([^"]+)"/);
    const beklenen = `${ORIGIN}${sayfa.yol === '/' ? '/' : sayfa.yol}`;
    if (!canonical || canonical[1] !== beklenen) hata(`canonical uyuşmuyor ${sayfa.yol}`);
    if (!title || !title[1].trim()) hata(`title yok ${sayfa.yol}`);
    if (!desc || !desc[1].trim()) hata(`description yok ${sayfa.yol}`);
    if (robotsMeta && /noindex/i.test(robotsMeta[1])) hata(`public sayfa noindex ${sayfa.yol}`);
    if (!/<noscript><h1>/.test(html)) hata(`H1 yok ${sayfa.yol}`);
    const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    if (ld.length === 0) hata(`JSON-LD yok ${sayfa.yol}`);
    for (const blok of ld) {
      try {
        JSON.parse(blok[1]);
      } catch {
        hata(`JSON-LD bozuk ${sayfa.yol}`);
      }
    }
  }
}

if (hatalar.length) {
  console.error(`seo:audit ${hatalar.length} hata`);
  for (const satir of hatalar) console.error(`- ${satir}`);
  for (const satir of notlar) console.log(`- ${satir}`);
  process.exit(1);
}

console.log(`seo:audit tamam (${loclar.length} URL)`);
for (const satir of notlar) console.log(`- ${satir}`);
