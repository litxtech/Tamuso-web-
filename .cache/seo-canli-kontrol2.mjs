const urls = [
  'https://www.tamuso.com/admin',
  'https://www.tamuso.com/admin/seo-icerik',
  'https://admin.tamuso.com/admin/seo-anahtar',
  'https://www.tamuso.com/country/tr',
  'https://www.tamuso.com/city/istanbul',
];
for (const u of urls) {
  const r = await fetch(u, { redirect: 'manual' });
  const t = await r.text();
  const h1 = (t.match(/<h1[^>]*>([^<]+)/) || [])[1] || '';
  const title = (t.match(/<title>([^<]+)/) || [])[1] || '';
  console.log(r.status, r.headers.get('location') || '', u, 'title', title.slice(0, 80), 'h1', h1.slice(0, 60), 'len', t.length);
}
