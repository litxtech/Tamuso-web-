/**
 * Indexlenebilir public içerik site haritaları.
 * noindex, gizli ve kaldırılmış adresler yazılmaz.
 */
import { sitemapIndex, sitemapUrlset } from '../scripts/public-seo-motor.mjs';

const AILE = {
  posts: 'posts',
  profiles: 'profiles',
  cities: 'cities',
  topics: 'topics',
};

function basliklar() {
  const anahtar = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  return { apikey: anahtar, authorization: `Bearer ${anahtar}`, 'content-type': 'application/json' };
}

export default async function handler(istek, yanit) {
  const url = new URL(istek.url, 'https://www.tamuso.com');
  const tur = AILE[url.searchParams.get('tur')] || 'posts';
  const sayfa = Math.max(1, Math.min(50, Number(url.searchParams.get('sayfa') || '1') || 1));
  const kok = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  let paket = { toplam: 0, urls: [] };
  if (kok) {
    const yanitApi = await fetch(`${kok}/rest/v1/rpc/seo_sitemap_oku`, {
      method: 'POST',
      headers: basliklar(),
      body: JSON.stringify({ p_tur: tur, p_sayfa: sayfa }),
    });
    if (yanitApi.ok) paket = await yanitApi.json();
  }
  const toplam = Number(paket?.toplam || 0);
  const urls = Array.isArray(paket?.urls) ? paket.urls : [];
  let xml;
  if (sayfa === 1 && toplam > 1000) {
    const adet = Math.ceil(toplam / 1000);
    xml = sitemapIndex(Array.from({ length: adet }, (_, i) => `https://www.tamuso.com/sitemap-${tur}-${i + 1}.xml`));
  } else {
    xml = sitemapUrlset(urls.filter((u) => typeof u.loc === 'string' && u.loc.startsWith('https://www.tamuso.com/')));
  }
  yanit.statusCode = 200;
  yanit.setHeader('Content-Type', 'application/xml; charset=utf-8');
  yanit.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  yanit.end(xml);
}
