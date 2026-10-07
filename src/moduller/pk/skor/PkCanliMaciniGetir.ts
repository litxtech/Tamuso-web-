import { supabase } from '../../../lib/supabase';
import type { PkMacZengin, PkTarafOnizleme } from '../skor/PkSkorOku';

export type PkCanliMacDetay = PkMacZengin & {
  host_a_id: string | null;
  host_b_id: string | null;
  /** Rakip görüntüsü için LiveKit/Agora oda adı */
  oda_a: string | null;
  oda_b: string | null;
};

function odaAdi(live: LiveJoin | null | undefined): string | null {
  if (!live?.id) return null;
  const ad = live.livekit_room_name?.trim();
  return ad || `live_${live.id}`;
}

type LiveJoin = {
  id: string;
  title: string | null;
  host_id?: string | null;
  livekit_room_name?: string | null;
  host?: {
    id?: string | null;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

function tarafFromLive(l?: LiveJoin | null): PkTarafOnizleme | null {
  if (!l) return null;
  return {
    title: l.title,
    cover_url: l.host?.avatar_url ?? null,
    avatar_url: l.host?.avatar_url ?? null,
    host_name:
      l.host?.display_name?.trim() ||
      (l.host?.username ? `@${l.host.username}` : null),
  };
}

/** Canlı oturumun aktif PK maçını getir (hediye hedefi + skor için) */
export async function PkCanliMaciniGetir(
  liveSessionId: string,
): Promise<PkCanliMacDetay | null> {
  const { data, error } = await supabase
    .from('pk_matches')
    .select(
      `
      id, pk_type, status, score_a, score_b, started_at, ends_at,
      room_a_id, room_b_id, live_a_id, live_b_id,
      live_a:live_sessions!pk_matches_live_a_id_fkey(
        id, title, host_id, livekit_room_name,
        host:profiles!live_sessions_host_id_fkey(id, display_name, username, avatar_url)
      ),
      live_b:live_sessions!pk_matches_live_b_id_fkey(
        id, title, host_id, livekit_room_name,
        host:profiles!live_sessions_host_id_fkey(id, display_name, username, avatar_url)
      )
    `,
    )
    .eq('status', 'live')
    .or(`live_a_id.eq.${liveSessionId},live_b_id.eq.${liveSessionId}`)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as any;
  const liveA = (Array.isArray(row.live_a) ? row.live_a[0] : row.live_a) as
    | LiveJoin
    | null;
  const liveB = (Array.isArray(row.live_b) ? row.live_b[0] : row.live_b) as
    | LiveJoin
    | null;

  return {
    id: row.id,
    pk_type: row.pk_type,
    status: row.status,
    score_a: Number(row.score_a ?? 0),
    score_b: Number(row.score_b ?? 0),
    started_at: row.started_at,
    ends_at: row.ends_at,
    room_a_id: row.room_a_id,
    room_b_id: row.room_b_id,
    live_a_id: row.live_a_id,
    live_b_id: row.live_b_id,
    side_a: tarafFromLive(liveA),
    side_b: tarafFromLive(liveB),
    host_a_id: liveA?.host_id ?? liveA?.host?.id ?? null,
    host_b_id: liveB?.host_id ?? liveB?.host?.id ?? null,
    oda_a: odaAdi(liveA),
    oda_b: odaAdi(liveB),
  };
}
