/**
 * Oda hediyelerini yorum kartı satırına dönüştür.
 */
import { supabase } from '../../../lib/supabase';
import type { CanliSohbetMesajGorunum } from '../../canli-sohbet/bilesenler/CanliSohbetMesajKarti';
import { HediyeAdiCevir } from '../katalog/HediyeAdiCevir';
import i18n from '../../../i18n';

type GiftJoin = {
  id: string;
  name: string | null;
  emoji: string | null;
  code?: string | null;
};

type ProfilJoin = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  level?: number | null;
};

export function OdaHediyeYorumSatiriOlustur(opts: {
  id: string;
  senderId: string;
  createdAt: string;
  quantity: number;
  emoji: string;
  name: string;
  displayName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  level?: number | null;
  aliciAd?: string | null;
}): CanliSohbetMesajGorunum {
  const adet = Math.max(1, opts.quantity);
  const adetMetin = adet > 1 ? ` ×${adet}` : '';
  return {
    id: `gift:${opts.id}`,
    user_id: opts.senderId,
    body: opts.aliciAd
      ? i18n.t('sesOda.hediyeSatir', {
          emoji: opts.emoji,
          ad: opts.name,
          adet: adetMetin,
          alici: opts.aliciAd,
        })
      : i18n.t('mesajSohbet.hediyeGonderdi', {
          emoji: opts.emoji,
          ad: opts.name,
          adet: adetMetin,
        }),
    created_at: opts.createdAt,
    display_name: opts.displayName ?? null,
    username: opts.username ?? null,
    avatar_url: opts.avatarUrl ?? null,
    level: typeof opts.level === 'number' ? opts.level : null,
    tur: 'gift',
    gift_emoji: opts.emoji,
    gift_name: opts.name,
    gift_quantity: adet,
  };
}

/** Son oda hediyeleri → yorum satırı (kronolojik eskiden yeniye) */
export async function OdaHediyeYorumSatirlariniGetir(
  roomId: string,
  limit = 40,
): Promise<CanliSohbetMesajGorunum[]> {
  const { data, error } = await supabase
    .from('gift_transactions')
    .select(
      `
      id,
      sender_id,
      quantity,
      created_at,
      gift:gifts ( id, name, emoji, code ),
      sender:profiles!sender_id ( id, display_name, username, avatar_url, level ),
      receiver:profiles!receiver_id ( id, display_name, username )
    `,
    )
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  const rows = ((data as any[]) ?? []).reverse();
  return rows.map((row) => {
    const gift = (row.gift as GiftJoin | null) ?? null;
    const sender = (row.sender as ProfilJoin | null) ?? null;
    const receiver = (row.receiver as ProfilJoin | null) ?? null;
    const emoji = gift?.emoji?.trim() || '🎁';
    const name = HediyeAdiCevir(gift?.code, gift?.name) || gift?.name || 'Gift';
    const aliciAd =
      receiver?.display_name?.trim() || receiver?.username?.trim() || null;
    return OdaHediyeYorumSatiriOlustur({
      id: String(row.id),
      senderId: String(row.sender_id),
      createdAt: String(row.created_at),
      quantity: Number(row.quantity) || 1,
      emoji,
      name,
      displayName: sender?.display_name,
      username: sender?.username,
      avatarUrl: sender?.avatar_url,
      level: sender?.level,
      aliciAd,
    });
  });
}
