import { supabase } from '../../../lib/supabase';

export type MikrofonIstegi = {
  id: string;
  room_id: string;
  user_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  created_at: string;
  requested_seat_index?: number | null;
  istek_turu?: 'koltuk' | 'mikrofon' | null;
  profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    vip_level?: number | null;
  } | null;
};

function profilNormalize(
  p: unknown,
): MikrofonIstegi['profile'] {
  if (!p) return null;
  const row = Array.isArray(p) ? p[0] : p;
  if (!row || typeof row !== 'object') return null;
  return row as NonNullable<MikrofonIstegi['profile']>;
}

export async function MikrofonIstekleriniGetir(
  odaId: string,
): Promise<MikrofonIstegi[]> {
  const { data, error } = await supabase
    .from('room_mic_requests')
    .select(
      'id, room_id, user_id, status, created_at, requested_seat_index, istek_turu, profile:profiles(display_name, username, avatar_url)',
    )
    .eq('room_id', odaId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(40);
  if (error) throw error;

  let liste: MikrofonIstegi[] = ((data as unknown[]) ?? []).map((row) => {
    const r = row as MikrofonIstegi & { profile?: unknown };
    return { ...r, profile: profilNormalize(r.profile) };
  });

  const eksikIds = [
    ...new Set(
      liste
        .filter((s) => s.user_id && !s.profile)
        .map((s) => s.user_id),
    ),
  ];
  if (eksikIds.length > 0) {
    const { data: profiller } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .in('id', eksikIds);
    if (profiller?.length) {
      const pMap = new Map(
        profiller.map((p) => [
          p.id as string,
          {
            display_name: (p.display_name as string | null) ?? null,
            username: (p.username as string | null) ?? null,
            avatar_url: (p.avatar_url as string | null) ?? null,
          },
        ]),
      );
      liste = liste.map((s) =>
        s.profile ? s : { ...s, profile: pMap.get(s.user_id) ?? null },
      );
    }
  }

  return liste;
}
