/**
 * Üretimdeki site haritası URL'lerinin ilk HTML yanıtını ölçer.
 * node scripts/seo-http-olc.mjs
 */
const ORIGIN = 'https://www.tamuso.com';

function al(html, re) {
  const m = html.match(re);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

function govde(html) {
  const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const ic = m ? m[1] : '';
  return ic
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function olc(url) {
  const res = await fetch(url, { redirect: 'follow' });
  const html = await res.text();
  const metin = govde(html);
  return {
    url,
    status: res.status,
    final: res.url,
    type: res.headers.get('content-type') || '',
    title: al(html, /<title>([^<]*)<\/title>/i),
    desc: al(html, /<meta name="description" content="([^"]*)"/i),
    canonical: al(html, /<link rel="canonical" href="([^"]+)"/i),
    robots: al(html, /<meta name="robots" content="([^"]+)"/i),
    h1: al(html, /<h1>([^<]*)<\/h1>/i),
    govde: metin.slice(0, 180),
    govdeUzunluk: metin.length,
  };
}

const sitemap = await (await fetch(`${ORIGIN}/sitemap.xml`)).text();
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const satirlar = [];
for (const url of locs) {
  satirlar.push(await olc(url));
}
const yok = await fetch(`${ORIGIN}/this-route-does-not-exist-123`, { redirect: 'manual' });
console.log(JSON.stringify({ sayfa: satirlar.length, yokStatus: yok.status, yokLoc: yok.headers.get('location'), satirlar }, null, 2));
