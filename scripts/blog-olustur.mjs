/**
 * Statik blog HTML'i dist'ten siler.
 * Liste, yazı ve site haritası API'den gelir; yeni yazı site derlemesi beklemez.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function envYukle() {
  const yol = path.join(kok, '.env');
  if (!fs.existsSync(yol)) return;
  for (const satir of fs.readFileSync(yol, 'utf8').split(/\n/)) {
    const es = satir.replace(/\r$/, '').match(/^([A-Z0-9_]+)=(.*)$/);
    if (!es || process.env[es[1]]) continue;
    process.env[es[1]] = es[2].trim().replace(/^["']|["']$/g, '');
  }
}

envYukle();
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anahtar = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const dist = path.join(kok, 'dist');
for (const yol of ['blog', 'en/blog', 'de/blog', 'es/blog', 'ar/blog', 'ru/blog', 'yazar']) {
  fs.rmSync(path.join(dist, ...yol.split('/')), { recursive: true, force: true });
  fs.rmSync(`${path.join(dist, ...yol.split('/'))}.html`, { force: true });
}

if (!url || !anahtar) {
  console.log('blog: canlı yayın API üzerinden; statik kopya yazılmadı');
  process.exit(0);
}

const simdi = new Date().toISOString();
const sorgu = new URL('/rest/v1/blog_posts', url);
sorgu.searchParams.set('select', 'slug');
sorgu.searchParams.set('status', 'in.(yayinda,planlandi)');
sorgu.searchParams.set('published_at', `lte.${simdi}`);
const yaziYanit = await fetch(sorgu, {
  headers: { apikey: anahtar, authorization: `Bearer ${anahtar}` },
});
if (!yaziYanit.ok) {
  console.log('blog: liste okunamadı, statik kopya yine de silindi');
  process.exit(0);
}
const gelen = await yaziYanit.json();
const adet = Array.isArray(gelen) ? gelen.length : 0;
console.log(`blog: ${adet} yazı canlı API'den yayınlanır, statik HTML yazılmadı`);
