/**
 * Public içerik SEO motoru.
 * Blog belgesi ile aynı HTML kabuğunu kullanır.
 * Karar kuralları veritabanındaki seo_gonderi_yenile ile aynı eşikleri izler.
 * Sahte puan, yorum, takipçi veya görüntülenme üretmez.
 */
import { belge, kacis } from './blog-motor.mjs';

export const ORIGIN = 'https://www.tamuso.com';
export const VARSAYILAN_OG = `${ORIGIN}/og.png`;
export const SAYFA_BOYUTU = 12;
export const SITEMAP_BOYUTU = 1000;
export const INDEX_ESIK = 80;

export const publicSeoRoutes = {
  post: (slug) => `/p/${slug}`,
  profile: (username) => `/u/${username}`,
  city: (slug) => `/city/${slug}`,
  cityPosts: (slug) => `/city/${slug}/posts`,
  hashtag: (tag) => `/hashtag/${tag}`,
  topic: (slug) => `/topics/${slug}`,
  discover: '/discover',
  people: '/people',
  agencies: '/ajanslar',
  agency: (slug) => `/ajans-profil/${slug}`,
};

const SELAMLAMA = new Set([
  'hi', 'hello', 'hey', 'selam', 'slm', 'merhaba', 'gunaydin', 'günaydın',
  'good morning', 'good night', 'follow me', 'like my profile', 'takip et',
]);

const GUVENLIK_ENGEL = new Set([
  'PRIVATE', 'FOLLOWERS_ONLY', 'FRIENDS_ONLY', 'REMOVED', 'DELETED',
  'MODERATION_PENDING', 'REPORTED_AND_HIDDEN', 'BLOCKED', 'SENSITIVE_CONTENT',
  'AUTOMATED_SPAM',
]);

export function slugYap(girdi) {
  const harita = {
    ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i', I: 'i', ö: 'o', Ö: 'o',
    ş: 's', Ş: 's', ü: 'u', Ü: 'u', â: 'a', Â: 'a', î: 'i', û: 'u',
  };
  let s = [...String(girdi ?? '')].map((ch) => harita[ch] ?? ch).join('');
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  s = s.replace(/[''`’‘]/g, '');
  s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
  s = s.slice(0, 60).replace(/-+$/g, '');
  return s;
}

export function kisaKimlik(id) {
  return String(id ?? '').replace(/-/g, '').slice(0, 6).toLowerCase();
}

export function postSlug(metin, id) {
  const kisa = kisaKimlik(id);
  const govde = slugYap(String(metin ?? '').split(/[.!?\n]/)[0]);
  return `${govde || 'paylasim'}-${kisa}`;
}

export function metinTemizle(ham) {
  let s = String(ham ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/#[\p{L}\p{N}_]+/gu, ' ')
    .replace(/\p{Extended_Pictographic}/gu, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s;
}

export function dilAlgila(metin, tercih) {
  const ham = String(metin ?? '');
  if (/[çğıöşüÇĞİÖŞÜ]/.test(ham)) return 'tr';
  const izin = ['tr', 'en', 'de', 'es', 'fr', 'ar', 'ru'];
  if (izin.includes(tercih)) return tercih;
  return 'tr';
}

function selamlamaMi(temiz) {
  const k = temiz.toLocaleLowerCase('tr-TR');
  return SELAMLAMA.has(k);
}

export function karar(girdi) {
  const temiz = metinTemizle(girdi.metin);
  const kelime = temiz ? temiz.split(' ').filter(Boolean) : [];
  const yalnizHashtag = !temiz && /#[\p{L}\p{N}_]+/u.test(String(girdi.metin ?? ''));
  const yalnizEmoji = !temiz && /\p{Extended_Pictographic}/u.test(String(girdi.metin ?? '')) && !/[\p{L}\p{N}]/u.test(String(girdi.metin ?? ''));
  const kisa = temiz.length < 40 || kelime.length < 8 || selamlamaMi(temiz);
  const engel = [];
  if (!girdi.public) engel.push(girdi.followersOnly ? 'FOLLOWERS_ONLY' : 'PRIVATE');
  if (girdi.removed) engel.push('REMOVED');
  if (girdi.deleted) engel.push('DELETED');
  if (girdi.moderationPending) engel.push('MODERATION_PENDING');
  if (girdi.reportedHidden) engel.push('REPORTED_AND_HIDDEN');
  if (girdi.blocked || girdi.banned) engel.push('BLOCKED');
  // sensitive: çocuk güvenliği, şiddet, kendine zarar. Yetişkin paylaşım bu bayrak değildir.
  if (girdi.sensitive) engel.push('SENSITIVE_CONTENT');
  if (girdi.automatedSpam) engel.push('AUTOMATED_SPAM');
  if (girdi.spam) engel.push('SPAM');
  if (girdi.searchOff) engel.push('SEARCH_OFF');
  if (!String(girdi.metin ?? '').trim()) engel.push('EMPTY_POST');
  if (yalnizEmoji) engel.push('ONLY_EMOJIS');
  if (yalnizHashtag) engel.push('ONLY_HASHTAGS');
  if (kisa && !engel.includes('EMPTY_POST')) engel.push('LOW_QUALITY');

  const guvenlik = engel.some((e) => GUVENLIK_ENGEL.has(e) || e === 'SPAM');
  const puanlar = [
    { ad: 'Public', tamam: Boolean(girdi.public) && !guvenlik, puan: 20 },
    { ad: 'Moderated', tamam: !girdi.moderationPending && !girdi.reportedHidden && !girdi.removed && !girdi.deleted, puan: 20 },
    { ad: 'Unique content', tamam: !girdi.duplicate && temiz.length >= 40, puan: 15 },
    { ad: 'Meaningful text', tamam: !kisa && !yalnizEmoji && !yalnizHashtag, puan: 10 },
    { ad: 'Has image', tamam: Boolean(girdi.medya), puan: 5 },
    { ad: 'City assigned', tamam: Boolean(girdi.sehir), puan: 5 },
    { ad: 'Topic assigned', tamam: Boolean(girdi.konu), puan: 5 },
    { ad: 'Author public', tamam: Boolean(girdi.yazarAcik), puan: 5 },
    { ad: 'Spam risk low', tamam: !girdi.spam && !girdi.automatedSpam, puan: 10 },
  ];
  const score = puanlar.reduce((t, m) => t + (m.tamam ? m.puan : 0), 0);
  const ince = engel.some((e) => ['LOW_QUALITY', 'EMPTY_POST', 'ONLY_EMOJIS', 'ONLY_HASHTAGS', 'SEARCH_OFF'].includes(e));
  let tier = 3;
  let indexable = false;
  let neden = engel[0] || 'LOW_QUALITY';
  if (!guvenlik && girdi.public) {
    if (girdi.manual === 'hide') {
      tier = 3;
      neden = 'MANUAL_HIDE';
    } else if (girdi.manual === 'noindex' || girdi.searchOff || ince || score < INDEX_ESIK) {
      tier = 2;
      indexable = false;
      neden = girdi.manual === 'noindex' ? 'MANUAL_NOINDEX' : (engel.find((e) => e === 'SEARCH_OFF' || e === 'LOW_QUALITY' || e === 'EMPTY_POST') || 'BELOW_THRESHOLD');
    } else {
      tier = 1;
      indexable = true;
      neden = 'INDEXABLE';
    }
    if (girdi.manual === 'index' && !guvenlik && girdi.public && !girdi.sensitive && !girdi.spam) {
      tier = 1;
      indexable = true;
      neden = 'MANUAL_INDEX';
    }
  }
  if (girdi.manual === 'hide') {
    tier = 3;
    indexable = false;
    neden = 'MANUAL_HIDE';
  }
  const robots = indexable ? 'index,follow' : 'noindex,follow';
  const http = tier === 3 ? 404 : 200;
  const eksikler = puanlar.filter((m) => !m.tamam).map((m) => m.ad);
  return { score, tier, indexable, robots, http, neden, engel, puanlar, eksikler, temiz };
}

export function baslikUret(metin, sehir) {
  const cumle = String(metin ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/#[\p{L}\p{N}_]+/gu, ' ')
    .replace(/https?:\/\/\S+/gi, ' ')
    .split(/[.!?\n]/)[0]
    .replace(/\s+/g, ' ')
    .trim();
  const kaynak = cumle || (sehir ? `${sehir} paylaşımı` : '');
  if (!kaynak) return { h1: 'Paylaşım', title: 'Paylaşım | Tamuso' };
  const h1 = [...kaynak].slice(0, 52).join('').trim();
  let title = `${h1} | Tamuso`;
  if ([...title].length > 60) title = `${[...h1].slice(0, 48).join('').trim()} | Tamuso`;
  return { h1, title };
}

export function aciklamaUret(metin) {
  const temiz = String(metin ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!temiz) return 'Tamuso üzerindeki herkese açık bir paylaşım.';
  if ([...temiz].length <= 160) return temiz;
  const kesik = [...temiz].slice(0, 157).join('');
  const bosluk = kesik.lastIndexOf(' ');
  return `${(bosluk > 80 ? kesik.slice(0, bosluk) : kesik).trim()}…`;
}

export function guvenliHttps(url) {
  try {
    const u = new URL(String(url ?? ''));
    if (u.protocol !== 'https:') return '';
    if (/\.svg($|\?)/i.test(u.pathname)) return '';
    return u.toString();
  } catch {
    return '';
  }
}

function disLink(kacmis) {
  return kacmis.replace(/https:\/\/[^\s<]+/g, (ham) => {
    const url = ham.replace(/[),.;]+$/g, '');
    const guvenli = guvenliHttps(url);
    if (!guvenli) return '';
    return `<a href="${kacis(guvenli)}" rel="ugc nofollow noopener noreferrer">${kacis(guvenli)}</a>`;
  });
}

export function metinHtml(metin) {
  const kacmis = kacis(String(metin ?? '')).replace(/\n/g, '<br />');
  return disLink(kacmis).replace(/#([\p{L}\p{N}_]+)/gu, (_m, etiket) => {
    const slug = slugYap(etiket);
    if (!slug) return kacis(`#${etiket}`);
    return `<a href="${publicSeoRoutes.hashtag(slug)}">#${kacis(etiket)}</a>`;
  });
}

function jsonTemiz(veri) {
  return JSON.parse(JSON.stringify(veri));
}

export function sayfaBelgesi(model) {
  const lang = model.language || 'tr';
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const canonical = `${ORIGIN}${model.path}`;
  const robots = model.robots || 'noindex,follow';
  const image = guvenliHttps(model.image) || (model.imageZorunlu ? '' : VARSAYILAN_OG);
  const govde = model.govde;
  return belge({
    title: model.title,
    description: model.description,
    canonical,
    robots,
    ogType: model.ogType || 'article',
    image,
    lang,
    dir,
    article: model.published
      ? { published: model.published, modified: model.modified || model.published, author: model.authorName || 'Tamuso' }
      : null,
    json: (model.json || []).map(jsonTemiz),
    govde,
  });
}

export function postBelgesi(veri) {
  const metin = String(veri.text ?? '');
  const uretilen = baslikUret(metin, veri.city?.name);
  const h1 = veri.h1 || uretilen.h1;
  const title = veri.title || uretilen.title;
  const description = veri.description || aciklamaUret(metin);
  const image = guvenliHttps(veri.image);
  const gorsel = image
    ? `<img src="${kacis(image)}" alt="${kacis(veri.imageAlt || h1)}" loading="eager" fetchpriority="high" />`
    : '';
  const videoSrc = guvenliHttps(veri.video?.url);
  const video = videoSrc
    ? `<video controls preload="none"${image ? ` poster="${kacis(image)}"` : ''}><source src="${kacis(videoSrc)}" /></video>`
    : '';
  const yazar = veri.author?.name
    ? `<a href="${kacis(veri.author.path || '/people')}">${kacis(veri.author.name)}</a>${veri.author.username ? ` <span>@${kacis(veri.author.username)}</span>` : ''}`
    : 'Tamuso';
  const sehir = veri.city?.path
    ? `<a href="${kacis(veri.city.path)}">${kacis(veri.city.name)}</a>`
    : '';
  const konular = (veri.topics || []).map((t) => `<a href="${kacis(t.path)}">${kacis(t.title)}</a>`).join(' ');
  const ilgili = (veri.related || []).slice(0, 6).map((t) => `<li><a href="${kacis(t.path)}">${kacis(t.title)}</a></li>`).join('');
  const bloglar = (veri.blogs || []).slice(0, 3).map((t) => `<li><a href="${kacis(t.path)}">${kacis(t.title)}</a></li>`).join('');
  const json = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: h1,
      description,
      inLanguage: veri.language || 'tr',
      datePublished: veri.published,
      dateModified: veri.modified || veri.published,
      mainEntityOfPage: `${ORIGIN}${veri.path}`,
      author: veri.author?.name
        ? { '@type': 'Person', name: veri.author.name, url: veri.author.path ? `${ORIGIN}${veri.author.path}` : undefined }
        : { '@type': 'Organization', name: 'Tamuso' },
      ...(veri.city?.name ? { contentLocation: { '@type': 'Place', name: veri.city.name } } : {}),
      ...(image ? { image } : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Tamuso', item: `${ORIGIN}/` },
        ...(veri.city?.name ? [{ '@type': 'ListItem', position: 2, name: veri.city.name, item: `${ORIGIN}${veri.city.path}` }] : []),
        { '@type': 'ListItem', position: veri.city ? 3 : 2, name: h1, item: `${ORIGIN}${veri.path}` },
      ],
    },
  ];
  if (videoSrc && veri.video?.name) {
    json.push({
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: veri.video.name,
      description: veri.video.description || description,
      thumbnailUrl: image || undefined,
      uploadDate: veri.published,
      contentUrl: videoSrc,
      ...(veri.video.duration ? { duration: veri.video.duration } : {}),
    });
  }
  const govde = `<article>
<header>
<nav class="kirik" aria-label="Konum"><a href="/">Tamuso</a>${sehir ? ` · ${sehir}` : ''}</nav>
<h1>${kacis(h1)}</h1>
<p class="meta">${yazar}${sehir ? ` · ${sehir}` : ''}${veri.published ? ` · <time datetime="${kacis(veri.published)}">${kacis(veri.published.slice(0, 10))}</time>` : ''}</p>
</header>
<section>${gorsel}${video}<p>${metinHtml(metin)}</p>${konular ? `<p>${konular}</p>` : ''}</section>
<footer>
${kamuBaglantilari()}
<p><a href="/register">Tamuso'ya katıl</a> · <a href="${kacis(veri.appPath || '/')}">Uygulamada aç</a>${veri.reportPath ? ` · <a href="${kacis(veri.reportPath)}">Bildir</a>` : ''}</p>
${ilgili ? `<h2>Benzer paylaşımlar</h2><ul>${ilgili}</ul>` : ''}
${bloglar ? `<h2>İlgili yazılar</h2><ul>${bloglar}</ul>` : ''}
</footer>
</article>
<script>try{sessionStorage.setItem('tamuso_seo_landing',JSON.stringify({landing_content_type:'post',landing_content_id:${JSON.stringify(veri.id || '')},landing_city:${JSON.stringify(veri.city?.slug || '')},landing_topic:${JSON.stringify(veri.topics?.[0]?.slug || '')},path:${JSON.stringify(veri.path)}}));}catch(e){}</script>`;
  return sayfaBelgesi({
    title,
    description,
    path: veri.path,
    robots: veri.robots,
    language: veri.language,
    image: image || VARSAYILAN_OG,
    published: veri.published,
    modified: veri.modified,
    authorName: veri.author?.name || 'Tamuso',
    json,
    govde,
    ogType: 'article',
  });
}

export function profilBelgesi(veri) {
  const title = veri.title;
  const description = veri.description;
  const avatar = guvenliHttps(veri.avatar);
  const gorsel = avatar
    ? `<img src="${kacis(avatar)}" alt="${kacis(veri.name || 'Profil')}" width="96" height="96" loading="eager" />`
    : '';
  const gonderiler = (veri.posts || []).slice(0, 12).map((p) => `<li><a href="${kacis(p.path)}">${kacis(p.title)}</a></li>`).join('');
  const govde = `<article>
<header><h1>${kacis(veri.name || 'Profil')}</h1><p class="meta">@${kacis(veri.username || '')}${veri.city?.name ? ` · <a href="${kacis(veri.city.path)}">${kacis(veri.city.name)}</a>` : ''}</p>${gorsel}</header>
<section>${veri.bio ? `<p>${metinHtml(veri.bio)}</p>` : ''}${gonderiler ? `<h2>Herkese açık paylaşımlar</h2><ul>${gonderiler}</ul>` : ''}</section>
<footer>${kamuBaglantilari()}<p><a href="/register">Tamuso'ya katıl</a></p></footer>
</article>`;
  return sayfaBelgesi({
    title,
    description,
    path: veri.path,
    robots: veri.robots,
    language: veri.language || 'tr',
    image: VARSAYILAN_OG,
    ogType: 'profile',
    json: [{
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      name: veri.name,
      description,
      url: `${ORIGIN}${veri.path}`,
      mainEntity: { '@type': 'Person', name: veri.name || veri.username, url: `${ORIGIN}${veri.path}` },
    }],
    govde,
  });
}

export function sehirBelgesi(veri) {
  const postlar = (veri.posts || []).slice(0, 12).map((p) => `<li><a href="${kacis(p.path)}">${kacis(p.title)}</a></li>`).join('');
  const insanlar = (veri.people || []).slice(0, 12).map((p) => `<li><a href="${kacis(p.path)}">${kacis(p.title)}</a></li>`).join('');
  const bloglar = (veri.blogs || []).slice(0, 6).map((p) => `<li><a href="${kacis(p.path)}">${kacis(p.title)}</a></li>`).join('');
  const govde = `<article>
<header><h1>${kacis(veri.name)}</h1><p>${kacis(veri.description)}</p></header>
<section>
<p><a href="${kacis(veri.postsPath)}">Paylaşımlar</a> · <a href="/discover">Keşfet</a> · <a href="/blog">Blog</a></p>
${postlar ? `<h2>${kacis(veri.name)} paylaşımları</h2><ul>${postlar}</ul>` : ''}
${insanlar ? `<h2>${kacis(veri.name)} profilleri</h2><ul>${insanlar}</ul>` : ''}
${bloglar ? `<h2>${kacis(veri.name)} yazıları</h2><ul>${bloglar}</ul>` : ''}
</section>
</article>`;
  return sayfaBelgesi({
    title: veri.title,
    description: veri.description,
    path: veri.path,
    robots: veri.robots,
    language: 'tr',
    image: VARSAYILAN_OG,
    ogType: 'website',
    json: [
      { '@context': 'https://schema.org', '@type': 'Place', name: veri.name, url: `${ORIGIN}${veri.path}` },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Tamuso', item: `${ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: veri.name, item: `${ORIGIN}${veri.path}` },
        ],
      },
    ],
    govde,
  });
}

export function listeBelgesi(veri) {
  const ogeler = (veri.items || []).slice(0, 24).map((p) => `<li><a href="${kacis(p.path)}">${kacis(p.title)}</a></li>`).join('');
  const sayfa = Number(veri.page || 1);
  const nav = sayfa > 1
    ? `<nav aria-label="Sayfalar"><a href="${kacis(veri.path)}">1</a> <span aria-current="page">${sayfa}</span></nav>`
    : '';
  const govde = `<article><header><h1>${kacis(veri.h1)}</h1><p>${kacis(veri.description)}</p></header><section>${ogeler ? `<ul>${ogeler}</ul>` : '<p>Henüz listelenecek herkese açık içerik yok.</p>'}${nav}</section><footer>${kamuBaglantilari()}</footer></article>`;
  return sayfaBelgesi({
    title: veri.title,
    description: veri.description,
    path: veri.path,
    robots: sayfa > 1 ? 'noindex,follow' : veri.robots,
    language: veri.language || 'tr',
    image: VARSAYILAN_OG,
    ogType: 'website',
    json: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: veri.h1, description: veri.description, url: `${ORIGIN}${veri.path}` }],
    govde,
  });
}

export function bulunamadiBelgesi() {
  return sayfaBelgesi({
    title: 'Sayfa bulunamadı | Tamuso',
    description: 'Bu adres Tamuso’da yok veya herkese açık değil.',
    path: '/404',
    robots: 'noindex,nofollow',
    image: VARSAYILAN_OG,
    ogType: 'website',
    language: 'tr',
    json: [],
    govde: '<article><header><h1>Sayfa bulunamadı</h1></header><section><p>Bu içerik yok, kaldırıldı veya herkese açık değil.</p><p><a href="/">Ana sayfa</a> · <a href="/discover">Keşfet</a></p></section></article>',
  }).replace('href="https://www.tamuso.com/404"', 'href="https://www.tamuso.com/"');
}

function kamuBaglantilari() {
  return `<p><a href="/">Ana sayfa</a> · <a href="/discover">Keşfet</a> · <a href="/people">Kişiler</a> · <a href="/tanitim/ozellikler">Oyunlar ve özellikler</a> · <a href="/tanitim/meyve">Meyve oyunu</a> · <a href="/politika/privacy">Gizlilik</a> · <a href="/politika/tos">Koşullar</a> · <a href="/politika/community_rules">Topluluk kuralları</a> · <a href="/blog">Blog</a></p>`;
}

export function ajansBelgesi(veri) {
  const logo = guvenliHttps(veri.logo);
  const gorsel = logo
    ? `<img src="${kacis(logo)}" alt="${kacis(veri.name || 'Ajans')}" width="120" height="120" loading="eager" />`
    : '';
  const govde = `<article>
<header><h1>${kacis(veri.name || 'Ajans')}</h1>${veri.country ? `<p class="meta">${kacis(veri.country)}</p>` : ''}${gorsel}</header>
<section>${veri.slogan ? `<p>${kacis(veri.slogan)}</p>` : ''}<p>${metinHtml(veri.description || '')}</p></section>
<footer>${kamuBaglantilari()}<p><a href="/ajanslar">Tüm ajanslar</a></p></footer>
</article>`;
  return sayfaBelgesi({
    title: veri.title,
    description: veri.description,
    path: veri.path,
    robots: veri.robots,
    language: 'tr',
    image: logo || VARSAYILAN_OG,
    ogType: 'website',
    json: [{
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: veri.name,
      description: veri.description,
      url: `${ORIGIN}${veri.path}`,
      ...(logo ? { logo } : {}),
    }],
    govde,
  });
}

export function sitemapUrlset(adresler) {
  const govde = adresler.map((a) => {
    const last = a.lastmod ? `<lastmod>${kacis(String(a.lastmod).slice(0, 10))}</lastmod>` : '';
    const gorsel = typeof a.image === 'string' && a.image.startsWith('https://')
      ? `<image:image><image:loc>${kacis(a.image)}</image:loc>${a.title ? `<image:title>${kacis(a.title)}</image:title>` : ''}</image:image>`
      : '';
    const video = typeof a.video === 'string' && a.video.startsWith('https://')
      && typeof a.thumb === 'string' && a.thumb.startsWith('https://')
      ? `<video:video><video:thumbnail_loc>${kacis(a.thumb)}</video:thumbnail_loc><video:title>${kacis(a.title || 'Video')}</video:title><video:description>${kacis(a.description || a.title || 'Video')}</video:description><video:content_loc>${kacis(a.video)}</video:content_loc></video:video>`
      : '';
    return `<url><loc>${kacis(a.loc)}</loc>${last}${gorsel}${video}</url>`;
  }).join('');
  const imageNs = govde.includes('<image:image>') ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : '';
  const videoNs = govde.includes('<video:video>') ? ' xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"' : '';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${imageNs}${videoNs}>${govde}</urlset>\n`;
}

export function sitemapIndex(adresler) {
  const govde = adresler.map((loc) => `<sitemap><loc>${kacis(loc)}</loc></sitemap>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${govde}</sitemapindex>\n`;
}

export function htmlDenetle(html) {
  const al = (re) => (String(html).match(re) || [])[1] || '';
  const h1ler = [...String(html).matchAll(/<h1[^>]*>([^<]*)/g)].map((m) => m[1]);
  const ld = [...String(html).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => {
    try { return JSON.parse(m[1]); } catch { return null; }
  });
  return {
    title: al(/<title>([^<]*)<\/title>/),
    description: al(/<meta name="description" content="([^"]*)"/),
    canonical: al(/<link rel="canonical" href="([^"]+)"/),
    robots: al(/<meta name="robots" content="([^"]+)"/),
    h1: h1ler,
    ogImage: al(/<meta property="og:image" content="([^"]+)"/),
    json: ld.filter(Boolean),
    metin: String(html).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
  };
}

export function hashtagIndex(adet, yazarSayisi) {
  return adet >= 3 && yazarSayisi >= 2;
}
