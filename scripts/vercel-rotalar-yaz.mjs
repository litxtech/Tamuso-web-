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

const yollar = [...new Set(yuru(appDizin))].sort((a, b) => b.length - a.length || a.localeCompare(b));
const rewrites = yollar.map((source) => ({ source, destination: '/index.html' }));
const vercel = JSON.parse(fs.readFileSync(vercelYol, 'utf8'));
vercel.rewrites = rewrites;
fs.writeFileSync(vercelYol, `${JSON.stringify(vercel, null, 2)}\n`);
console.log(`rotalar: ${rewrites.length} bilinen yol, diğerleri 404`);
