import { supabase } from '../../../lib/supabase';
import type { Room } from '../../../types/models';

export type OdaKatkiDonemi = 'daily' | 'weekly' | 'monthly';

export type OdaKatkiSatiri = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  hediye_coin: number;
  oyun_coin: number;
};

type OzetSatir = {
  room_id: string;
  hediye_coin: number | string;
  oyun_coin: number | string;
};

function sayi(v: number | string | null | undefined): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Kart önizlemesi: odaların toplam hediye ve oyun coinini bağlar. */
export async function OdaIslemOzetleriniBagla(odalar: Room[]): Promise<Room[]> {
  if (odalar.length === 0) return odalar;
  const ids = [...new Set(odalar.map((o) => o.id))].slice(0, 80);
  const { data, error } = await supabase.rpc('oda_islem_ozeti', {
    p_room_ids: ids,
  });
  if (error || !data) return odalar;
  const harita = new Map<string, { hediye: number; oyun: number }>();
  for (const satir of data as OzetSatir[]) {
    harita.set(satir.room_id, {
      hediye: sayi(satir.hediye_coin),
      oyun: sayi(satir.oyun_coin),
    });
  }
  return odalar.map((oda) => {
    const ozet = harita.get(oda.id);
    if (!ozet) return oda;
    return { ...oda, hediye_islem: ozet.hediye, oyun_islem: ozet.oyun };
  });
}

export async function OdaIslemOzetiGetir(
  roomId: string,
): Promise<{ hediye: number; oyun: number }> {
  const { data, error } = await supabase.rpc('oda_islem_ozeti', {
    p_room_ids: [roomId],
  });
  if (error || !data || !Array.isArray(data) || data.length === 0) {
    return { hediye: 0, oyun: 0 };
  }
  const satir = (data as OzetSatir[])[0]!;
  return { hediye: sayi(satir.hediye_coin), oyun: sayi(satir.oyun_coin) };
}

/** Oda içi: hediye atan ve oyun oynayan kullanıcılar. */
export async function OdaKatkiListesiniGetir(
  roomId: string,
  period: OdaKatkiDonemi,
): Promise<OdaKatkiSatiri[]> {
  const { data, error } = await supabase.rpc('oda_katki_listesi', {
    p_room_id: roomId,
    p_period: period,
  });
  if (error || !data) return [];
  return (data as OdaKatkiSatiri[]).map((s) => ({
    user_id: s.user_id,
    display_name: s.display_name,
    username: s.username,
    avatar_url: s.avatar_url,
    hediye_coin: sayi(s.hediye_coin),
    oyun_coin: sayi(s.oyun_coin),
  }));
}
