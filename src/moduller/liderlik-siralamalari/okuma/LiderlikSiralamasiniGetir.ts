import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import { DilNormalizeEt } from '../../../i18n/diller';

export type SiralamaSatiri = {
  id: string;
  user_id: string | null;
  score: number;
  rank: number | null;
  board_type: string;
  period: string;
  period_key?: string;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  room_id?: string | null;
  room_title?: string | null;
  room_cover_url?: string | null;
  room_is_live?: boolean | null;
};

export type SiralamaBoard =
  | 'host'
  | 'gifter'
  | 'agency'
  | 'room'
  | 'top_recharge'
  | 'city'
  | 'city_supporter';

export type SiralamaPeriod = 'daily' | 'weekly' | 'monthly' | 'all_time';

/** Top Recharge ve Top Gifter AYRI board — profil alanlari dahil */
export async function LiderlikSiralamasiniGetir(input: {
  board: SiralamaBoard;
  period?: SiralamaPeriod;
  limit?: number;
}): Promise<SiralamaSatiri[]> {
  const period = input.period ?? 'weekly';
  const { data, error } = await supabase.rpc('liderlik_siralamasi_listele', {
    p_board_type: input.board,
    p_period: period,
    p_limit: input.limit ?? 50,
  });

  if (error) throw error;
  return ((data as SiralamaSatiri[]) ?? []).map((r) => ({
    ...r,
    score: Number(r.score) || 0,
    room_is_live: Boolean(r.room_is_live),
  }));
}

export async function LiderlikSiralamasiniYenile(
  board: SiralamaBoard,
  period: SiralamaPeriod = 'weekly',
): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('liderlik_siralamasi_yenile', {
    p_board_type: board,
    p_period: period,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

export function CoinSkoruFormatla(n: number, locale?: string | null): string {
  const tr = DilNormalizeEt(locale ?? i18n.language) === 'tr';
  if (n >= 1_000_000) {
    const s = (n / 1_000_000).toFixed(1);
    return tr ? `${s.replace('.', ',')}Mn` : `${s}M`;
  }
  if (n >= 10_000) {
    const k = Math.round(n / 1000);
    return tr ? `${k}B` : `${k}K`;
  }
  if (n >= 1000) {
    const s = (n / 1000).toFixed(1);
    return tr ? `${s.replace('.', ',')}B` : `${s}K`;
  }
  return String(n);
}
