import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';

export type KullaniciAktifOda = {
  roomId: string;
  title: string;
  coverUrl: string | null;
  listenerCount: number;
  isLive: boolean;
  role: string;
  roomCode: string | null;
};

/**
 * Kullanıcının şu an bulunduğu ses odası (room_members).
 * Canlı oda tercih edilir; yoksa en son katıldığı.
 */
export async function KullaniciAktifOdasiniGetir(
  userId: string,
): Promise<KullaniciAktifOda | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('room_members')
    .select(
      `
      role,
      joined_at,
      rooms:room_id (
        id,
        title,
        cover_url,
        listener_count,
        is_live,
        room_code
      )
    `,
    )
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })
    .limit(8);

  if (error || !data?.length) return null;

  type Satir = {
    role?: string;
    joined_at?: string;
    rooms?:
      | {
          id?: string;
          title?: string | null;
          cover_url?: string | null;
          listener_count?: number | null;
          is_live?: boolean | null;
          room_code?: string | null;
        }
      | {
          id?: string;
          title?: string | null;
          cover_url?: string | null;
          listener_count?: number | null;
          is_live?: boolean | null;
          room_code?: string | null;
        }[]
      | null;
  };

  const satirlar = data as Satir[];
  const normalize = (s: Satir): KullaniciAktifOda | null => {
    const raw = s.rooms;
    const oda = Array.isArray(raw) ? raw[0] : raw;
    if (!oda?.id) return null;
    return {
      roomId: oda.id,
      title: (oda.title ?? '').trim() || i18n.t('sesOda.sesOdasi'),
      coverUrl: oda.cover_url ?? null,
      listenerCount: Number(oda.listener_count) || 0,
      isLive: oda.is_live !== false,
      role: s.role ?? 'listener',
      roomCode: oda.room_code ?? null,
    };
  };

  const tum = satirlar.map(normalize).filter(Boolean) as KullaniciAktifOda[];
  if (!tum.length) return null;

  const canli = tum.find((o) => o.isLive);
  return canli ?? tum[0];
}
