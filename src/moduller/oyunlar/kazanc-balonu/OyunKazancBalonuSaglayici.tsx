import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { ProfilMiniCache } from '../../kullanici-profili/onbellek/ProfilMiniCache';
import { BenimHostOdamGetir } from './BenimHostOdam';
import { OyunKazancBalonu } from './OyunKazancBalonu';
import type { OyunKazancDuyurusu } from './OyunKazancDuyuruTipleri';

type RawRow = {
  id: string;
  user_id: string;
  room_id: string | null;
  game_code: string;
  game_title: string;
  win_amount: number;
  bet_amount: number;
  round_id: string | null;
  created_at: string;
};

/**
 * Uygulama geneli çentik-altı balon — push değil.
 * Tıklanınca kendi host odasına gidip oyunu açar.
 */
export function OyunKazancBalonuSaglayici() {
  const { user } = useAuth();
  const [aktif, setAktif] = useState<OyunKazancDuyurusu | null>(null);
  const kuyruk = useRef<OyunKazancDuyurusu[]>([]);
  const gorulen = useRef(new Set<string>());
  const busy = useRef(false);

  const sonraki = useCallback(() => {
    if (busy.current) return;
    const next = kuyruk.current.shift();
    if (!next) {
      setAktif(null);
      return;
    }
    busy.current = true;
    setAktif(next);
  }, []);

  const dismiss = useCallback(() => {
    busy.current = false;
    setAktif(null);
    requestAnimationFrame(() => sonraki());
  }, [sonraki]);

  const ekle = useCallback(
    (d: OyunKazancDuyurusu) => {
      if (gorulen.current.has(d.id)) return;
      gorulen.current.add(d.id);
      kuyruk.current.push(d);
      if (!busy.current && !aktif) sonraki();
    },
    [aktif, sonraki],
  );

  useEffect(() => {
    if (!user?.id) return;

    const topic = 'oyun-kazanc-balonu';
    for (const ch of supabase.getChannels()) {
      if (ch.topic === `realtime:${topic}` || ch.topic === topic) {
        void supabase.removeChannel(ch);
      }
    }

    const kanal = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'oyun_kazanc_duyurulari',
        },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new as unknown as RawRow;
          if (!row?.id || !row.win_amount) return;
          void (async () => {
            const profil = await ProfilMiniCache.al(row.user_id);
            ekle({
              id: row.id,
              user_id: row.user_id,
              room_id: row.room_id,
              game_code: row.game_code,
              game_title: row.game_title,
              win_amount: Number(row.win_amount) || 0,
              bet_amount: Number(row.bet_amount) || 0,
              round_id: row.round_id,
              created_at: row.created_at,
              display_name: ProfilMiniCache.gosterimAdi(profil),
              avatar_url: profil?.avatar_url ?? null,
            });
          })();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(kanal);
    };
  }, [ekle, user?.id]);

  const oyunaGit = useCallback(async () => {
    if (!aktif) return;
    const gameCode = aktif.game_code || 'kozmik_kaskad';
    const oda = await BenimHostOdamGetir();
    if (!oda.ok || !oda.roomId) {
      Alert.alert(
        'Oyun',
        oda.hata ?? 'Kendi odanı açtıktan sonra oyuna girebilirsin.',
      );
      return;
    }
    dismiss();
    router.push(`/room/${oda.roomId}?oyun=${encodeURIComponent(gameCode)}` as any);
  }, [aktif, dismiss]);

  if (!aktif) return null;

  return (
    <OyunKazancBalonu
      duyuru={aktif}
      onPress={() => {
        void oyunaGit();
      }}
      onDismiss={dismiss}
    />
  );
}
