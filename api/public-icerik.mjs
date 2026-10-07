/**
 * Public post, profil, şehir, etiket ve konu HTML'i.
 * İlk yanıtta içerik bulunur; Expo kabuğu kullanılmaz.
 */
import {
  bulunamadiBelgesi,
  listeBelgesi,
  postBelgesi,
  profilBelgesi,
  sehirBelgesi,
} from '../scripts/public-seo-motor.mjs';

function basliklar() {
  const anahtar = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  return { apikey: anahtar, authorization: `Bearer ${anahtar}`, 'content-type': 'application/json' };
}

function sayfaNo(url) {
  const ham = Number(url.searchParams.get('page') || url.searchParams.get('sayfa') || '1');
  if (!Number.isFinite(ham) || ham < 1) return 1;
  return Math.min(20, Math.floor(ham));
}

function htmlYanit(yanit, kod, govde, robot, onbellek) {
  yanit.statusCode = kod;
  yanit.setHeader('Content-Type', 'text/html; charset=utf-8');
  yanit.setHeader('X-Robots-Tag', robot);
  yanit.setHeader('Cache-Control', onbellek);
  yanit.setHeader('Vary', 'Accept-Encoding');
  yanit.end(govde);
}

function belge(veri) {
  if (!veri || veri.tur === 'post') return postBelgesi(veri);
  if (veri.tur === 'profile') return profilBelgesi(veri);
  if (veri.tur === 'city' || veri.tur === 'city_posts') return sehirBelgesi(veri);
  return listeBelgesi(veri);
}

export default async function handler(istek, yanit) {
  const url = new URL(istek.url, 'https://www.tamuso.com');
  const tur = url.searchParams.get('tur') || '';
  const slug = url.searchParams.get('slug') || '';
  const sayfa = sayfaNo(url);
  const kok = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!kok || !['post', 'profile', 'city', 'city_posts', 'hashtag', 'topic', 'discover', 'people'].includes(tur)) {
    return htmlYanit(yanit, 404, bulunamadiBelgesi(), 'noindex, nofollow', 'no-store');
  }
  let veri = null;
  try {
    const yanitApi = await fetch(`${kok}/rest/v1/rpc/seo_public_oku`, {
      method: 'POST',
      headers: basliklar(),
      body: JSON.stringify({ p_tur: tur, p_slug: slug, p_sayfa: sayfa }),
    });
    veri = yanitApi.ok ? await yanitApi.json() : null;
  } catch {
    veri = null;
  }
  if (!veri || veri.durum === 'yok' || veri.http === 404) {
    return htmlYanit(yanit, 404, bulunamadiBelgesi(), 'noindex, nofollow', 'no-store');
  }
  if (veri.durum === 'yonlendir' && typeof veri.hedef === 'string' && veri.hedef.startsWith('/')) {
    yanit.statusCode = veri.http || 301;
    yanit.setHeader('Location', veri.hedef);
    yanit.setHeader('Cache-Control', 'public, max-age=300');
    yanit.end();
    return;
  }
  const html = belge(veri);
  const robot = veri.robots || 'noindex, follow';
  const onbellek = robot.startsWith('index')
    ? 'public, max-age=60, must-revalidate'
    : 'no-store';
  return htmlYanit(yanit, 200, html, robot, onbellek);
}
