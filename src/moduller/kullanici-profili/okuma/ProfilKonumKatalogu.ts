import { supabase } from '../../../lib/supabase';

export type ProfilUlke = {
  code: string;
  name: string;
  sort_order: number;
};

export type ProfilBolge = {
  id: string;
  country_code: string;
  code: string;
  name: string;
  sort_order: number;
};

export type ProfilKonumKatalogu = {
  countries: ProfilUlke[];
  regions: ProfilBolge[];
};

/** DB: aktif ülkeler + profile_enabled bölgeler (TR illeri vb.) */
export async function ProfilKonumKatalogunuGetir(): Promise<ProfilKonumKatalogu> {
  const { data, error } = await supabase.rpc('profil_konum_katalogu');
  if (error) throw error;
  const row = (data ?? {}) as ProfilKonumKatalogu;
  return {
    countries: row.countries ?? [],
    regions: row.regions ?? [],
  };
}

export function BolgeleriUlkeyeGore(
  regions: ProfilBolge[],
  countryCode: string,
): ProfilBolge[] {
  return regions
    .filter((r) => r.country_code === countryCode)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'tr'));
}
