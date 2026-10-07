/**
 * Herkese açık sayfaları https://www.tamuso.com/sitemap.xml dosyasına yazar.
 *
 * Vercel birincil alan adı www.tamuso.com.
 * https://tamuso.com 308 ile www adresine gider.
 * Site haritasına apex yazmak her adresi yönlendirme yapar; Google bunları düşürür.
 * Birincil alan adı panelden apex yapılırsa ORIGIN tek yerden değişir.
 *
 * Kaynak: src/moduller/web-tanitim/seoSayfalari.json
 * Giriş, yönetim, cüzdan ve özel hesap yolları yazılmaz.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = 'https://www.tamuso.com';
const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cikti = path.join(kok, 'public', 'sitemap.xml');
const kayitYol = path.join(kok, 'src', 'moduller', 'web-tanitim', 'seoSayfalari.json');

const YASAK = [
  /^\/admin(\/|$)/,
  /^\/login(\/|$)/,
  /^\/register(\/|$)/,
  /^\/forgot-password(\/|$)/,
  /^\/reset-password(\/|$)/,
  /^\/dogrula-kod(\/|$)/,
  /^\/dashboard(\/|$)/,
  /^\/wallet(\/|$)/,
  /^\/messages(\/|$)/,
  /^\/kyc(\/|$)/,
];

function xmlKacis(deger) {
  return deger
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function gitGunu(dosya) {
  if (!dosya) return '';
  try {
    const cikti = execFileSync('git', ['log', '-1', '--format=%cs', '--', dosya], {
      cwd: kok,
      encoding: 'utf8',
    }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(cikti) ? cikti : '';
  } catch {
    return '';
  }
}

function oncelik(url) {
  if (url === '/') return { priority: '1.0', changefreq: 'weekly' };
  if (url === '/tanitim' || url === '/politika' || url === '/blog') return { priority: '0.8', changefreq: 'weekly' };
  return { priority: '0.6', changefreq: 'monthly' };
}

const sayfalar = JSON.parse(fs.readFileSync(kayitYol, 'utf8'));
const tekil = new Map();

for (const sayfa of sayfalar) {
  const yol = sayfa.yol;
  if (typeof yol !== 'string' || !yol.startsWith('/')) {
    console.error(`sitemap: geçersiz yol ${yol}`);
    process.exit(1);
  }
  if (YASAK.some((kural) => kural.test(yol))) {
    console.error(`sitemap: özel yol yazılamaz ${yol}`);
    process.exit(1);
  }
  if (tekil.has(yol)) {
    console.error(`sitemap: tekrar eden yol ${yol}`);
    process.exit(1);
  }
  if (!sayfa.title || !sayfa.description) {
    console.error(`sitemap: başlık veya açıklama yok ${yol}`);
    process.exit(1);
  }
  tekil.set(yol, { ...sayfa, gun: gitGunu(sayfa.kaynak) });
}

if (!tekil.has('/blog')) {
  tekil.set('/blog', {
    yol: '/blog',
    title: 'Blog | Tamuso',
    description: 'Canlı yayın, ses odaları, hikâye ve Tamuso’nun sosyal özelliklerine dair güncel içerikler.',
    gun: '',
  });
}

const sirali = [...tekil.values()].sort((a, b) => a.yol.localeCompare(b.yol));
const govde = sirali
  .map((sayfa) => {
    const { priority, changefreq } = oncelik(sayfa.yol);
    const loc = xmlKacis(`${ORIGIN}${sayfa.yol === '/' ? '/' : sayfa.yol}`);
    const satirlar = ['  <url>', `    <loc>${loc}</loc>`];
    if (sayfa.gun) satirlar.push(`    <lastmod>${sayfa.gun}</lastmod>`);
    satirlar.push(
      `    <changefreq>${changefreq}</changefreq>`,
      `    <priority>${priority}</priority>`,
      '  </url>',
    );
    return satirlar.join('\n');
  })
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${govde}\n</urlset>\n`;
const kayitYolu = path.join(kok, 'public', 'blog-url-kaydi.json');
let ek = '';
if (fs.existsSync(kayitYolu)) {
  const kayit = JSON.parse(fs.readFileSync(kayitYolu, 'utf8'));
  const satirlar = [];
  for (const yol of kayit) {
    if (!yol?.yol || typeof yol.yol !== 'string') continue;
    const gecerli = yol.yol.startsWith('/blog') || /^\/(en|de|es|ar|ru)\/blog/.test(yol.yol) || yol.yol.startsWith('/yazar/');
    if (!gecerli) continue;
    const loc = `${ORIGIN}${yol.yol}`;
    if (xml.includes(`<loc>${loc}</loc>`) || ek.includes(`<loc>${loc}</loc>`)) continue;
    const satir = ['  <url>', `    <loc>${xmlKacis(loc)}</loc>`];
    if (yol.lastmod) satir.push(`    <lastmod>${xmlKacis(yol.lastmod)}</lastmod>`);
    if (yol.image) satir.push(`    <image:image><image:loc>${xmlKacis(yol.image)}</image:loc></image:image>`);
    satir.push('    <priority>0.7</priority>', '  </url>');
    satirlar.push(satir.join('\n'));
  }
  ek = satirlar.join('\n');
}
const ciktiXml = ek ? xml.replace('</urlset>', `${ek}\n</urlset>`) : xml;
fs.writeFileSync(cikti, ciktiXml);
console.log(`sitemap: ${sirali.length} herkese açık sayfa -> ${cikti}`);
