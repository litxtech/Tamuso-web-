/**
 * Expo tek sayfa dışa aktarır; her adres aynı HTML ve aynı canonical döner.
 * Google bu yüzden tek sayfa sayar. Herkese açık yollara kendi başlığı yazılır.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sayfaIcerigi } from './seo-metin.mjs';

const ORIGIN = 'https://www.tamuso.com';
const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = process.env.SEO_DIST
  ? path.resolve(process.env.SEO_DIST)
  : path.join(kok, 'dist');
const sablonYol = path.join(dist, 'index.html');
const sayfalar = JSON.parse(
  fs.readFileSync(path.join(kok, 'src', 'moduller', 'web-tanitim', 'seoSayfalari.json'), 'utf8'),
);

function attr(deger) {
  return deger
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function uygula(html, sayfa) {
  const url = `${ORIGIN}${sayfa.yol === '/' ? '/' : sayfa.yol}`;
  let out = html;
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${attr(sayfa.title)}</title>`);
  out = out.replace(
    /(<meta name="description" content=")[^"]*(")/,
    `$1${attr(sayfa.description)}$2`,
  );
  out = out.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`);
  out = out.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`);
  out = out.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${attr(sayfa.title)}$2`);
  out = out.replace(
    /(<meta property="og:description" content=")[^"]*(")/,
    `$1${attr(sayfa.description)}$2`,
  );
  out = out.replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${attr(sayfa.title)}$2`);
  out = out.replace(
    /(<meta name="twitter:description" content=")[^"]*(")/,
    `$1${attr(sayfa.description)}$2`,
  );
  out = out.replace(/href="https:\/\/www\.tamuso\.com\/" hreflang=/g, `href="${url}" hreflang=`);
  const webPage = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: sayfa.title,
    description: sayfa.description,
    url,
    inLanguage: 'tr',
    isPartOf: { '@type': 'WebSite', name: 'Tamuso', url: `${ORIGIN}/` },
  });
  if (!out.includes('"@type":"WebPage"') && !out.includes('"@type": "WebPage"')) {
    out = out.replace(
      '</head>',
      `    <script type="application/ld+json">${webPage}</script>\n  </head>`,
    );
  }
  out = out.replace(
    /<noscript>[\s\S]*?<\/noscript>/,
    `<noscript><h1>${attr(sayfa.title)}</h1><p>${attr(sayfa.description)}</p></noscript>`,
  );
  const statik = sayfaIcerigi(sayfa.yol);
  if (statik.length < 400 || !statik.includes('<h1>')) {
    console.error(`seo: içerik kısa ${sayfa.yol}`);
    process.exit(1);
  }
  const govde = `<style id="tamuso-statik-stil">#root{position:fixed;inset:0;z-index:2}#root:empty{background:transparent;pointer-events:none}#root:not(:empty){background:#07060d}#tamuso-statik{position:relative;z-index:0;max-width:42rem;margin:0 auto;padding:24px 16px 64px;color:#f4f1ea;font:16px/1.55 Georgia,serif}#tamuso-statik a{color:#f4f1ea}#tamuso-statik pre{white-space:pre-wrap;font:16px/1.55 Georgia,serif}</style><main id="tamuso-statik">${statik}</main>`;
  if (out.includes('id="tamuso-statik"')) {
    out = out.replace(/<style id="tamuso-statik-stil">[\s\S]*?<\/main>/, govde);
  } else {
    out = out.replace('<body>', `<body>${govde}`);
  }
  if (!out.includes('rel="sitemap"')) {
    out = out.replace(
      '<link rel="canonical"',
      '<link rel="sitemap" type="application/xml" title="Sitemap" href="https://www.tamuso.com/sitemap.xml" />\n    <link rel="canonical"',
    );
  }
  return out;
}

if (!fs.existsSync(sablonYol)) {
  console.error('seo: dist/index.html yok');
  process.exit(1);
}

const acikYollar = sayfalar.map((s) => (s.yol === '/' ? '/' : s.yol.replace(/\/+$/, '')));
const indexScript = `<script id="tamuso-index">(function(){var acik=${JSON.stringify(acikYollar)};var yol=(location.pathname||"/").replace(/\\/+$/,"")||"/";if(acik.indexOf(yol)!==-1)return;var m=document.querySelector('meta[name="robots"]');if(m)m.setAttribute("content","noindex, nofollow");})();</script>`;

let sablon = fs.readFileSync(sablonYol, 'utf8');
if (sablon.includes('id="tamuso-index"')) {
  sablon = sablon.replace(/<script id="tamuso-index">[\s\S]*?<\/script>/, indexScript);
} else {
  sablon = sablon.replace('</head>', `    ${indexScript}\n  </head>`);
}
for (const sayfa of sayfalar) {
  const html = uygula(sablon, sayfa);
  if (!html.includes(`<title>${attr(sayfa.title)}</title>`)) {
    console.error(`seo: başlık yazılamadı ${sayfa.yol}`);
    process.exit(1);
  }
  if (sayfa.yol === '/') {
    fs.writeFileSync(sablonYol, html);
    continue;
  }
  const dizin = path.join(dist, ...sayfa.yol.split('/').filter(Boolean));
  fs.mkdirSync(dizin, { recursive: true });
  fs.writeFileSync(path.join(dizin, 'index.html'), html);
}

async function anasayfaBlog() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !fs.existsSync(sablonYol)) return;
  const kontrol = new AbortController();
  const zaman = setTimeout(() => kontrol.abort(), 8000);
  try {
    const res = await fetch(
      `${url}/rest/v1/blog_posts?select=title,slug,language_code&language_code=eq.tr&status=in.(yayinda,planlandi)&published_at=lte.${encodeURIComponent(new Date().toISOString())}&order=published_at.desc&limit=6`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: kontrol.signal,
      },
    );
    const rows = res.ok ? await res.json() : [];
    const liste = Array.isArray(rows) ? rows : [];
    const kartlar = liste
      .slice(0, 6)
      .filter((r) => r.slug && r.title)
      .map((r) => `<li><a href="/blog/${attr(r.slug)}">${attr(r.title)}</a></li>`)
      .join('');
    if (!kartlar || !fs.existsSync(sablonYol)) return;
    const blok = `<section><h2>Tamuso’dan son yazılar</h2><ul>${kartlar}</ul><p><a href="/blog">Blog</a></p></section>`;
    const html = fs.readFileSync(sablonYol, 'utf8').replace('</main>', `${blok}</main>`);
    fs.writeFileSync(sablonYol, html);
  } catch {
    /* Ana sayfa teaser'ı düşerse site derlemesi sürer. Blog listesi API'den gelir. */
  } finally {
    clearTimeout(zaman);
  }
}

await anasayfaBlog();
console.log(`seo: ${sayfalar.length} herkese açık sayfa`);
