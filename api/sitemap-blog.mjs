/**
 * Yayınlanan blog adresleri. Her istekte veritabanından okunur.
 */
import { siteHaritasi } from '../scripts/blog-motor.mjs';
import { blogKok, indexlenebilirMi } from '../scripts/blog-dil.mjs';

function basliklar() {
  const anahtar = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  return { apikey: anahtar, authorization: `Bearer ${anahtar}` };
}

export default async function handler(_istek, yanit) {
  const kok = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const bos = siteHaritasi([], [], [], [], 1);
  if (!kok) {
    yanit.statusCode = 200;
    yanit.setHeader('Content-Type', 'application/xml; charset=utf-8');
    yanit.setHeader('Cache-Control', 'public, max-age=60');
    yanit.end(bos);
    return;
  }
  const simdi = encodeURIComponent(new Date().toISOString());
  const [yaziYanit, dilYanit] = await Promise.all([
    fetch(`${kok}/rest/v1/blog_posts?status=in.(yayinda,planlandi)&published_at=lte.${simdi}&select=slug,language_code,updated_at,published_at,robots_index,cover_image_url&order=published_at.desc&limit=500`, { headers: basliklar() }),
    fetch(`${kok}/rest/v1/blog_languages?select=code,is_active,is_publishable`, { headers: basliklar() }),
  ]);
  const gelen = yaziYanit.ok ? await yaziYanit.json() : [];
  const diller = dilYanit.ok ? await dilYanit.json() : [];
  const harita = new Map((Array.isArray(diller) ? diller : []).map((d) => [d.code, d]));
  const yazilar = (Array.isArray(gelen) ? gelen : []).filter((y) => indexlenebilirMi(y, harita.get(y.language_code)));
  const kokler = [...new Set(yazilar.map((y) => y.language_code || 'tr'))]
    .filter((kod) => kod !== 'tr')
    .map((kod) => ({ yol: blogKok(kod) }));
  const xml = siteHaritasi(kokler, yazilar, [], [], 1);
  yanit.statusCode = 200;
  yanit.setHeader('Content-Type', 'application/xml; charset=utf-8');
  yanit.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  yanit.end(xml);
}
