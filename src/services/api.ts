import { supabase } from '../lib/supabase';
import type { CoinPackage, Gift, Room, RoomSeat } from '../types/models';

/** Feed/liste için dar kolon seti — tam profil/join yükünü taşımaz */
const CANLI_ODA_LISTE_SELECT =
  'id, host_id, title, topic, cover_url, mode, max_seats, is_live, is_locked, listener_count, total_coins_earned, created_at, room_code, host:profiles!rooms_host_id_fkey(id, display_name, username, avatar_url, level)';

export async function fetchLiveRooms(
  limit = 30,
  mode?: Room['mode'] | null,
): Promise<Room[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 80);
  let q = supabase
    .from('rooms')
    .select(CANLI_ODA_LISTE_SELECT)
    .eq('is_live', true)
    .order('listener_count', { ascending: false })
    .limit(safeLimit);

  if (mode) {
    q = q.eq('mode', mode);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data as Room[]) ?? [];
}

export async function createRoom(input: {
  hostId: string;
  title: string;
  topic?: string;
  coverUrl?: string | null;
  mode: Room['mode'];
  maxSeats?: number;
  layoutCode?: string;
  themeCode?: string;
  capacityTierCode?: string;
  audienceCapacity?: number;
  microphoneCapacity?: number;
}): Promise<Room> {
  // Host başına tek canlı oda
  const mevcut = await supabase
    .from('rooms')
    .select('id, title')
    .eq('host_id', input.hostId)
    .eq('is_live', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (mevcut.data?.id) {
    const err = new Error('MEVCUT_CANLI_ODA') as Error & {
      code: string;
      roomId: string;
      roomTitle?: string;
    };
    err.code = 'MEVCUT_CANLI_ODA';
    err.roomId = mevcut.data.id;
    err.roomTitle = mevcut.data.title ?? undefined;
    throw err;
  }

  const maxSeats = Math.min(
    Math.max(input.maxSeats ?? input.microphoneCapacity ?? 8, 2),
    20,
  );

  const temel = {
    host_id: input.hostId,
    title: input.title,
    topic: input.topic ?? null,
    cover_url: input.coverUrl ?? null,
    mode: input.mode,
    max_seats: maxSeats,
    is_live: true,
  };

  const genis = {
    ...temel,
    layout_code: input.layoutCode ?? 'floating_glass',
    theme_code: input.themeCode ?? 'midnight_plum',
    capacity_tier_code: input.capacityTierCode ?? 'social',
    audience_capacity: input.audienceCapacity ?? 250,
    microphone_capacity: input.microphoneCapacity ?? maxSeats,
  };

  let data: Room | null = null;
  let error: { message: string; code?: string } | null = null;

  const genisDeneme = await supabase.from('rooms').insert(genis).select('*').single();
  if (genisDeneme.error) {
    // Kolon yoksa (migration eksik) temel alanlarla dene
    const kod = genisDeneme.error.code ?? '';
    const mesaj = genisDeneme.error.message ?? '';
    if (kod === 'PGRST204' || /column|schema cache/i.test(mesaj)) {
      const temelDeneme = await supabase.from('rooms').insert(temel).select('*').single();
      data = (temelDeneme.data as Room) ?? null;
      error = temelDeneme.error;
    } else {
      error = genisDeneme.error;
    }
  } else {
    data = genisDeneme.data as Room;
  }

  if (error || !data) {
    const mesaj = error?.message ?? 'Oda olusturulamadi';
    if (/rooms_host_tek_canli|duplicate key|unique/i.test(mesaj)) {
      const tekrar = await supabase
        .from('rooms')
        .select('id, title')
        .eq('host_id', input.hostId)
        .eq('is_live', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (tekrar.data?.id) {
        const err = new Error('MEVCUT_CANLI_ODA') as Error & {
          code: string;
          roomId: string;
          roomTitle?: string;
        };
        err.code = 'MEVCUT_CANLI_ODA';
        err.roomId = tekrar.data.id;
        err.roomTitle = tekrar.data.title ?? undefined;
        throw err;
      }
    }
    throw new Error(mesaj);
  }

  const seats = Array.from({ length: maxSeats }, (_, seat_index) => ({
    room_id: data!.id,
    seat_index,
    user_id: seat_index === 0 ? input.hostId : null,
  }));

  // Koltuk + üyelik paralel — oda açma süresini kısaltır
  const [seatsRes, memberRes] = await Promise.all([
    supabase.from('room_seats').insert(seats),
    supabase.from('room_members').insert({
      room_id: data.id,
      user_id: input.hostId,
      role: 'host',
    }),
  ]);

  if (seatsRes.error) {
    await supabase.from('rooms').delete().eq('id', data.id);
    throw new Error(seatsRes.error.message || 'Koltuklar olusturulamadi');
  }

  if (memberRes.error) {
    // Host zaten uye olabilir — kritik degil; oda kalsin
    const tekrar = await supabase
      .from('room_members')
      .select('room_id')
      .eq('room_id', data.id)
      .eq('user_id', input.hostId)
      .maybeSingle();
    if (!tekrar.data) {
      await supabase.from('rooms').delete().eq('id', data.id);
      throw new Error(memberRes.error.message || 'Host uyeligi olusturulamadi');
    }
  }

  return data;
}

export async function fetchRoom(roomId: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*, host:profiles!rooms_host_id_fkey(*)')
    .eq('id', roomId)
    .maybeSingle();
  if (error) throw error;
  return data as Room | null;
}

export async function fetchRoomSeats(roomId: string): Promise<RoomSeat[]> {
  const [seatsRes, membersRes] = await Promise.all([
    supabase
      .from('room_seats')
      .select(
        '*, profile:profiles!room_seats_user_id_fkey(id, display_name, username, avatar_url, level, is_verified)',
      )
      .eq('room_id', roomId)
      .order('seat_index'),
    supabase
      .from('room_members')
      .select('user_id, role')
      .eq('room_id', roomId),
  ]);

  let seatRows = seatsRes.data;
  if (seatsRes.error || !seatRows) {
    // FK adı farklı ortamlarda kırılabilir — genel join'e düş
    const yedek = await supabase
      .from('room_seats')
      .select(
        '*, profile:profiles(id, display_name, username, avatar_url, level, is_verified)',
      )
      .eq('room_id', roomId)
      .order('seat_index');
    if (yedek.error) throw yedek.error;
    seatRows = yedek.data;
  }

  const roleMap = new Map<string, string>();
  for (const m of membersRes.data ?? []) {
    if (m.user_id) roleMap.set(m.user_id as string, m.role as string);
  }

  const profilNormalize = (
    p: RoomSeat['profile'] | RoomSeat['profile'][] | null | undefined,
  ): RoomSeat['profile'] | null => {
    if (!p) return null;
    if (Array.isArray(p)) return (p[0] as RoomSeat['profile']) ?? null;
    return p;
  };

  let seats = ((seatRows as RoomSeat[]) ?? []).map((s) => {
    const role = s.user_id ? roleMap.get(s.user_id) : undefined;
    return {
      ...s,
      profile: profilNormalize(s.profile as RoomSeat['profile']),
      member_role: (role as RoomSeat['member_role']) ?? null,
      is_cohost: role === 'cohost',
    };
  });

  // Profil join bazen null döner — dolu koltuk boş gibi görünmesin
  const eksikIds = [
    ...new Set(
      seats
        .filter((s) => s.user_id && !s.profile)
        .map((s) => s.user_id as string),
    ),
  ];
  if (eksikIds.length > 0) {
    const { data: profiller } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url, level, is_verified')
      .in('id', eksikIds);
    if (profiller?.length) {
      const pMap = new Map(profiller.map((p) => [p.id as string, p]));
      seats = seats.map((s) =>
        s.user_id && !s.profile && pMap.has(s.user_id)
          ? { ...s, profile: pMap.get(s.user_id) as RoomSeat['profile'] }
          : s,
      );
    }
  }

  return seats;
}

export async function joinRoom(
  roomId: string,
  userId: string,
  role: 'host' | 'listener' = 'listener',
) {
  // Server-side block + room_ban + hesap kontrolü
  const { error: rpcErr } = await supabase.rpc('oda_uye_katil', {
    p_room_id: roomId,
    p_role: role,
  });
  if (!rpcErr) return;

  // Eski remote fallback
  const { data: oda } = await supabase
    .from('rooms')
    .select('is_live')
    .eq('id', roomId)
    .maybeSingle();
  if (oda && oda.is_live === false) {
    throw new Error('Bu ses odası kapatıldı');
  }

  const { data: mevcut } = await supabase
    .from('room_members')
    .select('room_id, role')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .maybeSingle();

  if (mevcut) return;

  const { error } = await supabase.from('room_members').insert({
    room_id: roomId,
    user_id: userId,
    role,
  });
  if (error) {
    if (error.code === '23505') return;
    throw error.message ? new Error(error.message) : error;
  }
}

/** Odadan güvenli çıkış — koltuk + üyelik temizliği (RLS: security definer RPC) */
export async function leaveRoom(roomId: string, _userId?: string) {
  const { error } = await supabase.rpc('odadan_ayril', { p_room_id: roomId });
  if (!error) return;

  // RPC yoksa (eski remote): doğrudan deneme — koltuk host RLS ile sessizce başarısız olabilir
  const uid = _userId ?? (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return;
  await supabase
    .from('room_seats')
    .update({ user_id: null })
    .eq('room_id', roomId)
    .eq('user_id', uid);
  await supabase
    .from('room_members')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', uid);
}

export async function fetchGifts(): Promise<Gift[]> {
  const { HediyeKatalogunuGetir } = await import(
    '../moduller/hediyeler/okuma/HediyeKatalogunuGetir'
  );
  return HediyeKatalogunuGetir();
}

export async function fetchCoinPackages(): Promise<CoinPackage[]> {
  const { CoinPaketleriniGetir } = await import(
    '../moduller/cuzdan/okuma/CoinPaketleriniGetir'
  );
  return CoinPaketleriniGetir();
}

/** @deprecated HediyeGonder kullan — uyumluluk */
export async function sendGift(input: {
  roomId?: string | null;
  receiverId: string;
  giftId: string;
  quantity?: number;
}) {
  const { HediyeGonder } = await import('../moduller/hediyeler/islemler/HediyeGonder');
  const sonuc = await HediyeGonder(input);
  if (!sonuc.ok) throw new Error(sonuc.hata);
  return sonuc.transaction;
}
