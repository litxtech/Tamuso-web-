import { supabase } from '../../lib/supabase';

export type SeoSatir = {
  id: string;
  content_id: string;
  slug: string;
  path: string | null;
  title: string | null;
  description: string | null;
  score: number;
  tier: number;
  indexable: boolean;
  reason: string;
  manual: string | null;
  sitemap_blocked: boolean;
  signals: { ad: string; tamam: boolean }[];
  canonical: string | null;
  og_image: string | null;
};

export type SeoOzet = {
  indexable_posts: number;
  noindex_posts: number;
  hidden_posts: number;
  indexable_profiles: number;
  indexable_cities: number;
};

export async function SeoOzetGetir(): Promise<SeoOzet | null> {
  const { data, error } = await supabase.rpc('seo_admin_ozet');
  if (error || !data || data.ok === false) return null;
  return data as SeoOzet;
}

export async function SeoListeGetir(filtre: string): Promise<SeoSatir[]> {
  const { data, error } = await supabase.rpc('seo_admin_liste', {
    p_filtre: filtre,
    p_sayfa: 1,
  });
  if (error || !data || data.ok === false) return [];
  const satirlar = (data as { satirlar?: SeoSatir[] }).satirlar;
  return Array.isArray(satirlar) ? satirlar : [];
}

export async function SeoGuncelle(id: string, alan: Record<string, unknown>) {
  const { data, error } = await supabase.rpc('seo_admin_guncelle', {
    p_id: id,
    p_alan: alan,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: Boolean((data as { ok?: boolean } | null)?.ok) };
}

export async function SeoKonuKaydet(slug: string, title: string, description: string, indexable: boolean) {
  const { data, error } = await supabase.rpc('seo_konu_kaydet', {
    p_slug: slug,
    p_title: title,
    p_description: description,
    p_indexable: indexable,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: Boolean((data as { ok?: boolean } | null)?.ok) };
}
