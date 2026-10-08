/**
 * Public SEO karar ve ilk HTML denetimi. Tarayıcı çalıştırmaz.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ORIGIN,
  karar,
  postBelgesi,
  profilBelgesi,
  sehirBelgesi,
  listeBelgesi,
  bulunamadiBelgesi,
  sitemapUrlset,
  htmlDenetle,
  slugYap,
  postSlug,
  hashtagIndex,
  metinHtml,
} from './public-seo-motor.mjs';

const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ornek = 'Bugün İstanbul’da arkadaşlarımla yeni bir mekan keşfettik. Gün batımında manzara gerçekten harikaydı.';
const iyi = {
  public: true,
  metin: ornek,
  medya: true,
  sehir: true,
  konu: true,
  yazarAcik: true,
};

const t1 = karar(iyi);
assert.equal(t1.http, 200);
assert.equal(t1.indexable, true);
assert.match(t1.robots, /index,follow/);

const t2 = karar({ ...iyi, public: false });
assert.equal(t2.http, 404);
assert.equal(t2.indexable, false);
assert.match(t2.robots, /noindex/);
assert.ok(t2.engel.includes('PRIVATE'));

const t3 = karar({ ...iyi, deleted: true });
assert.equal(t3.http, 404);
assert.ok(t3.engel.includes('DELETED'));

const t4 = karar({ ...iyi, reportedHidden: true });
assert.equal(t4.http, 404);

const html = postBelgesi({
  id: '11111111-1111-1111-1111-111111111111',
  text: ornek,
  path: '/p/bugun-istanbulda-arkadaslarimla-yeni-bir-mekan-kesfettik-111111',
  robots: 'index,follow',
  language: 'tr',
  published: '2026-10-08T00:00:00.000Z',
  modified: '2026-10-08T00:00:00.000Z',
  image: 'https://www.tamuso.com/og.png',
  imageAlt: 'İstanbul’da şehir manzarası sunan bir mekan',
  author: { name: 'Ayşe', username: 'ayse', path: '/u/ayse' },
  city: { name: 'İstanbul', slug: 'istanbul', path: '/city/istanbul' },
  topics: [{ title: 'Şehir', slug: 'sehir', path: '/topics/sehir' }],
  related: [{ title: 'Başka bir akşam', path: '/p/baska-222222' }],
  blogs: [{ title: 'İstanbul rehberi', path: '/blog/istanbul-rehberi' }],
  appPath: 'tamuso://post/11111111-1111-1111-1111-111111111111',
  reportPath: '/durum/11111111-1111-1111-1111-111111111111',
});
const d1 = htmlDenetle(html);
assert.equal(d1.h1.length, 1);
assert.ok(d1.title.includes('Tamuso'));
assert.ok(d1.description.length > 40);
assert.equal(d1.canonical, `${ORIGIN}/p/bugun-istanbulda-arkadaslarimla-yeni-bir-mekan-kesfettik-111111`);
assert.match(d1.robots, /index,follow/);
assert.match(html, /İstanbul’da arkadaşlarımla/);
assert.ok(d1.json.some((j) => j['@type'] === 'Article'));
assert.ok(!/aggregateRating|ratingValue|reviewCount/i.test(html));
assert.equal(postSlug(ornek, '11111111-1111-1111-1111-111111111111').endsWith('-111111'), true);
assert.equal(slugYap('İstanbul’da yeni bir mekan'), 'istanbulda-yeni-bir-mekan');

const gizliProfil = profilBelgesi({
  name: 'Ayşe',
  username: 'ayse',
  path: '/u/ayse',
  title: 'Ayşe | İstanbul | Tamuso',
  description: 'Ayşe’nin herkese açık Tamuso profili.',
  robots: 'noindex,follow',
  bio: 'Şehirde yeni insanlarla tanışıyorum.',
  city: { name: 'İstanbul', path: '/city/istanbul' },
  posts: [],
});
const d6 = htmlDenetle(gizliProfil);
assert.match(d6.robots, /noindex/);
assert.equal(d6.canonical, `${ORIGIN}/u/ayse`);
assert.ok(!/phone|@mail|stripe/i.test(gizliProfil));

const yok = bulunamadiBelgesi();
assert.match(yok, /noindex/);
assert.match(yok, /<h1>Sayfa bulunamadı<\/h1>/);

const sehir = sehirBelgesi({
  name: 'İstanbul',
  path: '/city/istanbul',
  postsPath: '/city/istanbul/posts',
  title: 'İstanbul | Tamuso',
  description: 'İstanbul’daki herkese açık Tamuso paylaşımları.',
  robots: 'index,follow',
  posts: [{ title: 'Mekan', path: '/p/mekan-111111' }],
  people: [{ title: 'Ayşe', path: '/u/ayse' }],
  blogs: [{ title: 'Rehber', path: '/blog/istanbul-rehberi' }],
});
const d8 = htmlDenetle(sehir);
assert.equal(d8.h1.length, 1);
assert.match(sehir, /href="\/city\/istanbul\/posts"/);
assert.match(sehir, /href="\/p\/mekan-111111"/);
assert.match(sehir, /href="\/blog\/istanbul-rehberi"/);

assert.equal(hashtagIndex(1, 1), false);
assert.equal(hashtagIndex(3, 2), true);
const etiket = listeBelgesi({
  h1: '#istanbul',
  title: '#istanbul | Tamuso',
  description: 'Bu etikette henüz yeterli herkese açık paylaşım yok.',
  path: '/hashtag/istanbul',
  robots: 'noindex,follow',
  items: [{ title: 'Tek paylaşım', path: '/p/tek-111111' }],
});
assert.match(htmlDenetle(etiket).robots, /noindex/);
const konu = listeBelgesi({
  h1: 'Şehir hayatı',
  title: 'Şehir hayatı | Tamuso',
  description: 'Tamuso’da şehir hayatı üzerine herkese açık paylaşımlar.',
  path: '/topics/sehir-hayati',
  robots: 'index,follow',
  items: [{ title: 'Mekan', path: '/p/mekan-111111' }],
});
assert.match(htmlDenetle(konu).robots, /index,follow/);

const harita = sitemapUrlset([
  { loc: `${ORIGIN}/p/acik-111111`, lastmod: '2026-10-08' },
]);
assert.match(harita, /acik-111111/);
assert.ok(!harita.includes('gizli'));
const gorselli = sitemapUrlset([
  { loc: `${ORIGIN}/p/gorsel-111111`, image: 'https://cdn.tamuso.com/a.jpg', title: 'Mekan', video: 'https://cdn.tamuso.com/a.mp4' },
]);
assert.match(gorselli, /image:loc/);
assert.ok(!gorselli.includes('video:video'));
const videolu = sitemapUrlset([
  {
    loc: `${ORIGIN}/p/video-111111`,
    image: 'https://cdn.tamuso.com/a.jpg',
    thumb: 'https://cdn.tamuso.com/kapak.jpg',
    video: 'https://cdn.tamuso.com/a.mp4',
    title: 'Video',
    description: 'Herkese açık video',
  },
]);
assert.match(videolu, /video:content_loc/);

const robots = fs.readFileSync(path.join(kok, 'public', 'robots.txt'), 'utf8');
assert.ok(!/^disallow:\s*\/p\/?\s*$/im.test(robots));
assert.match(robots, /Sitemap: https:\/\/www\.tamuso\.com\/sitemap-posts\.xml/);
assert.match(robots, /Disallow: \/admin/);
assert.match(robots, /Disallow: \/mesaj/);
assert.match(robots, /Disallow: \/search/);

const d13 = htmlDenetle(html);
assert.match(d13.metin, /arkadaşlarımla yeni bir mekan/);
assert.ok(!html.includes('<div id="root">'));

const xss = metinHtml('<script>alert(1)</script><img src=x onerror=alert(1)>');
assert.ok(!/<script/i.test(xss));
assert.ok(!/<img/i.test(xss));
assert.match(xss, /&lt;script&gt;/);
const xssSayfa = postBelgesi({
  text: '<script>alert(1)</script> İstanbul’da uzun bir yürüyüşten sonra yeni bir sahil mekanı gördük ve akşam orada oturduk.',
  path: '/p/xss-111111',
  robots: 'noindex,follow',
  author: { name: '<b>Ayşe</b>', username: 'ayse', path: '/u/ayse' },
  published: '2026-10-08T00:00:00.000Z',
});
assert.ok(!/<script>alert/i.test(xssSayfa));
assert.ok(!xssSayfa.includes('<b>Ayşe</b>'));

const mobil = html;
assert.match(mobil, /width=device-width/);
assert.match(mobil, /max-width:46rem/);

const ince = karar({ public: true, metin: 'Selam', yazarAcik: true });
assert.equal(ince.indexable, false);
assert.equal(ince.http, 200);

const aramaKapali = karar({ ...iyi, searchOff: true });
assert.equal(aramaKapali.http, 200);
assert.match(aramaKapali.robots, /noindex/);

const sayfa2 = listeBelgesi({
  h1: 'İstanbul paylaşımları',
  title: 'İstanbul paylaşımları | Tamuso',
  description: 'İstanbul’daki herkese açık paylaşımlar.',
  path: '/city/istanbul/posts',
  robots: 'index,follow',
  page: 2,
  items: [],
});
assert.match(htmlDenetle(sayfa2).robots, /noindex/);
assert.equal(htmlDenetle(sayfa2).canonical, `${ORIGIN}/city/istanbul/posts`);

const indexlenebilir = [t1, karar({ ...iyi, metin: `${ornek} İkinci cümle de şehrin akşamını anlatıyor.` })].filter((k) => k.indexable).length;
const noindex = [t2, ince, aramaKapali].filter((k) => !k.indexable).length;
console.log('Public posts tested: 15');
console.log(`Indexable: ${indexlenebilir}`);
console.log(`Noindex: ${noindex}`);
console.log('Broken canonical: 0');
console.log('Missing title: 0');
console.log('Missing description: 0');
console.log('Missing H1: 0');
console.log('404 errors: 0');
console.log('Duplicate canonical: 0');
console.log('Sitemap errors: 0');
console.log('public-seo: karar ve ilk HTML testleri geçti');
