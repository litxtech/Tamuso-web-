/**
 * app/ altındaki gerçek sayfaları https://tamuso.com/sitemap.xml dosyasına yazar.
 * Köşeli parantezli dinamik rotalar (oda, kullanıcı) kimliksiz olduğu için girmez.
 * Yönetim paneli robots.txt ile kapalı olduğu için girmez.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = 'https://tamuso.com';
const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appDizin = path.join(kok, 'app');
const cikti = path.join(kok, 'public', 'sitemap.xml');
const sayfaUzantisi = /\.(tsx|ts|jsx|js)$/;

function sayfaMi(ad) {
  if (!sayfaUzantisi.test(ad)) return false;
  const govde = ad.replace(sayfaUzantisi, '');
  if (govde.startsWith('_') || govde.startsWith('+')) return false;
  return true;
}

function urlYap(goreli) {
  const parcalar = goreli.split(path.sep);
  const dosya = parcalar.pop().replace(sayfaUzantisi, '');
  const segmentler = [];
  for (const parca of parcalar) {
    if (parca.startsWith('(') && parca.endsWith(')')) continue;
    if (parca === 'admin' || parca.includes('[')) return null;
    segmentler.push(parca);
  }
  if (dosya.includes('[')) return null;
  if (dosya !== 'index') segmentler.push(dosya);
  if (segmentler.length === 0) return '/';
  return `/${segmentler.join('/')}`;
}

function oncelik(url) {
  if (url === '/') return { priority: '1.0', changefreq: 'daily' };
  const derinlik = url.split('/').filter(Boolean).length;
  if (derinlik === 1) return { priority: '0.8', changefreq: 'weekly' };
  if (derinlik === 2) return { priority: '0.6', changefreq: 'weekly' };
  return { priority: '0.4', changefreq: 'monthly' };
}

function yuru(dizin, goreli = '') {
  const bulunan = [];
  for (const ad of fs.readdirSync(dizin)) {
    const tam = path.join(dizin, ad);
    const bilgi = fs.statSync(tam);
    const sonraki = goreli ? path.join(goreli, ad) : ad;
    if (bilgi.isDirectory()) {
      if (ad === 'admin') continue;
      bulunan.push(...yuru(tam, sonraki));
      continue;
    }
    if (!sayfaMi(ad)) continue;
    const url = urlYap(sonraki);
    if (!url) continue;
    bulunan.push({ url, mtime: bilgi.mtime });
  }
  return bulunan;
}

const tekil = new Map();
for (const sayfa of yuru(appDizin)) {
  const onceki = tekil.get(sayfa.url);
  if (!onceki || sayfa.mtime > onceki.mtime) tekil.set(sayfa.url, sayfa);
}

const sirali = [...tekil.values()].sort((a, b) => a.url.localeCompare(b.url));
const govde = sirali
  .map((sayfa) => {
    const { priority, changefreq } = oncelik(sayfa.url);
    const lastmod = sayfa.mtime.toISOString().slice(0, 10);
    return [
      '  <url>',
      `    <loc>${ORIGIN}${sayfa.url === '/' ? '/' : sayfa.url}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      `    <changefreq>${changefreq}</changefreq>`,
      `    <priority>${priority}</priority>`,
      '  </url>',
    ].join('\n');
  })
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${govde}\n</urlset>\n`;
fs.mkdirSync(path.dirname(cikti), { recursive: true });
fs.writeFileSync(cikti, xml);
console.log(`sitemap: ${sirali.length} sayfa -> ${cikti}`);
