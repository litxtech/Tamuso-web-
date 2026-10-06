/**
 * Expo tek sayfa dışa aktarır; her adres aynı HTML ve aynı canonical döner.
 * Google bu yüzden tek sayfa sayar. Herkese açık yollara kendi başlığı yazılır.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

console.log(`seo: ${sayfalar.length} herkese açık sayfa`);
