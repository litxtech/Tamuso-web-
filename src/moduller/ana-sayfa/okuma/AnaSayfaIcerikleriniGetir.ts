import { supabase } from '../../../lib/supabase';
import type { Profile, Room, RoomMode } from '../../../types/models';
import { PerformansTelemetri } from '../../../ortak/performans/PerformansTelemetri';
import { CanliFeedCache } from '../onbellek/CanliFeedCache';

export type FeedOggesi = {
  id: string;
  tur: 'oda' | 'canli';
  title: string;
  topic?: string | null;
  mode?: RoomMode | string | null;
  listener_count: number;
  cover_url: string | null;
  host: Pick<
    Profile,
    'id' | 'display_name' | 'username' | 'avatar_url' | 'level'
  > | null;
  href: string;
  skor: number;
  created_at: string;
  popular?: boolean;
  /** Kendi oda/yayın — feed'de sabit üst sıra */
  kendim?: boolean;
  /** Ses odası önizleme — koltuktaki / üye avatarları (max 6) */
  uye_avatarlari?: (string | null)[];
};

type LiveRow = {
  id: string;
  host_id: string;
  title: string;
  mode: string | null;
  viewer_count?: number | null;
  like_count?: number | null;
  gift_count?: number | null;
  total_coins_earned?: number | null;
  score?: number | null;
  started_at?: string | null;
};

type HostRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  level: number | null;
};

/** Canlı odalar + canlı yayınlar → tek ana akım listesi */
const ODA_FEED_SELECT =
  'id, host_id, title, topic, cover_url, mode, listener_count, total_coins_earned, created_at, host:profiles!rooms_host_id_fkey(id, display_name, username, avatar_url, level)';

/** Embed join yok — created_at de yok (kolon tabloda yok) */
const CANLI_FEED_SELECT =
  'id, host_id, title, mode, viewer_count, like_count, gift_count, total_coins_earned, score, started_at';

function odaOgayaCevir(
  r: Room,
  kendim: boolean,
  uyeAvatarlari?: (string | null)[],
): FeedOggesi {
  const host = Array.isArray(r.host) ? r.host[0] : r.host;
  const hostAvatar = host?.avatar_url ?? null;
  const avatars =
    uyeAvatarlari && uyeAvatarlari.length > 0
      ? uyeAvatarlari
      : hostAvatar
        ? [hostAvatar]
        : [];
  return {
    id: `oda:${r.id}`,
    tur: 'oda',
    title: r.title,
    topic: r.topic,
    mode: r.mode,
    listener_count: r.listener_count ?? 0,
    cover_url: r.cover_url ?? hostAvatar,
    host: host
      ? {
          id: host.id,
          display_name: host.display_name,
          username: host.username,
          avatar_url: host.avatar_url,
          level: host.level,
        }
      : null,
    href: `/lobi/${r.id}`,
    skor:
      (r.listener_count ?? 0) * 10 +
      Math.min(r.total_coins_earned ?? 0, 5000) / 50,
    created_at: r.created_at,
    kendim,
    uye_avatarlari: avatars.slice(0, 6),
  };
}

/** Canlı odalardaki koltuk / üye avatar önizlemesi (oda_id → max 6) */
async function odaUyeAvatarHaritasiGetir(
  roomIds: string[],
): Promise<Map<string, (string | null)[]>> {
  const map = new Map<string, (string | null)[]>();
  if (roomIds.length === 0) return map;

  type SeatRow = {
    room_id: string;
    user_id: string | null;
    seat_index: number;
    profile: { avatar_url: string | null } | { avatar_url: string | null }[] | null;
  };

  const { data: seats, error: seatErr } = await supabase
    .from('room_seats')
    .select(
      'room_id, user_id, seat_index, profile:profiles!room_seats_user_id_fkey(avatar_url)',
    )
    .in('room_id', roomIds)
    .not('user_id', 'is', null)
    .order('seat_index', { ascending: true });

  if (seatErr) {
    console.warn('[FEED] room_seats avatars', seatErr.message);
  }

  const seen = new Map<string, Set<string>>();
  for (const s of (seats as SeatRow[]) ?? []) {
    if (!s.user_id) continue;
    const prof = Array.isArray(s.profile) ? s.profile[0] : s.profile;
    const list = map.get(s.room_id) ?? [];
    const ids = seen.get(s.room_id) ?? new Set<string>();
    if (ids.has(s.user_id) || list.length >= 6) continue;
    ids.add(s.user_id);
    seen.set(s.room_id, ids);
    list.push(prof?.avatar_url ?? null);
    map.set(s.room_id, list);
  }

  const eksik = roomIds.filter((id) => (map.get(id)?.length ?? 0) < 6);
  if (eksik.length === 0) return map;

  type MemRow = {
    room_id: string;
    user_id: string;
    joined_at: string;
    profile: { avatar_url: string | null } | { avatar_url: string | null }[] | null;
  };

  const { data: members, error: memErr } = await supabase
    .from('room_members')
    .select(
      'room_id, user_id, joined_at, profile:profiles!room_members_user_id_fkey(avatar_url)',
    )
    .in('room_id', eksik)
    .order('joined_at', { ascending: true })
    .limit(eksik.length * 8);

  if (memErr) {
    console.warn('[FEED] room_members avatars', memErr.message);
    return map;
  }

  for (const m of (members as MemRow[]) ?? []) {
    const list = map.get(m.room_id) ?? [];
    const ids = seen.get(m.room_id) ?? new Set<string>();
    if (ids.has(m.user_id) || list.length >= 6) continue;
    const prof = Array.isArray(m.profile) ? m.profile[0] : m.profile;
    ids.add(m.user_id);
    seen.set(m.room_id, ids);
    list.push(prof?.avatar_url ?? null);
    map.set(m.room_id, list);
  }

  return map;
}

function canliOgayaCevir(
  c: LiveRow,
  host: HostRow | null,
  kendim: boolean,
): FeedOggesi {
  const giftBoost =
    Math.min(Number(c.total_coins_earned ?? c.score ?? 0), 8000) / 40;
  const likeBoost = (c.like_count ?? 0) * 4;
  const giftCountBoost = (c.gift_count ?? 0) * 12;
  const skor =
    40 +
    (c.viewer_count ?? 0) * 8 +
    likeBoost +
    giftCountBoost +
    giftBoost;
  return {
    id: `canli:${c.id}`,
    tur: 'canli',
    title: c.title,
    mode: c.mode,
    listener_count: c.viewer_count ?? 0,
    cover_url: host?.avatar_url ?? null,
    host: host
      ? {
          id: host.id,
          display_name: host.display_name,
          username: host.username,
          avatar_url: host.avatar_url ?? null,
          level: host.level ?? 1,
        }
      : null,
    href: `/canli/${c.id}`,
    skor,
    popular: (c.gift_count ?? 0) > 0 || (c.like_count ?? 0) > 5 || skor >= 80,
    created_at: c.started_at ?? new Date().toISOString(),
    kendim,
  };
}

/**
 * Feed sıralaması:
 * 1) Kendi ses odası (sabit üst)
 * 2) Kendi canlı yayın
 * 3) Skor / tarih
 */
function feedSirala(ogeler: FeedOggesi[], selfUserId?: string | null): FeedOggesi[] {
  if (!selfUserId) {
    return [...ogeler].sort(
      (a, b) =>
        b.skor - a.skor ||
        b.created_at.localeCompare(a.created_at) ||
        a.id.localeCompare(b.id),
    );
  }
  return [...ogeler].sort((a, b) => {
    const aOda = a.kendim && a.tur === 'oda' ? 1 : 0;
    const bOda = b.kendim && b.tur === 'oda' ? 1 : 0;
    if (aOda !== bOda) return bOda - aOda;
    const aCanli = a.kendim && a.tur === 'canli' ? 1 : 0;
    const bCanli = b.kendim && b.tur === 'canli' ? 1 : 0;
    if (aCanli !== bCanli) return bCanli - aCanli;
    return (
      b.skor - a.skor ||
      b.created_at.localeCompare(a.created_at) ||
      a.id.localeCompare(b.id)
    );
  });
}

export async function CanliFeedGetir(
  limit = 40,
  selfUserId?: string | null,
  opts?: { uyeAvatar?: boolean; force?: boolean },
): Promise<FeedOggesi[]> {
  const odaLimit = Math.min(Math.max(limit, 1), 60);
  const canliLimit = Math.min(odaLimit, 24);
  const uid = selfUserId?.trim() || null;
  const uyeAvatar = opts?.uyeAvatar !== false;

  if (!opts?.force) {
    const cached = CanliFeedCache.al(odaLimit, uid, uyeAvatar);
    if (cached) return cached;
  }

  return PerformansTelemetri.olc('CanliFeedGetir', () =>
    canliFeedGetirIc(odaLimit, canliLimit, uid, uyeAvatar),
  );
}

async function canliFeedGetirIc(
  odaLimit: number,
  canliLimit: number,
  uid: string | null,
  uyeAvatar: boolean,
): Promise<FeedOggesi[]> {
  const limit = odaLimit;

  const [odalarRes, canliRes, kendiOdaRes, kendiCanliRes] = await Promise.all([
    supabase
      .from('rooms')
      .select(ODA_FEED_SELECT)
      .eq('is_live', true)
      .order('listener_count', { ascending: false })
      .limit(odaLimit),
    supabase
      .from('live_sessions')
      .select(CANLI_FEED_SELECT)
      .eq('is_live', true)
      .order('started_at', { ascending: false })
      .limit(canliLimit),
    uid
      ? supabase
          .from('rooms')
          .select(ODA_FEED_SELECT)
          .eq('is_live', true)
          .eq('host_id', uid)
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    uid
      ? supabase
          .from('live_sessions')
          .select(CANLI_FEED_SELECT)
          .eq('is_live', true)
          .eq('host_id', uid)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (odalarRes.error) {
    console.warn('[FEED] rooms', odalarRes.error.message);
  }
  if (canliRes.error) {
    console.warn('[FEED] live_sessions', canliRes.error.message);
  }

  const canliRows = (canliRes.data as LiveRow[]) ?? [];
  const hostIds = [
    ...new Set(
      [
        ...canliRows.map((c) => c.host_id),
        (kendiCanliRes.data as LiveRow | null)?.host_id,
      ].filter(Boolean) as string[],
    ),
  ];

  const odaRows = (odalarRes.data as unknown as Room[]) ?? [];
  const odaIds = [
    ...new Set(
      [
        ...odaRows.map((r) => r.id),
        (kendiOdaRes.data as Room | null)?.id,
      ].filter(Boolean) as string[],
    ),
  ];

  const [hostlarRes, avatarHarita, bloklarRes, tersRes] = await Promise.all([
    hostIds.length > 0
      ? supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url, level')
          .in('id', hostIds)
      : Promise.resolve({ data: [] as HostRow[], error: null }),
    uyeAvatar
      ? odaUyeAvatarHaritasiGetir(odaIds)
      : Promise.resolve(new Map<string, (string | null)[]>()),
    uid
      ? supabase.from('user_blocks').select('blocked_id').eq('blocker_id', uid)
      : Promise.resolve({ data: [] as { blocked_id: string }[] }),
    uid
      ? supabase.from('user_blocks').select('blocker_id').eq('blocked_id', uid)
      : Promise.resolve({ data: [] as { blocker_id: string }[] }),
  ]);

  const hostMap = new Map<string, HostRow>();
  if (hostlarRes.error) {
    console.warn('[FEED] live hosts', hostlarRes.error.message);
  } else {
    for (const h of (hostlarRes.data as HostRow[]) ?? []) {
      hostMap.set(h.id, h);
    }
  }

  const ogeler: FeedOggesi[] = [];
  const gorulen = new Set<string>();

  const engelli = new Set<string>();
  for (const b of (bloklarRes.data as { blocked_id: string }[]) ?? []) {
    engelli.add(b.blocked_id);
  }
  for (const b of (tersRes.data as { blocker_id: string }[]) ?? []) {
    engelli.add(b.blocker_id);
  }

  for (const r of odaRows) {
    if (engelli.has(r.host_id) && !(uid && r.host_id === uid)) continue;
    const kendim = !!uid && r.host_id === uid;
    const oge = odaOgayaCevir(r, kendim, avatarHarita.get(r.id));
    gorulen.add(oge.id);
    ogeler.push(oge);
  }

  // Kendi canlı odası limit dışı kalmasın — her zaman ekle / sabitle
  const kendiOda = kendiOdaRes.data as Room | null;
  if (kendiOda && uid) {
    const oge = odaOgayaCevir(kendiOda, true, avatarHarita.get(kendiOda.id));
    if (!gorulen.has(oge.id)) {
      ogeler.push(oge);
      gorulen.add(oge.id);
    } else {
      const i = ogeler.findIndex((x) => x.id === oge.id);
      if (i >= 0) ogeler[i] = { ...ogeler[i]!, kendim: true };
    }
  }

  for (const c of canliRows) {
    if (engelli.has(c.host_id) && !(uid && c.host_id === uid)) continue;
    const kendim = !!uid && c.host_id === uid;
    const oge = canliOgayaCevir(c, hostMap.get(c.host_id) ?? null, kendim);
    gorulen.add(oge.id);
    ogeler.push(oge);
  }

  const kendiCanli = kendiCanliRes.data as LiveRow | null;
  if (kendiCanli && uid) {
    const oge = canliOgayaCevir(
      kendiCanli,
      hostMap.get(kendiCanli.host_id) ?? null,
      true,
    );
    if (!gorulen.has(oge.id)) {
      ogeler.push(oge);
      gorulen.add(oge.id);
    } else {
      const i = ogeler.findIndex((x) => x.id === oge.id);
      if (i >= 0) ogeler[i] = { ...ogeler[i]!, kendim: true };
    }
  }

  const sonuc = feedSirala(ogeler, uid).slice(0, limit);
  CanliFeedCache.yaz(odaLimit, uid, uyeAvatar, sonuc);
  return sonuc;
}

const LEGACY_ODA_SELECT =
  'id, host_id, title, topic, cover_url, mode, listener_count, total_coins_earned, created_at, is_live, host:profiles!rooms_host_id_fkey(id, display_name, username, avatar_url, level)';

/** Geriye uyumluluk */
export async function CanliOdalariGetir(limit = 20): Promise<Room[]> {
  const { data, error } = await supabase
    .from('rooms')
    .select(LEGACY_ODA_SELECT)
    .eq('is_live', true)
    .order('listener_count', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as Room[]) ?? [];
}

export async function TrendOdalariGetir(limit = 10): Promise<Room[]> {
  const { data, error } = await supabase
    .from('rooms')
    .select(LEGACY_ODA_SELECT)
    .eq('is_live', true)
    .order('total_coins_earned', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as Room[]) ?? [];
}
