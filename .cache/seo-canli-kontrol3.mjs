const r = await fetch('https://www.tamuso.com/sitemap-voices.xml');
const xml = await r.text();
const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
console.log('voices', locs.length);
console.log(locs.slice(0, 8).join('\n'));
const home = await fetch('https://www.tamuso.com/admin');
const html = await home.text();
console.log('admin has script', /<script/.test(html));
console.log(html.slice(0, 400));
const city = await fetch('https://www.tamuso.com/city/istanbul');
const c = await city.text();
const robots = (c.match(/name="robots" content="([^"]+)"/) || [])[1];
const href = [...c.matchAll(/hreflang="([^"]+)"/g)].map((m) => m[1]);
console.log('istanbul robots', robots, 'hreflang', href.join(','));
if (locs[1]) {
  const v = await fetch(locs[1]);
  const vt = await v.text();
  const h1 = (vt.match(/<h1[^>]*>([^<]+)/) || [])[1];
  const rb = (vt.match(/name="robots" content="([^"]+)"/) || [])[1];
  console.log('voice', v.status, h1, rb);
}
