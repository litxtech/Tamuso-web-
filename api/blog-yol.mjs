/**
 * Statik dosyası olmayan blog adresi.
 * Yayın varsa 200 HTML, eski slug 301, yoksa 404. Kabuk sayfası dönmez.
 */
import { bulunamadiBelgesi, yaziBelgesi } from '../scripts/blog-motor.mjs';
import { blogYolu, herkeseAcikMi, indexlenebilirMi } from '../scripts/blog-dil.mjs';

function basliklar() {
  const anahtar = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  return { apikey: anahtar, authorization: `Bearer ${anahtar}` };
}

async function getir(yol) {
  const kok = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!kok) return null;
  const yanit = await fetch(`${kok}/rest/v1/${yol}`, { headers: basliklar() });
  if (!yanit.ok) return null;
  return yanit.json();
}

export default async function handler(istek, yanit) {
  const url = new URL(istek.url, 'https://www.tamuso.com');
  const slug = url.searchParams.get('slug') || '';
  const dil = url.searchParams.get('lang') || 'tr';
  const yol = blogYolu(dil, slug);
  const yonler = (await getir(`blog_path_redirects?old_path=eq.${encodeURIComponent(yol)}&select=new_path,status_code`)) || [];
  if (yonler[0]?.new_path) {
    yanit.statusCode = yonler[0].status_code || 301;
    yanit.setHeader('Location', yonler[0].new_path);
    yanit.end();
    return;
  }
  if (dil === 'tr') {
    const eski = (await getir(`blog_redirects?from_slug=eq.${encodeURIComponent(slug)}&select=to_slug`)) || [];
    if (eski[0]?.to_slug) {
      yanit.statusCode = 301;
      yanit.setHeader('Location', blogYolu('tr', eski[0].to_slug));
      yanit.end();
      return;
    }
  }
  const diller = (await getir('blog_languages?select=code,is_active,is_publishable,locale,dir')) || [];
  const satirlar = (await getir(`blog_posts?language_code=eq.${encodeURIComponent(dil)}&slug=eq.${encodeURIComponent(slug)}&select=title,slug,excerpt,content_html,cover_image_url,cover_image_alt,language_code,status,published_at,updated_at,seo_title,meta_description,canonical_url,og_image_url,robots_index,author_name,content_group_id,blog_categories(name,slug),blog_faqs(question,answer,sort_order),blog_post_cities(city_id,city_name),blog_videos(title,description,thumbnail_url,upload_date,duration_iso,embed_url,content_url),blog_authors(name,slug,kind,bio,avatar_url,avatar_alt)`)) || [];
  const yazi = satirlar[0];
  const dilKaydi = diller.find((d) => d.code === dil);
  if (!yazi || !herkeseAcikMi(yazi) || (dilKaydi && !dilKaydi.is_active)) {
    yanit.statusCode = 404;
    yanit.setHeader('Content-Type', 'text/html; charset=utf-8');
    yanit.setHeader('X-Robots-Tag', 'noindex, nofollow');
    yanit.end(bulunamadiBelgesi());
    return;
  }
  const kardes = yazi.content_group_id
    ? (await getir(`blog_posts?content_group_id=eq.${yazi.content_group_id}&select=language_code,slug,status,published_at,robots_index`)) || []
    : [];
  const html = yaziBelgesi({
    ...yazi,
    robots_index: indexlenebilirMi(yazi, dilKaydi),
    kategori: Array.isArray(yazi.blog_categories) ? yazi.blog_categories[0] : yazi.blog_categories,
    faqs: yazi.blog_faqs || [],
    sehirler: yazi.blog_post_cities || [],
    videolar: yazi.blog_videos || [],
    yazar: Array.isArray(yazi.blog_authors) ? yazi.blog_authors[0] : yazi.blog_authors,
    surumler: kardes,
    diller,
  }, []);
  yanit.statusCode = 200;
  yanit.setHeader('Content-Type', 'text/html; charset=utf-8');
  yanit.setHeader('X-Robots-Tag', yazi.robots_index === false ? 'noindex, follow' : 'index, follow');
  yanit.end(html);
}
