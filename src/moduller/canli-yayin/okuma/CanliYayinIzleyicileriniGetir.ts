import { supabase } from '../../../lib/supabase';

export type CanliIzleyici = {
  user_id: string;
  joined_at: string | null;
  profile: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    level: number | null;
    is_verified?: boolean | null;
  } | null;
};

/** Anlık canlı yayın izleyicileri (live_session_viewers + profil). */
export async function CanliYayinIzleyicileriniGetir(
  sessionId: string,
): Promise<CanliIzleyici[]> {
  const { data, error } = await supabase
    .from('live_session_viewers')
    .select(
      `
      user_id,
      joined_at,
      profile:profiles!live_session_viewers_user_id_fkey (
        display_name,
        username,
        avatar_url,
        level,
        is_verified
      )
    `,
    )
    .eq('session_id', sessionId)
    .order('joined_at', { ascending: false })
    .limit(120);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const r = row as {
      user_id: string;
      joined_at: string | null;
      profile:
        | CanliIzleyici['profile']
        | CanliIzleyici['profile'][]
        | null;
    };
    const p = Array.isArray(r.profile) ? r.profile[0] ?? null : r.profile;
    return {
      user_id: r.user_id,
      joined_at: r.joined_at,
      profile: p,
    };
  });
}
