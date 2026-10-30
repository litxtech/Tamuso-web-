import { supabase } from '../../../lib/supabase';

export type ProfilHediyeKalemi = {
  ad: string;
  emoji: string;
  adet: number;
  coin: number;
};

export type ProfilHediyeGonderen = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  adet: number;
  coin: number;
  son: string | null;
  hediyeler: ProfilHediyeKalemi[];
};

export type ProfilAlinanHediyeler = {
  gizli: boolean;
  toplam_adet: number;
  toplam_coin: number;
  gonderenler: ProfilHediyeGonderen[];
};

function sayi(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function kalem(raw: unknown): ProfilHediyeKalemi {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    ad: typeof r.ad === 'string' ? r.ad : '',
    emoji: typeof r.emoji === 'string' ? r.emoji : '',
    adet: sayi(r.adet),
    coin: sayi(r.coin),
  };
}

function gonderen(raw: unknown): ProfilHediyeGonderen | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (typeof r.user_id !== 'string' || !r.user_id) return null;
  const hediyeler = Array.isArray(r.hediyeler) ? r.hediyeler.map(kalem) : [];
  return {
    user_id: r.user_id,
    display_name: typeof r.display_name === 'string' ? r.display_name : null,
    username: typeof r.username === 'string' ? r.username : null,
    avatar_url: typeof r.avatar_url === 'string' ? r.avatar_url : null,
    adet: sayi(r.adet),
    coin: sayi(r.coin),
    son: typeof r.son === 'string' ? r.son : null,
    hediyeler,
  };
}

export async function ProfilAlinanHediyeleriGetir(
  userId: string,
): Promise<ProfilAlinanHediyeler> {
  const { data, error } = await supabase.rpc('profil_alinan_hediyeler', {
    p_user_id: userId,
  });
  if (error) throw error;
  const r = (data ?? {}) as Record<string, unknown>;
  const gonderenler = Array.isArray(r.gonderenler)
    ? r.gonderenler
        .map(gonderen)
        .filter((g): g is ProfilHediyeGonderen => !!g)
    : [];
  return {
    gizli: r.gizli === true,
    toplam_adet: sayi(r.toplam_adet),
    toplam_coin: sayi(r.toplam_coin),
    gonderenler,
  };
}
