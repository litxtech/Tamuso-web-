import { supabase } from '../../../lib/supabase';

export type AjansAjansCoinPaket = {
  id: string;
  package_key: string;
  title: string;
  liste_fiyat_try: number;
  odenecek_try: number;
  coins: number;
  indirim_yuzde: number;
  sort_order: number;
  is_active: boolean;
};

function rpcHata(error: { message?: string } | null): never {
  throw new Error(error?.message ?? 'Ajans paket işlemi başarısız');
}

/** Yetkili ajansın kendi ajans paket kataloğu (şablondan kopyalanır). */
export async function AjansAjansPaketKatalogu(
  agencyId: string,
): Promise<AjansAjansCoinPaket[]> {
  const { data, error } = await supabase.rpc('ajans_ajans_paket_katalogu', {
    p_agency_id: agencyId,
  });
  if (error) rpcHata(error);
  return (Array.isArray(data) ? data : []) as AjansAjansCoinPaket[];
}

export async function AjansAjansPaketGuncelle(input: {
  agencyId: string;
  id: string;
  title?: string | null;
  listeFiyatTry?: number | null;
  coins?: number | null;
  indirimYuzde?: number | null;
  sortOrder?: number | null;
  isActive?: boolean | null;
}): Promise<AjansAjansCoinPaket> {
  const { data, error } = await supabase.rpc('ajans_ajans_paket_guncelle', {
    p_agency_id: input.agencyId,
    p_id: input.id,
    p_title: input.title ?? null,
    p_liste_fiyat_try: input.listeFiyatTry ?? null,
    p_coins: input.coins ?? null,
    p_indirim_yuzde: input.indirimYuzde ?? null,
    p_sort_order: input.sortOrder ?? null,
    p_is_active: input.isActive ?? null,
  });
  if (error) rpcHata(error);
  const paket = (data as { paket?: AjansAjansCoinPaket })?.paket;
  if (!paket) throw new Error('Ajans paketi güncellenemedi');
  return paket;
}
