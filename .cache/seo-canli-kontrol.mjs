const urls = [
  'https://www.tamuso.com/countries',
  'https://www.tamuso.com/cities',
  'https://www.tamuso.com/voices',
  'https://www.tamuso.com/robots.txt',
  'https://www.tamuso.com/sitemap-countries.xml',
  'https://www.tamuso.com/',
  'https://www.tamuso.com/admin/seo-anahtar',
];

for (const u of urls) {
  const r = await fetch(u, { redirect: 'manual' });
  const t = await r.text();
  const h1 = (t.match(/<h1[^>]*>([^<]+)/) || [])[1] || '';
  const canon = (t.match(/rel="canonical" href="([^"]+)/) || [])[1] || '';
  console.log(r.status, u.replace('https://www.tamuso.com', '') || '/', 'len', t.length, 'h1', h1.slice(0, 70));
  if (canon) console.log('  canonical', canon);
  if (u.endsWith('robots.txt')) {
    console.log('  countries sitemap', t.includes('sitemap-countries.xml'));
    console.log('  voices sitemap', t.includes('sitemap-voices.xml'));
    console.log('  disallow ulke', t.includes('Disallow: /ulke'));
    console.log('  disallow city', t.includes('Disallow: /city'));
  }
  if (u.endsWith('.xml')) console.log('  url count', (t.match(/<loc>/g) || []).length);
}
