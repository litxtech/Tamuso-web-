import { supabase } from '../../../lib/supabase';
import { KatalogCache } from '../../../ortak/onbellek/KatalogCache';

export type GeoSehir = {
  id: string;
  country_code: string;
  name: string;
  slug: string;
  timezone: string | null;
  is_active: boolean;
  supporter_count: number;
  power_score: number;
  plate_code?: string | null;
};

export async function SehirleriGetir(limit = 100): Promise<GeoSehir[]> {
  return KatalogCache.getOrFetch(`geo_cities:TR:${limit}`, async () => {
    // Tercihen 81 TR plaka sirasi
    const tr = await supabase.rpc('tr_sehirleri_listesi');
    if (!tr.error && Array.isArray(tr.data) && tr.data.length) {
      return (tr.data as any[]).slice(0, limit).map((r) => ({
        id: r.id,
        country_code: r.country_code ?? 'TR',
        name: r.name,
        slug: r.slug,
        timezone: 'Europe/Istanbul',
        is_active: true,
        supporter_count: Number(r.supporter_count) || 0,
        power_score: Number(r.power_score) || 0,
        plate_code: r.plate_code ?? null,
      }));
    }

    const { data, error } = await supabase
      .from('geo_cities')
      .select(
        'id, country_code, name, slug, timezone, is_active, supporter_count, power_score',
      )
      .eq('is_active', true)
      .eq('country_code', 'TR')
      .order('name')
      .limit(limit);
    if (error) throw error;
    return ((data as GeoSehir[]) ?? []).map((r) => ({
      ...r,
      plate_code: (r as GeoSehir).plate_code ?? null,
    }));
  });
}

/** Keşif araması: ada göre en fazla 8 aktif şehir. İlçe veya koordinat dönmez. */
export async function SehirAdiAra(sorgu: string): Promise<GeoSehir[]> {
  const q = sorgu.trim().replace(/[%_\\]/g, '').slice(0, 40);
  if (q.length < 2) return [];
  const { data, error } = await supabase
    .from('geo_cities')
    .select('id, country_code, name, slug, timezone, is_active, supporter_count, power_score')
    .eq('is_active', true)
    .ilike('name', `%${q}%`)
    .order('supporter_count', { ascending: false })
    .limit(8);
  if (error) return [];
  return (data as GeoSehir[]) ?? [];
}

export async function SehirUlkeleriniGetir() {
  return KatalogCache.getOrFetch('geo_countries:active', async () => {
    const { data, error } = await supabase
      .from('geo_countries')
      .select('code, name, is_active, profile_enabled, sort_order')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data ?? [];
  });
}
