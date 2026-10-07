import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';

export type PkMacBaslatSonuc =
  | { ok: true; matchId: string; endsAt: string | null }
  | { ok: false; hata: string };

/** Host: 1v1 PK başlat (oda veya canlı) */
export async function PkMacBaslat(input: {
  pkType?: string;
  roomAId?: string;
  roomBId?: string;
  liveAId?: string;
  liveBId?: string;
  sureSaniye?: number;
}): Promise<PkMacBaslatSonuc> {
  const { data, error } = await supabase.rpc('pk_mac_baslat', {
    p_pk_type: input.pkType ?? '1v1',
    p_room_a_id: input.roomAId ?? null,
    p_room_b_id: input.roomBId ?? null,
    p_live_a_id: input.liveAId ?? null,
    p_live_b_id: input.liveBId ?? null,
    p_sure_saniye: input.sureSaniye ?? 300,
  });
  if (error) return { ok: false, hata: error.message };
  const row = data as { id?: string; ends_at?: string | null };
  if (!row?.id) return { ok: false, hata: i18n.t('pk.macOlusturulamadi') };
  return { ok: true, matchId: row.id, endsAt: row.ends_at ?? null };
}

/** Süre dolunca PK biter. Yayın oturumu açık kalır. Erken bitirme yok. */
export async function PkMacSuresiDoldu(matchId: string): Promise<{
  ok: boolean;
  status?: string;
  winner?: string | null;
  hata?: string;
}> {
  const { data, error } = await supabase.rpc('pk_mac_suresi_doldu', {
    p_match_id: matchId,
  });
  if (error) return { ok: false, hata: error.message };
  const row = data as { status?: string; winner_side?: string | null } | null;
  return {
    ok: true,
    status: row?.status,
    winner: row?.winner_side ?? null,
  };
}

export async function PkMacBitir(
  matchId: string,
): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('pk_mac_bitir', {
    p_match_id: matchId,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}
