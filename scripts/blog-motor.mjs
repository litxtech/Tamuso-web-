/**
 * Blog SEO belgesi. Edge middleware ve seo:audit aynı fonksiyonları kullanır.
 * Sahte puan, yorum veya indirme sayısı üretmez.
 */
import {
  ARAYUZ,
  blogKok,
  blogYolu,
  DIL_KAYDI,
  hreflangleri,
  kanonikDil,
  videolariCikar,
  yazarYolu,
} from './blog-dil.mjs';

export const ORIGIN = 'https://www.tamuso.com';
export const SAYFA_BOYUTU = 12;
export const ETIKET_INDEX_ESIK = 3;

const AYRIK = new Set(['kategori', 'etiket', 'ara', 'sayfa', 'onizleme']);

export function slugYap(girdi) {
  const harita = {
    ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i', I: 'i', ö: 'o', Ö: 'o',
    ş: 's', Ş: 's', ü: 'u', Ü: 'u', â: 'a', Â: 'a', î: 'i', û: 'u',
  };
  let s = [...String(girdi ?? '')].map((ch) => harita[ch] ?? ch).join('');
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  s = s.replace(/[''`’‘]/g, '');
  s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
  s = s.slice(0, 80).replace(/-+$/g, '');
  if (!s || AYRIK.has(s)) return '';
  return s;
}

export function kacis(deger) {
  return String(deger ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function duzMetin(html) {
  return String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function seoBaslik(baslik, ozel) {
  const elle = String(ozel ?? '').trim();
  if (elle) return elle;
  const ham = String(baslik ?? '').trim();
  if (!ham) return 'Tamuso';
  if (/tamuso\s*$/i.test(ham)) return ham;
  return `${ham} | Tamuso`;
}

export function baslikDurumu(metin) {
  const n = [...String(metin ?? '')].length;
  if (n < 45) return 'kisa';
  if (n <= 60) return 'ideal';
  return 'uzun';
}

export function aciklamaOlustur(ozel, excerpt, html) {
  const elle = String(ozel ?? '').trim();
  if (elle) return elle.slice(0, 180);
  const kaynak = String(excerpt ?? '').trim() || duzMetin(html);
  if (!kaynak) return '';
  if (kaynak.length <= 160) return kaynak;
  const kesik = kaynak.slice(0, 157);
  const bosluk = kesik.lastIndexOf(' ');
  return `${(bosluk > 80 ? kesik.slice(0, bosluk) : kesik).trim()}…`;
}

export function aciklamaDurumu(metin) {
  const n = [...String(metin ?? '')].length;
  if (n < 80) return 'kisa';
  if (n <= 160) return 'ideal';
  return 'uzun';
}

export function okumaDakika(html) {
  const kelime = duzMetin(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(kelime / 180));
}

export function kanonik(slug, ozel, dil = 'tr') {
  return kanonikDil(dil, slug, ozel);
}

export function h1Sayisi(html) {
  return (String(html ?? '').match(/<h1[\s>]/gi) || []).length;
}

export function icerikHazirla(html) {
  let out = String(html ?? '');
  out = out.replace(/<h1(\s[^>]*)?>/gi, '<h2>').replace(/<\/h1>/gi, '</h2>');
  out = out.replace(/<img\b([^>]*?)>/gi, (tum, attrs) => {
    if (/\bloading\s*=/.test(attrs)) return tum;
    return `<img${attrs} loading="lazy">`;
  });
  let n = 0;
  out = out.replace(/<h([23])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi, (_t, seviye, _a, ic) => {
    n += 1;
    const id = `b${n}`;
    return `<h${seviye} id="${id}">${ic}</h${seviye}>`;
  });
  return out;
}

export function icindekiler(html) {
  const hazir = icerikHazirla(html);
  const bulunan = [...hazir.matchAll(/<h([23]) id="(b\d+)">([\s\S]*?)<\/h\1>/gi)];
  return bulunan.map((m) => ({
    seviye: Number(m[1]),
    id: m[2],
    metin: duzMetin(m[3]),
  })).filter((x) => x.metin);
}

export function ilgiliYazilar(yazi, hepsi) {
  const sehir = new Set((yazi.sehirler ?? []).map((s) => s.city_id));
  const etiket = new Set((yazi.etiketler ?? []).map((e) => e.slug));
  const puan = (diger) => {
    if (!diger || diger.slug === yazi.slug) return 0;
    if ((diger.language_code || 'tr') !== (yazi.language_code || 'tr')) return 0;
    let p = 0;
    if ((diger.sehirler ?? []).some((s) => sehir.has(s.city_id))) p += 4;
    if (yazi.kategori?.slug && diger.kategori?.slug === yazi.kategori.slug) p += 3;
    p += (diger.etiketler ?? []).filter((e) => etiket.has(e.slug)).length;
    return p;
  };
  return [...hepsi]
    .map((d) => ({ d, p: puan(d) }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p || String(b.d.published_at).localeCompare(String(a.d.published_at)))
    .slice(0, 3)
    .map((x) => x.d);
}

function jsonLd(veri) {
  return `<script type="application/ld+json">${JSON.stringify(veri).replace(/</g, '\\u003c')}</script>`;
}

function belge({
  title, description, canonical, robots, ogType, image, json, govde,
  lang = 'tr', dir = 'ltr', alternates = [], twitterTitle, twitterDescription, article = null,
}) {
  const ui = ARAYUZ[lang] || ARAYUZ.tr;
  const kok = blogKok(lang);
  const img = image
    ? `<meta property="og:image" content="${kacis(image)}" />\n<meta name="twitter:image" content="${kacis(image)}" />`
    : '';
  const alternatif = alternates
    .map((a) => `<link rel="alternate" hreflang="${kacis(a.hreflang)}" href="${kacis(a.href)}" />`)
    .join('\n');
  const twBaslik = twitterTitle || title;
  const twAcik = twitterDescription || description;
  const zaman = article
    ? `<meta property="article:published_time" content="${kacis(article.published)}" />\n<meta property="article:modified_time" content="${kacis(article.modified)}" />\n<meta property="article:author" content="${kacis(article.author)}" />`
    : '';
  return `<!doctype html>
<html lang="${kacis(lang)}" dir="${kacis(dir)}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${kacis(title)}</title>
<meta name="description" content="${kacis(description)}" />
<link rel="canonical" href="${kacis(canonical)}" />
${alternatif}
<meta name="robots" content="${kacis(robots)}" />
<meta property="og:title" content="${kacis(title)}" />
<meta property="og:description" content="${kacis(description)}" />
<meta property="og:url" content="${kacis(canonical)}" />
<meta property="og:type" content="${kacis(ogType)}" />
<meta property="og:locale" content="${kacis(lang)}" />
<meta property="og:site_name" content="Tamuso" />
${zaman}
<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />
<meta name="twitter:title" content="${kacis(twBaslik)}" />
<meta name="twitter:description" content="${kacis(twAcik)}" />
${img}
<script>
if(/[?&](search|q)=/.test(location.search)){var m=document.querySelector('meta[name="robots"]');if(m)m.setAttribute('content','noindex, follow');}
</script>
${json.map((j) => jsonLd(j)).join('\n')}
<style>
body{margin:0;background:#07060d;color:#f4f1ea;font:17px/1.65 Georgia,serif}
a{color:#f3d7a1}
header,footer{max-width:46rem;margin:0 auto;padding:20px 16px;display:flex;gap:16px;align-items:center}
header a{font-family:system-ui,sans-serif;letter-spacing:.12em;text-decoration:none}
main{max-width:46rem;margin:0 auto;padding:8px 16px 72px}
.kartlar{display:grid;gap:16px}
.serit{display:flex;gap:12px;overflow-x:auto;padding-bottom:12px}
.serit .kart{flex:0 0 240px}
.kart{display:block;text-decoration:none;color:inherit;border:1px solid #2a2636;border-radius:16px;overflow:hidden}
.kart img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}
.kart div,.yazi-ust{padding:14px 16px}
.meta{font-family:system-ui,sans-serif;font-size:13px;color:#c9c2b4}
h1{font-size:2rem;line-height:1.2;margin:8px 0}
.kapak{width:100%;border-radius:16px;aspect-ratio:16/9;object-fit:cover}
.icerik p,.icerik li{margin:0 0 1rem}
.icerik h2,.icerik h3{margin:1.2rem 0 .45rem}
.icerik img{max-width:100%;height:auto;border-radius:12px}
.icerik pre{white-space:pre-wrap}
nav.kirik{font-family:system-ui,sans-serif;font-size:14px}
.paylas{display:flex;flex-wrap:wrap;gap:10px;font-family:system-ui,sans-serif}
.paylas a,button.kopya,button.video{border:1px solid #3a3448;border-radius:999px;padding:6px 12px;background:transparent;color:#f4f1ea;text-decoration:none;font:inherit}
.galeri{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}
.galeri img,.video img{width:100%;height:auto}
button.video{display:block;width:100%;border-radius:16px;padding:0;overflow:hidden}
.yazar img{width:48px;height:48px;border-radius:50%;object-fit:cover}
a:focus-visible,button:focus-visible{outline:2px solid #f3d7a1;outline-offset:2px}
html[dir=rtl] body{text-align:right}
</style>
</head>
<body>
<header>
  <a href="/">TAMUSO</a>
  <a href="${kok}">${kacis(ui.blog)}</a>
  <a href="/politika">${kacis(ui.politika)}</a>
</header>
<main id="tamuso-statik">${govde}</main>
<footer>
  <a href="/">${kacis(ui.ana)}</a>
  <a href="${kok}">${kacis(ui.blog)}</a>
  <a href="/politika/privacy">${kacis(ui.gizlilik)}</a>
</footer>
</body>
</html>`;
}

function tarih(iso, dil = 'tr') {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString((DIL_KAYDI[dil] || DIL_KAYDI.tr).locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

function kart(yazi) {
  const kapak = yazi.cover_image_url
    ? `<img src="${kacis(yazi.cover_image_url)}" alt="${kacis(yazi.cover_image_alt || yazi.title)}" />`
    : '';
  const kat = yazi.kategori?.name ? `<span>${kacis(yazi.kategori.name)}</span> · ` : '';
  const dil = yazi.language_code || 'tr';
  const ui = ARAYUZ[dil] || ARAYUZ.tr;
  return `<a class="kart" href="${blogYolu(dil, yazi.slug)}">${kapak}<div><p class="meta">${kat}${kacis(tarih(yazi.published_at, dil))}</p><h2>${kacis(yazi.title)}</h2><p>${kacis(yazi.excerpt || '')}</p><span>${kacis(ui.oku)}</span></div></a>`;
}

export function listeBelgesi({ yazilar, sayfa, sayfaSayisi, baslik, aciklama, canonical, robots, giris }) {
  const hero = yazilar[0];
  const kokYol = String(canonical || `${ORIGIN}/blog`).replace(ORIGIN, '') || '/blog';
  const sayfalama = sayfaSayisi > 1
    ? `<nav aria-label="Sayfalar">${Array.from({ length: sayfaSayisi }, (_, i) => {
        const n = i + 1;
        const href = n === 1 ? kokYol : `${kokYol}/sayfa/${n}`;
        return `<a href="${href}"${n === sayfa ? ' aria-current="page"' : ''}>${n}</a>`;
      }).join(' ')}</nav>`
    : '';
  const dil = (String(canonical || '').match(/\/(en|de|es|ar|ru)\/blog/) || [])[1] || 'tr';
  const ui = ARAYUZ[dil] || ARAYUZ.tr;
  const govde = `<h1>${kacis(baslik)}</h1><p>${kacis(giris)}</p>${yazilar.length ? `<div class="serit">${yazilar.map(kart).join('')}</div>` : `<p>${kacis(ui.bos)}</p>`}${sayfalama}`;
  return belge({
    title: seoBaslik(baslik, baslik.includes('Tamuso') ? baslik : `${baslik} | Tamuso`),
    description: aciklama,
    canonical,
    robots,
    ogType: 'website',
    image: hero?.cover_image_url || '',
    lang: dil,
    dir: (DIL_KAYDI[dil] || DIL_KAYDI.tr).dir,
    json: [{
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: baslik,
      description: aciklama,
      url: canonical,
      publisher: { '@type': 'Organization', name: 'Tamuso', url: `${ORIGIN}/` },
    }],
    govde,
  });
}

export function yaziBelgesi(yazi, ilgili) {
  const dil = yazi.language_code || 'tr';
  const kayit = DIL_KAYDI[dil] || DIL_KAYDI.tr;
  const title = yazi.seo_title?.trim() ? yazi.seo_title.trim() : seoBaslik(yazi.title, yazi.seo_title);
  const description = aciklamaOlustur(yazi.meta_description, yazi.excerpt, yazi.content_html);
  const canonical = kanonik(yazi.slug, yazi.canonical_url, dil);
  const robots = yazi.robots_index === false ? 'noindex,follow' : 'index,follow';
  const icerik = icerikHazirla(yazi.content_html);
  const toc = icindekiler(yazi.content_html);
  const tocHtml = toc.length
    ? `<nav aria-label="İçindekiler"><ol>${toc.map((t) => `<li><a href="#${t.id}">${kacis(t.metin)}</a></li>`).join('')}</ol></nav>`
    : '';
  const kapak = yazi.cover_image_url
    ? `<img class="kapak" src="${kacis(yazi.cover_image_url)}" alt="${kacis(yazi.cover_image_alt || yazi.title)}" width="${yazi.cover_width || 1200}" height="${yazi.cover_height || 675}" fetchpriority="high" />`
    : '';
  const kok = blogKok(dil);
  const ui = ARAYUZ[dil] || ARAYUZ.tr;
  const kirik = [
    ['/', ui.ana],
    [kok, ui.blog],
    yazi.kategori ? [`${kok}/kategori/${yazi.kategori.slug}`, yazi.kategori.name] : null,
  ].filter(Boolean);
  const sehir = (yazi.sehirler ?? [])
    .map((s) => `<a href="/sehir/${kacis(s.city_id)}">${kacis(s.city_name)}</a>`)
    .join(' · ');
  const ilgiliSayfa = (yazi.sayfalar ?? [])
    .map((s) => `<a href="${kacis(s.href)}">${kacis(s.label)}</a>`)
    .join(' · ');
  const faq = (yazi.faqs ?? []).filter((f) => f.question && f.answer);
  const faqHtml = faq.length
    ? `<section><h2>${kacis(ui.faq)}</h2>${faq.map((f) => `<details><summary>${kacis(f.question)}</summary><p>${kacis(f.answer)}</p></details>`).join('')}</section>`
    : '';
  const ilgiliHtml = ilgili?.length
    ? `<section><h2>${kacis(ui.ilgili)}</h2><div class="kartlar">${ilgili.map(kart).join('')}</div></section>`
    : '';
  const diller = hreflangleri(yazi.surumler || [{ ...yazi, robots_index: yazi.robots_index }], yazi.diller || []);
  const dilMenu = diller
    .filter((d) => d.hreflang !== 'x-default')
    .map((d) => `<a href="${kacis(d.href)}" hreflang="${kacis(d.hreflang)}">${kacis(DIL_KAYDI[d.hreflang]?.ad || d.hreflang)}</a>`)
    .join(' ');
  const videolar = (yazi.videolar?.length ? yazi.videolar : videolariCikar(yazi.content_html));
  const videoHtml = videolar.map((v) => {
    const poster = v.thumbnail_url
      ? `<img src="${kacis(v.thumbnail_url)}" alt="${kacis(v.title || 'Video')}" width="640" height="360" />`
      : `<span>${kacis(v.title || 'Video')}</span>`;
    const adres = v.embed_url || v.content_url || '';
    return `<button class="video" type="button" data-embed="${kacis(adres)}" aria-label="${kacis(v.title || ui.oynat)}">${poster}</button>`;
  }).join('');
  const galeri = Array.isArray(yazi.gallery) ? yazi.gallery : [];
  const galeriHtml = galeri.length
    ? `<div class="galeri">${galeri.map((g) => `<figure><img src="${kacis(g.url)}" alt="${kacis(g.alt || '')}" width="${g.width || 800}" height="${g.height || 600}" loading="lazy" />${g.caption ? `<figcaption>${kacis(g.caption)}</figcaption>` : ''}</figure>`).join('')}</div>`
    : '';
  const yazar = yazi.yazar || {
    name: yazi.author_name || 'Tamuso Yayın Ekibi',
    slug: 'tamuso-ekibi',
    kind: 'organization',
    bio: yazi.author_bio || '',
    avatar_url: yazi.author_avatar_url || '',
  };
  const yazarHtml = `<p class="yazar"><a href="${yazarYolu(yazar.slug || 'tamuso-ekibi')}">${yazar.avatar_url ? `<img src="${kacis(yazar.avatar_url)}" alt="${kacis(yazar.avatar_alt || yazar.name)}" width="48" height="48" />` : ''}${kacis(yazar.name)}</a></p>`;
  const paylas = encodeURIComponent(canonical);
  const baslikPaylas = encodeURIComponent(title);
  const govde = `
<nav class="kirik" aria-label="Breadcrumb">${kirik.map(([href, ad], i) => `${i ? ' / ' : ''}<a href="${href}">${kacis(ad)}</a>`).join('')} / <span>${kacis(yazi.title)}</span></nav>
<nav class="diller" aria-label="Dil">${dilMenu}</nav>
<article data-blog-slug="${kacis(yazi.slug)}">
<p class="meta">${yazi.kategori ? `<a href="${kok}/kategori/${kacis(yazi.kategori.slug)}">${kacis(yazi.kategori.name)}</a> · ` : ''}${kacis(tarih(yazi.published_at, dil))}${yazi.updated_at ? ` · ${kacis(ui.guncelleme)} ${kacis(tarih(yazi.updated_at, dil))}` : ''} · ${kacis(ui.dakika(okumaDakika(yazi.content_html)))}</p>
<h1>${kacis(yazi.title)}</h1>
${yazi.excerpt ? `<p>${kacis(yazi.excerpt)}</p>` : ''}
${yazarHtml}
<div class="paylas">
<a href="https://wa.me/?text=${baslikPaylas}%20${paylas}">WhatsApp</a>
<a href="https://twitter.com/intent/tweet?url=${paylas}&text=${baslikPaylas}">X</a>
<a href="https://www.facebook.com/sharer/sharer.php?u=${paylas}">Facebook</a>
<a href="https://www.linkedin.com/sharing/share-offsite/?url=${paylas}">LinkedIn</a>
<button class="kopya" type="button" data-url="${kacis(canonical)}">${kacis(ui.kopya)}</button>
</div>
${kapak}
${tocHtml}
<div class="icerik">${icerik}</div>
${galeriHtml}
${videoHtml}
${sehir ? `<p>${kacis(ui.sehir)}: ${sehir}</p>` : ''}
${ilgiliSayfa ? `<p>${kacis(ui.sayfa)}: ${ilgiliSayfa}</p>` : ''}
${faqHtml}
</article>
${ilgiliHtml}
<script>
document.querySelectorAll('button.video').forEach(function(b){b.addEventListener('click',function(){if(!b.dataset.embed)return;var f=document.createElement('iframe');f.src=b.dataset.embed;f.title=b.getAttribute('aria-label')||'Video';f.loading='lazy';f.setAttribute('allowfullscreen','');f.style.width='100%';f.style.aspectRatio='16/9';b.replaceWith(f);});});
document.querySelectorAll('button.kopya').forEach(function(b){b.addEventListener('click',function(){if(navigator.clipboard)navigator.clipboard.writeText(b.dataset.url||location.href);});});
</script>`;
  const yazarTip = yazar.kind === 'person' ? 'Person' : 'Organization';
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: yazi.title,
    description,
    image: yazi.cover_image_url ? [yazi.cover_image_url] : undefined,
    inLanguage: kayit.locale,
    datePublished: yazi.published_at,
    dateModified: yazi.updated_at || yazi.published_at,
    author: {
      '@type': yazarTip,
      name: yazar.name,
      url: `${ORIGIN}${yazarYolu(yazar.slug || 'tamuso-ekibi')}`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Tamuso',
      url: `${ORIGIN}/`,
      email: 'support@litxtech.com',
    },
    mainEntityOfPage: canonical,
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      ...kirik.map(([href, ad], i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: ad,
        item: href.startsWith('http') ? href : `${ORIGIN}${href}`,
      })),
      {
        '@type': 'ListItem',
        position: kirik.length + 1,
        name: yazi.title,
        item: canonical,
      },
    ],
  };
  const json = [articleLd, breadcrumb];
  if (faq.length) {
    json.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }
  for (const video of videolar) {
    if (!video.title || !(video.embed_url || video.content_url)) continue;
    json.push({
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: video.title,
      description: video.description || description,
      thumbnailUrl: video.thumbnail_url ? [video.thumbnail_url] : undefined,
      uploadDate: video.upload_date || yazi.published_at,
      duration: video.duration_iso || undefined,
      embedUrl: video.embed_url || undefined,
      contentUrl: video.content_url || undefined,
    });
  }
  return belge({
    title,
    description,
    canonical,
    robots,
    ogType: 'article',
    image: yazi.og_image_url || yazi.twitter_image_url || yazi.cover_image_url || '',
    json,
    govde,
    lang: dil,
    dir: kayit.dir,
    alternates: diller,
    twitterTitle: yazi.twitter_title || yazi.og_title || title,
    twitterDescription: yazi.twitter_description || yazi.og_description || description,
    article: {
      published: yazi.published_at || '',
      modified: yazi.updated_at || yazi.published_at || '',
      author: yazar.name,
    },
  });
}

export function bulunamadiBelgesi() {
  return belge({
    title: 'Sayfa bulunamadı | Tamuso',
    description: 'Bu blog adresi yayında değil.',
    canonical: `${ORIGIN}/blog`,
    robots: 'noindex,nofollow',
    ogType: 'website',
    image: '',
    json: [],
    govde: '<h1>Sayfa bulunamadı</h1><p>Bu yazı yayında değil veya adresi değişti.</p><p><a href="/blog">Bloga dön</a></p>',
  });
}

export function siteHaritasi(statik, yazilar, kategoriler, etiketler, sayfaSayisi) {
  const urls = [];
  const ekle = (yol, lastmod, priority, image) => {
    const loc = `${ORIGIN}${yol === '/' ? '/' : yol}`;
    urls.push({ loc, lastmod, priority, image: image || '' });
  };
  for (const sayfa of statik) ekle(sayfa.yol, sayfa.gun || '', sayfa.yol === '/' ? '1.0' : '0.6');
  ekle('/blog', '', '0.8');
  for (let n = 2; n <= sayfaSayisi; n += 1) ekle(`/blog/sayfa/${n}`, '', '0.4');
  for (const kat of kategoriler) {
    if ((kat.adet ?? 0) < 1) continue;
    ekle(`/blog/kategori/${kat.slug}`, '', '0.5');
  }
  for (const et of etiketler) {
    if ((et.adet ?? 0) < ETIKET_INDEX_ESIK) continue;
    ekle(`/blog/etiket/${et.slug}`, '', '0.3');
  }
  for (const yazi of yazilar) {
    if (yazi.robots_index === false) continue;
    const gun = String(yazi.updated_at || yazi.published_at || '').slice(0, 10);
    ekle(blogYolu(yazi.language_code || 'tr', yazi.slug), /^\d{4}-\d{2}-\d{2}$/.test(gun) ? gun : '', '0.7', yazi.cover_image_url || '');
  }
  const govde = urls
    .map((u) => {
      const satir = [`  <url>`, `    <loc>${kacis(u.loc)}</loc>`];
      if (u.lastmod) satir.push(`    <lastmod>${u.lastmod}</lastmod>`);
      if (u.image) satir.push(`    <image:image><image:loc>${kacis(u.image)}</image:loc></image:image>`);
      satir.push(`    <priority>${u.priority}</priority>`, `  </url>`);
      return satir.join('\n');
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${govde}\n</urlset>\n`;
}

export function seoKontrol(yazi) {
  const title = seoBaslik(yazi.title, yazi.seo_title);
  const description = aciklamaOlustur(yazi.meta_description, yazi.excerpt, yazi.content_html);
  const metin = duzMetin(yazi.content_html);
  const h2 = (yazi.content_html.match(/<h2[\s>]/gi) || []).length;
  const altsiz = (yazi.content_html.match(/<img\b(?![^>]*\balt="[^"]+")[^>]*>/gi) || []).length;
  const maddeler = [
    { ad: 'Başlık', tamam: Boolean(yazi.title) },
    { ad: 'SEO title', tamam: baslikDurumu(title) === 'ideal' },
    { ad: 'Meta açıklama', tamam: aciklamaDurumu(description) === 'ideal' },
    { ad: 'Slug', tamam: Boolean(slugYap(yazi.slug || yazi.title)) },
    { ad: 'H1', tamam: h1Sayisi(yazi.content_html) === 0 },
    { ad: 'H2', tamam: h2 > 0 },
    { ad: 'Alt metin', tamam: altsiz === 0 && (!yazi.cover_image_url || Boolean(yazi.cover_image_alt)) },
    { ad: 'Canonical', tamam: kanonik(yazi.slug, yazi.canonical_url).startsWith(`${ORIGIN}/`) },
    { ad: 'Kapak', tamam: Boolean(yazi.cover_image_url) },
    { ad: 'Uzunluk', tamam: metin.length >= 400 },
  ];
  const puan = Math.round((maddeler.filter((m) => m.tamam).length / maddeler.length) * 100);
  return { puan, maddeler, not: 'Teknik içerik kontrolü. Arama sırası değildir.' };
}
