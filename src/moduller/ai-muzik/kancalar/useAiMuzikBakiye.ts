import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import { AiMuzikBakiyeGetir } from '../islemler/AiMuzikApi';
import type { AiMuzikBakiye } from '../tipler';

const BOS: AiMuzikBakiye = {
  available_seconds: 0,
  reserved_seconds: 0,
  lifetime_granted_seconds: 0,
  lifetime_purchased_seconds: 0,
  lifetime_welcome_seconds: 0,
  lifetime_consumed_seconds: 0,
};

/**
 * AI müzik bakiyesi + realtime.
 * Not: channel adı her mount’ta unique olmalı — aynı topic’e
 * subscribe sonrası tekrar `.on()` eklenemez (Strict Mode / remount).
 */
export function useAiMuzikBakiye() {
  const [bakiye, setBakiye] = useState<AiMuzikBakiye>(BOS);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const yenile = useCallback(async () => {
    try {
      setHata(null);
      const row = await AiMuzikBakiyeGetir();
      setBakiye(row);
    } catch (e) {
      setHata(e instanceof Error ? e.message : i18n.t('aiMuzik.bakiyeAlinamadi'));
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    void yenile();
  }, [yenile]);

  useEffect(() => {
    let iptal = false;
    let kanal: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id ?? null;
      if (iptal || !userId) return;

      // Unique topic — remount’ta eski subscribed kanalı yeniden kullanma
      const topic = `ai-music-balance:${userId}:${Date.now()}`;
      kanal = supabase
        .channel(topic)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ai_music_balances',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            if (!iptal) void yenile();
          },
        )
        .subscribe();
    })();

    return () => {
      iptal = true;
      if (kanal) void supabase.removeChannel(kanal);
    };
  }, [yenile]);

  return { bakiye, yukleniyor, hata, yenile };
}
