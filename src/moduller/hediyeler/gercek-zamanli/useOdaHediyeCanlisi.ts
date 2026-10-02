/**
 * Oda hediye realtime — diğer kullanıcıların hediyelerini animasyon kuyruğuna ekler.
 *
 * Ayni topic'e ikinci kez .on() eklemek (Strict Mode / remount / reconnect)
 * "cannot add postgres_changes callbacks after subscribe()" firlatir —
 * once eski kanali temizle, benzersiz topic kullan.
 */

import { useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Gift } from '../../../types/models';
import { ProfilMiniCache } from '../../kullanici-profili/onbellek/ProfilMiniCache';
import { HediyeAnimasyonuKuyrugu } from '../animasyon/HediyeAnimasyonuKuyrugu';
import { HediyeAdiCevir } from '../katalog/HediyeAdiCevir';

type GiftTxRow = {
  id: string;
  room_id: string | null;
  sender_id: string;
  receiver_id?: string | null;
  gift_id: string;
  quantity: number;
  coins_spent?: number;
};

function ayniOdaHediyeKanaliniTemizle(roomId: string) {
  const imza = `oda-hediye-${roomId}`;
  for (const ch of supabase.getChannels()) {
    const topic = ch.topic ?? '';
    if (topic === imza || topic === `realtime:${imza}` || topic.includes(imza)) {
      void supabase.removeChannel(ch);
    }
  }
}

export function useOdaHediyeCanlisi(params: {
  roomId: string | undefined;
  selfUserId: string | undefined;
  gifts: Gift[];
  enabled?: boolean;
}) {
  const { roomId, selfUserId, gifts, enabled = true } = params;
  const giftsRef = useRef(gifts);
  giftsRef.current = gifts;
  const gorulenRef = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled || !roomId) return;

    ayniOdaHediyeKanaliniTemizle(roomId);

    const topic = `oda-hediye-${roomId}-${Date.now().toString(36)}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      channel = supabase
        .channel(topic)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'gift_transactions',
            filter: `room_id=eq.${roomId}`,
          },
          (payload: { new: Record<string, unknown> }) => {
            const row = payload.new as unknown as GiftTxRow;
            if (!row?.id || !row.gift_id) return;
            if (gorulenRef.current.has(row.id)) return;
            gorulenRef.current.add(row.id);
            // Gönderen zaten lokal kuyruğa ekledi
            if (selfUserId && row.sender_id === selfUserId) return;

            void (async () => {
              const gift = giftsRef.current.find((g) => g.id === row.gift_id);
              const adet = Math.max(1, Number(row.quantity) || 1);
              const coin =
                Number(row.coins_spent) || (gift ? gift.coin_cost * adet : 0);

              const profil = await ProfilMiniCache.al(row.sender_id);
              const alici = row.receiver_id
                ? await ProfilMiniCache.al(row.receiver_id)
                : null;

              const aliciAd = alici ? ProfilMiniCache.gosterimAdi(alici) : null;
              HediyeAnimasyonuKuyrugu.ekle({
                id: `rt_${row.id}`,
                giftId: row.gift_id,
                emoji: gift?.emoji ?? '🎁',
                name: HediyeAdiCevir(gift?.code, gift?.name),
                senderName: ProfilMiniCache.gosterimAdi(profil),
                receiverName: aliciAd,
                alicilar: aliciAd
                  ? [{ ad: aliciAd, avatarUrl: alici?.avatar_url ?? null }]
                  : undefined,
                durationMs: gift?.duration_ms ?? (adet > 1 ? 2600 : 2200),
                fullScreen: !!(gift?.full_screen || coin >= 999 || adet >= 77),
                coinCost: gift?.coin_cost ?? coin,
                quantity: adet,
                animationUrl: gift?.animation_url,
                animationType: gift?.animation_type,
              });
            })();
          },
        )
        .subscribe();
    } catch {
      channel = null;
    }

    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [enabled, roomId, selfUserId]);
}
