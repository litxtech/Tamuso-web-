/**
 * Blog listesi, yazı ve yazar sayfası. Veritabanından okunur; site derlemesi beklemez.
 * Yayın varsa 200 HTML, eski slug 301, yoksa 404.
 */
import { bulunamadiBelgesi, listeBelgesi, yaziBelgesi } from '../scripts/blog-motor.mjs';
import { blogKok, blogYolu, herkeseAcikMi, indexlenebilirMi } from '../scripts/blog-dil.mjs';

const GIRIS = {
  tr: 'Tamuso blogu; canlı yayın, ses odaları, hikâye, mesajlaşma, hediye ve uygulamanın sosyal özelliklerini günlük dille anlatır.',
  en: 'The Tamuso blog on meeting people, city life, and the app.',
  de: 'Der Tamuso-Blog über neue Bekanntschaften, Stadtleben und die App.',
  es: 'El blog de Tamuso sobre conocer gente, la vida en la ciudad y la app.',
  ar: 'مدونة Tamuso عن التعارف وحياة المدينة والتطبيق.',
  ru: 'Блог Tamuso о новых знакомствах, жизни в городе и приложении.',
};

const LISTE = 'title,slug,excerpt,cover_image_url,cover_image_alt,published_at,featured,language_code,robots_index,blog_categories(name,slug)';
const YAZI = 'title,slug,excerpt,content_html,cover_image_url,cover_image_alt,language_code,status,published_at,updated_at,seo_title,meta_description,canonical_url,og_image_url,robots_index,author_name,content_group_id,blog_author_id,blog_categories(name,slug),blog_faqs(question,answer,sort_order),blog_post_cities(city_id,city_name),blog_videos(title,description,thumbnail_url,upload_date,duration_iso,embed_url,content_url),blog_authors(name,slug,kind,bio,avatar_url,avatar_alt)';

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

function simdi() {
  return encodeURIComponent(new Date().toISOString());
}

function hazirKart(yazi) {
  return {
    ...yazi,
    kategori: Array.isArray(yazi.blog_categories) ? yazi.blog_categories[0] : yazi.blog_categories,
  };
}

function htmlYanit(yanit, kod, govde, robot) {
  yanit.statusCode = kod;
  yanit.setHeader('Content-Type', 'text/html; charset=utf-8');
  yanit.setHeader('X-Robots-Tag', robot);
  yanit.setHeader('Cache-Control', kod === 200 ? 'public, max-age=0, must-revalidate' : 'no-store');
  yanit.end(govde);
}

function bulunamadi(yanit) {
  htmlYanit(yanit, 404, bulunamadiBelgesi(), 'noindex, nofollow');
}

export default async function handler(istek, yanit) {
  const url = new URL(istek.url, 'https://www.tamuso.com');
  const slug = url.searchParams.get('slug') || '';
  const dil = (url.searchParams.get('lang') || 'tr').toLowerCase();
  const yazarSlug = url.searchParams.get('yazar') || '';
  const diller = (await getir('blog_languages?select=code,is_active,is_publishable,locale,dir')) || [];
  const dilKaydi = diller.find((d) => d.code === dil);

  if (yazarSlug) {
    const yazarlar = (await getir(`blog_authors?slug=eq.${encodeURIComponent(yazarSlug)}&select=id,name,slug,bio,kind,avatar_url,avatar_alt&limit=1`)) || [];
    const yazar = yazarlar[0];
    if (!yazar) return bulunamadi(yanit);
    const liste = (await getir(`blog_posts?blog_author_id=eq.${yazar.id}&status=in.(yayinda,planlandi)&published_at=lte.${simdi()}&select=${LISTE}&order=published_at.desc&limit=48`)) || [];
    const acik = liste.filter((y) => herkeseAcikMi(y));
    const html = listeBelgesi({
      yazilar: acik.map(hazirKart),
      sayfa: 1,
      sayfaSayisi: 1,
      baslik: yazar.name,
      aciklama: yazar.bio || yazar.name,
      canonical: `https://www.tamuso.com/yazar/${yazar.slug}`,
      robots: 'index,follow',
      giris: yazar.bio || '',
    });
    return htmlYanit(yanit, 200, html, 'index, follow');
  }

  if (!slug) {
    if (dilKaydi && !dilKaydi.is_active) return bulunamadi(yanit);
    const liste = (await getir(`blog_posts?language_code=eq.${encodeURIComponent(dil)}&status=in.(yayinda,planlandi)&published_at=lte.${simdi()}&select=${LISTE}&order=featured.desc,published_at.desc&limit=48`)) || [];
    const acik = liste.filter((y) => herkeseAcikMi(y));
    const kok = blogKok(dil);
    const html = listeBelgesi({
      yazilar: acik.map(hazirKart),
      sayfa: 1,
      sayfaSayisi: 1,
      baslik: 'Blog',
      aciklama: GIRIS[dil] || GIRIS.en,
      canonical: `https://www.tamuso.com${kok}`,
      robots: 'index,follow',
      giris: GIRIS[dil] || GIRIS.en,
    });
    return htmlYanit(yanit, 200, html, 'index, follow');
  }

  const yol = blogYolu(dil, slug);
  const yonler = (await getir(`blog_path_redirects?old_path=eq.${encodeURIComponent(yol)}&select=new_path,status_code`)) || [];
  if (yonler[0]?.new_path) {
    yanit.statusCode = yonler[0].status_code || 301;
    yanit.setHeader('Location', yonler[0].new_path);
    yanit.setHeader('Cache-Control', 'public, max-age=300');
    yanit.end();
    return;
  }
  if (dil === 'tr') {
    const eski = (await getir(`blog_redirects?from_slug=eq.${encodeURIComponent(slug)}&select=to_slug`)) || [];
    if (eski[0]?.to_slug) {
      yanit.statusCode = 301;
      yanit.setHeader('Location', blogYolu('tr', eski[0].to_slug));
      yanit.setHeader('Cache-Control', 'public, max-age=300');
      yanit.end();
      return;
    }
  }
  const satirlar = (await getir(`blog_posts?language_code=eq.${encodeURIComponent(dil)}&slug=eq.${encodeURIComponent(slug)}&select=${YAZI}`)) || [];
  const yazi = satirlar[0];
  if (!yazi || !herkeseAcikMi(yazi) || (dilKaydi && !dilKaydi.is_active)) return bulunamadi(yanit);
  const kardes = yazi.content_group_id
    ? (await getir(`blog_posts?content_group_id=eq.${yazi.content_group_id}&select=language_code,slug,status,published_at,robots_index`)) || []
    : [];
  const ilgiliHam = (await getir(`blog_posts?language_code=eq.${encodeURIComponent(dil)}&status=in.(yayinda,planlandi)&published_at=lte.${simdi()}&slug=neq.${encodeURIComponent(slug)}&select=${LISTE}&order=published_at.desc&limit=4`)) || [];
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
  }, ilgiliHam.filter((y) => herkeseAcikMi(y)).map(hazirKart));
  htmlYanit(yanit, 200, html, yazi.robots_index === false ? 'noindex, follow' : 'index, follow');
}
