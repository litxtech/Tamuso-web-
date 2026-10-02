import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';

export type PkDavet = {
  id: string;
  from_live_id: string;
  to_live_id: string;
  from_host_id: string;
  to_host_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
  sure_saniye: number;
  match_id: string | null;
  created_at: string;
  expires_at: string;
  responded_at: string | null;
  from_host_name?: string | null;
  from_title?: string | null;
  from_avatar?: string | null;
};

export type PkDavetSonuc =
  | { ok: true; invite: PkDavet }
  | { ok: false; hata: string };

export type PkDavetYanitSonuc =
  | {
      ok: true;
      status: 'accepted' | 'rejected' | 'expired';
      inviteId: string;
      matchId?: string;
      endsAt?: string | null;
    }
  | { ok: false; hata: string };

/** Canlı yayıncı: başka canlıya TikTok tarzı PK daveti gönder */
export async function PkDavetGonder(input: {
  fromLiveId: string;
  toLiveId: string;
  sureSaniye?: number;
}): Promise<PkDavetSonuc> {
  const { data, error } = await supabase.rpc('pk_davet_gonder', {
    p_from_live_id: input.fromLiveId,
    p_to_live_id: input.toLiveId,
    p_sure_saniye: input.sureSaniye ?? 300,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true, invite: data as PkDavet };
}

export async function PkDavetYanitla(input: {
  inviteId: string;
  kabul: boolean;
}): Promise<PkDavetYanitSonuc> {
  const { data, error } = await supabase.rpc('pk_davet_yanitla', {
    p_invite_id: input.inviteId,
    p_kabul: input.kabul,
  });
  if (error) return { ok: false, hata: error.message };
  const row = data as {
    ok?: boolean;
    status?: string;
    invite_id?: string;
    match_id?: string;
    ends_at?: string | null;
  };
  if (!row?.ok && row?.status === 'expired') {
    return {
      ok: true,
      status: 'expired',
      inviteId: row.invite_id ?? input.inviteId,
    };
  }
  if (!row?.ok) return { ok: false, hata: i18n.t('pk.davetYanitlanamadi') };
  return {
    ok: true,
    status: (row.status as 'accepted' | 'rejected') ?? 'rejected',
    inviteId: row.invite_id ?? input.inviteId,
    matchId: row.match_id,
    endsAt: row.ends_at ?? null,
  };
}

export async function PkDavetIptal(
  inviteId: string,
): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('pk_davet_iptal', {
    p_invite_id: inviteId,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

/** Bana gelen bekleyen PK daveti (canlı yayın sırasında) */
export async function PkBekleyenDavetiGetir(
  toHostId: string,
): Promise<PkDavet | null> {
  const { data, error } = await supabase
    .from('pk_invites')
    .select(
      `
      id, from_live_id, to_live_id, from_host_id, to_host_id,
      status, sure_saniye, match_id, created_at, expires_at, responded_at,
      from_host:profiles!pk_invites_from_host_id_fkey(display_name, username, avatar_url),
      from_live:live_sessions!pk_invites_from_live_id_fkey(title)
    `,
    )
    .eq('to_host_id', toHostId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as any;
  const host = Array.isArray(row.from_host) ? row.from_host[0] : row.from_host;
  const live = Array.isArray(row.from_live) ? row.from_live[0] : row.from_live;
  return {
    id: row.id,
    from_live_id: row.from_live_id,
    to_live_id: row.to_live_id,
    from_host_id: row.from_host_id,
    to_host_id: row.to_host_id,
    status: row.status,
    sure_saniye: row.sure_saniye,
    match_id: row.match_id,
    created_at: row.created_at,
    expires_at: row.expires_at,
    responded_at: row.responded_at,
    from_host_name:
      host?.display_name?.trim() ||
      (host?.username ? `@${host.username}` : null),
    from_title: live?.title ?? null,
    from_avatar: host?.avatar_url ?? null,
  };
}
