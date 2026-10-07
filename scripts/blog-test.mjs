import assert from 'node:assert/strict';
import { blogYolu, hreflangleri, indexlenebilirMi, kanonikDil, yolKarari } from './blog-dil.mjs';
import { bulunamadiBelgesi, yaziBelgesi } from './blog-motor.mjs';

const diller = [
  { code: 'tr', is_active: true, is_publishable: true },
  { code: 'en', is_active: true, is_publishable: true },
  { code: 'de', is_active: false, is_publishable: true },
];

const tr = {
  language_code: 'tr',
  slug: 'trabzonda-yeni-insanlarla-tanisma',
  title: 'Trabzon’da Yeni İnsanlarla Tanışmanın 10 Yolu',
  excerpt: 'Trabzon sahilinde ve çarşıda yeni insanlarla tanışmak için uygulanabilir on yol.',
  content_html: '<p>Trabzon sahilinde insanlar buluşur.</p><h2>Sahil</h2><p>Uzun bir akşam yürüyüşü yeni sohbetler açar.</p>',
  status: 'yayinda',
  published_at: '2026-10-01T10:00:00.000Z',
  updated_at: '2026-10-02T10:00:00.000Z',
  robots_index: true,
  cover_image_url: 'https://www.tamuso.com/og.png',
  cover_image_alt: 'Trabzon sahilinde insanlar',
  author_name: 'Tamuso Yayın Ekibi',
  faqs: [{ question: 'Nerede?', answer: 'Sahilde.' }],
  sehirler: [{ city_id: '11111111-1111-1111-1111-111111111111', city_name: 'Trabzon' }],
};
const en = {
  ...tr,
  language_code: 'en',
  slug: 'meeting-new-people-in-trabzon',
  title: '10 Ways to Meet New People in Trabzon',
  excerpt: 'Practical ways to meet people along the Trabzon coast.',
  content_html: '<p>People meet by the coast in Trabzon.</p><h2>Coast</h2>',
  cover_image_alt: 'People by the coast in Trabzon',
  seo_title: '10 Ways to Meet New People in Trabzon | Tamuso',
  meta_description: 'Meet new people in Trabzon through coast walks, rooms, and city events.',
  canonical_url: 'https://www.tamuso.com/blog/trabzonda-yeni-insanlarla-tanisma',
};
tr.surumler = [tr, en];
tr.diller = diller;
en.surumler = [tr, en];
en.diller = diller;

assert.equal(blogYolu('tr', tr.slug), '/blog/trabzonda-yeni-insanlarla-tanisma');
assert.equal(blogYolu('en', en.slug), '/en/blog/meeting-new-people-in-trabzon');
assert.equal(kanonikDil('en', en.slug, en.canonical_url), 'https://www.tamuso.com/en/blog/meeting-new-people-in-trabzon');

const linkler = hreflangleri([tr, en, { ...tr, language_code: 'de', slug: 'neue', status: 'taslak', robots_index: false }], diller);
assert.deepEqual(linkler.map((l) => l.hreflang), ['tr', 'en', 'x-default']);
assert.equal(linkler.find((l) => l.hreflang === 'x-default').href, 'https://www.tamuso.com/blog/trabzonda-yeni-insanlarla-tanisma');

const html = yaziBelgesi(en, []);
assert.match(html, /<html lang="en"/);
assert.match(html, /rel="canonical" href="https:\/\/www\.tamuso\.com\/en\/blog\/meeting-new-people-in-trabzon"/);
assert.match(html, /hreflang="tr"/);
assert.match(html, /hreflang="en"/);
assert.match(html, /hreflang="x-default"/);
assert.doesNotMatch(html, /aggregateRating|reviewCount/);
assert.match(html, /"@type":"BlogPosting"/);
assert.match(html, /"inLanguage":"en"/);
assert.match(html, /"@type":"FAQPage"/);
assert.match(html, /"@type":"Organization"/);
assert.equal((html.match(/<h1/g) || []).length, 1);

const taslak = yolKarari({
  dil: 'en',
  slug: 'meeting-draft',
  yazilar: [{ ...en, status: 'taslak', published_at: null }],
  yonlendirmeler: [],
});
assert.equal(taslak.tip, 'yok');

const yon = yolKarari({
  dil: 'tr',
  slug: 'eski-yazi',
  yazilar: [],
  yonlendirmeler: [{ old_path: '/blog/eski-yazi', new_path: '/blog/yeni-yazi', status_code: 301 }],
});
assert.equal(yon.tip, 'yonlendir');
assert.equal(yon.hedef, '/blog/yeni-yazi');

const yok = yolKarari({ dil: 'tr', slug: 'boyle-bir-yazi-yok', yazilar: [], yonlendirmeler: [] });
assert.equal(yok.tip, 'yok');
assert.match(bulunamadiBelgesi(), /noindex,nofollow/);
assert.equal(indexlenebilirMi({ ...tr, status: 'taslak', published_at: null }, diller[0]), false);

const videoHtml = yaziBelgesi({
  ...tr,
  videolar: [{
    provider: 'youtube',
    title: 'Trabzon akşamı',
    description: 'Sahil yürüyüşü',
    thumbnail_url: 'https://www.tamuso.com/og.png',
    upload_date: '2026-10-01',
    embed_url: 'https://www.youtube-nocookie.com/embed/abcdef',
  }],
}, []);
assert.match(videoHtml, /"@type":"VideoObject"/);
assert.match(videoHtml, /data-embed=/);
assert.doesNotMatch(videoHtml, /autoplay/);

console.log('blog-test: tamam');
