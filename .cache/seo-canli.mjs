const ORIGIN = 'https://www.tamuso.com';

async function bas(url, opt) {
  const res = await fetch(url, { redirect: 'manual', ...opt });
  const text = res.status >= 300 && res.status < 400 ? '' : await res.text();
  return { url, status: res.status, loc: res.headers.get('location'), type: res.headers.get('content-type'), cc: res.headers.get('cache-control'), text };
}

function say(html, ad, re) {
  const m = [...html.matchAll(re)];
  return { ad, adet: m.length, ornek: m.slice(0, 4).map((x) => x[1] || x[0]) };
}

const hedefler = [
  `${ORIGIN}/robots.txt`,
  `${ORIGIN}/sitemap.xml`,
  `${ORIGIN}/sitemap-blog.xml`,
  'https://tamuso.com/',
  `${ORIGIN}/`,
  `${ORIGIN}/blog`,
  `${ORIGIN}/en/blog`,
];

const out = [];
for (const url of hedefler) {
  const r = await bas(url);
  const html = r.text || '';
  const ozet = {
    url,
    status: r.status,
    loc: r.loc,
    type: r.type,
    cc: r.cc,
    boyut: html.length,
  };
  if (html.includes('<html') || html.includes('<urlset') || html.startsWith('User-agent') || html.startsWith('<?xml')) {
    ozet.lang = (html.match(/<html[^>]*lang="([^"]+)"/i) || [])[1] || '';
    ozet.viewport = /name="viewport"/.test(html);
    ozet.og = say(html, 'og', /property="og:([^"]+)"/g).adet;
    ozet.jsonld = (html.match(/application\/ld\+json/g) || []).length;
    ozet.hreflang = [...html.matchAll(/hreflang="([^"]+)"/g)].map((m) => m[1]);
    ozet.h1adet = (html.match(/<h1[\s>]/gi) || []).length;
    ozet.canonical = (html.match(/rel="canonical" href="([^"]+)"/) || [])[1] || '';
    if (url.endsWith('robots.txt')) ozet.govde = html.slice(0, 500);
    if (url.includes('sitemap')) {
      ozet.loclar = [...html.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    }
    if (url.endsWith('/blog') || url.endsWith('/en/blog')) {
      ozet.title = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
      ozet.h1 = (html.match(/<h1>([^<]*)<\/h1>/) || [])[1];
      ozet.kart = (html.match(/class="kart"/g) || []).length;
      ozet.yaziYok = html.includes('Henüz') || html.includes('No published');
    }
  }
  out.push(ozet);
}
console.log(JSON.stringify(out, null, 2));
