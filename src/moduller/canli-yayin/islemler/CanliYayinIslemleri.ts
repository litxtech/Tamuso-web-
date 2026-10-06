import { supabase } from '../../../lib/supabase';

export async function CanliYayinBaslat(input: {
  title: string;
  mode?: string;
  category?: string | null;
  topic?: string | null;
}): Promise<{ ok: true; session: { id: string; livekit_room_name?: string } } | { ok: false; hata: string }> {
  const { data, error } = await supabase.rpc('canli_yayin_baslat', {
    p_title: input.title,
    p_mode: input.mode ?? 'solo',
    p_category: input.category ?? null,
    p_topic: input.topic ?? null,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true, session: data as { id: string; livekit_room_name?: string } };
}

/** LiveKit bağlandıktan sonra keşfete düşür (is_live=true) */
export async function CanliYayinAktifEt(
  sessionId: string,
): Promise<{ ok: true } | { ok: false; hata: string }> {
  const { error } = await supabase.rpc('canli_yayin_aktif_et', {
    p_session_id: sessionId,
  });
  if (!error) return { ok: true };

  // RPC başarısızsa doğrudan güncelle — keşfette görünürlük kritik
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return { ok: false, hata: error.message };

  const { error: upErr } = await supabase
    .from('live_sessions')
    .update({
      is_live: true,
      ended_at: null,
      started_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .eq('host_id', uid);

  if (upErr) return { ok: false, hata: error.message };
  return { ok: true };
}

/** Yayini bitir (RPC). sessionId yoksa kullanicinin aktif yayinini kapatir. */
export async function CanliYayinBitir(
  sessionId?: string | null,
): Promise<{ ok: true } | { ok: false; hata: string }> {
  const { error } = await supabase.rpc('canli_yayin_bitir', {
    p_session_id: sessionId ?? null,
  });
  if (error) {
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return { ok: false, hata: error.message };
    let q = supabase
      .from('live_sessions')
      .update({ is_live: false, ended_at: new Date().toISOString() })
      .eq('host_id', uid)
      .eq('is_live', true);
    if (sessionId) q = q.eq('id', sessionId);
    const fallback = await q;
    if (fallback.error) return { ok: false, hata: error.message };
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { CanliYayinActivityBitir } = require('../../tamuso-activity/entegrasyon/CanliYayinActivityBagla') as {
      CanliYayinActivityBitir: (id?: string) => Promise<void>;
    };
    void CanliYayinActivityBitir(sessionId ?? undefined);
  } catch {
    /* ignore */
  }
  return { ok: true };
}

export async function CanliYayinlariGetir(limit = 20) {
  const { data: userData } = await supabase.auth.getUser();
  const selfId = userData.user?.id ?? null;

  const { data, error } = await supabase
    .from('live_sessions')
    .select(
      [
        'id',
        'host_id',
        'title',
        'mode',
        'category',
        'topic',
        'viewer_count',
        'like_count',
        'gift_count',
        'total_coins_earned',
        'score',
        'started_at',
        'is_live',
        'livekit_room_name',
        'host:profiles!live_sessions_host_id_fkey(id, display_name, username, public_user_id, level, avatar_url)',
      ].join(', '),
    )
    .eq('is_live', true)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = [...((data as any[]) ?? [])];

  // Kendi yayın listenin en üstünde
  if (selfId) {
    const kendiIdx = rows.findIndex((r) => r.host_id === selfId);
    if (kendiIdx > 0) {
      const [kendi] = rows.splice(kendiIdx, 1);
      rows.unshift(kendi);
    } else if (kendiIdx < 0) {
      const { data: kendi } = await supabase
        .from('live_sessions')
        .select(
          [
            'id',
            'host_id',
            'title',
            'mode',
            'category',
            'topic',
            'viewer_count',
            'like_count',
            'gift_count',
            'total_coins_earned',
            'score',
            'started_at',
            'is_live',
            'livekit_room_name',
            'host:profiles!live_sessions_host_id_fkey(id, display_name, username, public_user_id, level, avatar_url)',
          ].join(', '),
        )
        .eq('is_live', true)
        .eq('host_id', selfId)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (kendi) rows.unshift(kendi);
    }
  }

  const pinned = selfId ? rows.filter((r) => r.host_id === selfId) : [];
  const diger = selfId ? rows.filter((r) => r.host_id !== selfId) : rows;
  diger.sort((a: any, b: any) => {
    const sa =
      Number(b.score ?? 0) +
      Number(b.gift_count ?? 0) * 10 +
      Number(b.like_count ?? 0) * 3 -
      (Number(a.score ?? 0) +
        Number(a.gift_count ?? 0) * 10 +
        Number(a.like_count ?? 0) * 3);
    return sa;
  });
  return [...pinned, ...diger].slice(0, limit);
}

export async function CanliYayinBegen(
  sessionId: string,
): Promise<{ ok: true; like_count: number; first: boolean } | { ok: false; hata: string }> {
  const { data, error } = await supabase.rpc('canli_yayin_begen', {
    p_session_id: sessionId,
  });
  if (error) return { ok: false, hata: error.message };
  const row = data as { like_count?: number; first?: boolean };
  return {
    ok: true,
    like_count: Number(row?.like_count ?? 0),
    first: !!row?.first,
  };
}

export async function CanliYayinIzleyiciGir(
  sessionId: string,
): Promise<{ ok: true; viewer_count: number } | { ok: false; hata: string }> {
  const { data, error } = await supabase.rpc('canli_yayin_izleyici_gir', {
    p_session_id: sessionId,
  });
  if (error) return { ok: false, hata: error.message };
  const row = data as { viewer_count?: number };
  return { ok: true, viewer_count: Number(row?.viewer_count ?? 0) };
}

export async function CanliYayinIzleyiciCik(
  sessionId: string,
): Promise<{ ok: true; viewer_count: number } | { ok: false; hata: string }> {
  const { data, error } = await supabase.rpc('canli_yayin_izleyici_cik', {
    p_session_id: sessionId,
  });
  if (error) return { ok: false, hata: error.message };
  const row = data as { viewer_count?: number };
  return { ok: true, viewer_count: Number(row?.viewer_count ?? 0) };
}

export async function CanliYayinModerasyon(input: {
  sessionId: string;
  targetUserId: string;
  action: 'kick' | 'ban' | 'unban';
  reason?: string;
}): Promise<{ ok: true } | { ok: false; hata: string }> {
  const { error } = await supabase.rpc('canli_yayin_moderasyon', {
    p_session_id: input.sessionId,
    p_target_user_id: input.targetUserId,
    p_action: input.action,
    p_reason: input.reason ?? null,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

export async function TakipCanliYayinlariGetir(limit = 40) {
  const { data, error } = await supabase.rpc('takip_canli_yayinlari', {
    p_limit: limit,
  });
  if (error) throw error;
  return (data as any[]) ?? [];
}
