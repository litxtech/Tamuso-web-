/**
 * Odaya yeni katılan seviye 10+ kullanıcılar için giriş animasyonu kuyruğu.
 * Aynı oda oturumunda kişi başına en fazla 1 kez.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { ProfilMiniCache } from '../../kullanici-profili/onbellek/ProfilMiniCache';
import {
  SeviyeGirisKademesiniCoz,
  type SeviyeGirisOgesi,
} from '../animasyon/SeviyeGirisKatalogu';
import {
  OdaGirisAnimAnahtari,
  OdaGirisAnimasyonuGosterildiMi,
  OdaGirisAnimasyonuIsaretle,
} from '../animasyon/OdaGirisAnimasyonOturumu';
import i18n from '../../../i18n';

type Opts = {
  roomId?: string | null;
  enabled?: boolean;
  /** Host kendi sahip girişini oynatır — seviye self atlanır */
  hostMu?: boolean;
  /** Kendi profil — odaya ilk girince animasyon (sv≥10) */
  self?: {
    userId: string;
    ad: string;
    avatarUrl?: string | null;
    level: number;
  } | null;
};

export function useOdaSeviyeGiris({
  roomId,
  enabled = true,
  hostMu = false,
  self,
}: Opts) {
  const [aktif, setAktif] = useState<SeviyeGirisOgesi | null>(null);
  const kuyrukRef = useRef<SeviyeGirisOgesi[]>([]);
  const oynuyorRef = useRef(false);
  const selfUserId = self?.userId ?? null;
  const selfLevel = self?.level ?? 0;
  const selfAd = self?.ad ?? 'Sen';
  const selfAvatar = self?.avatarUrl ?? null;

  const sonraki = useCallback(() => {
    if (oynuyorRef.current) return;
    const next = kuyrukRef.current.shift();
    if (!next) {
      setAktif(null);
      return;
    }
    oynuyorRef.current = true;
    setAktif(next);
  }, []);

  const kuyrugaEkle = useCallback(
    (oge: SeviyeGirisOgesi, tur: 'seviye' | 'sahip' = 'seviye') => {
      if (!roomId) return;
      const key = OdaGirisAnimAnahtari(roomId, tur, oge.userId);
      if (OdaGirisAnimasyonuGosterildiMi(key)) return;
      OdaGirisAnimasyonuIsaretle(key);
      kuyrukRef.current.push(oge);
      sonraki();
    },
    [roomId, sonraki],
  );

  const bitti = useCallback(() => {
    oynuyorRef.current = false;
    setAktif(null);
    requestAnimationFrame(() => sonraki());
  }, [sonraki]);

  /** Kendi giriş animasyonu — oda başına 1 kez (host hariç) */
  useEffect(() => {
    if (!enabled || !roomId || !selfUserId || hostMu) return;
    const kademe = SeviyeGirisKademesiniCoz(selfLevel);
    if (!kademe) return;
    kuyrugaEkle({
      userId: selfUserId,
      ad: selfAd,
      avatarUrl: selfAvatar,
      level: selfLevel,
      kademe,
    });
  }, [
    enabled,
    roomId,
    hostMu,
    selfUserId,
    selfLevel,
    selfAd,
    selfAvatar,
    kuyrugaEkle,
  ]);

  /** Başkalarının odaya katılması */
  useEffect(() => {
    if (!enabled || !roomId) return;

    const imza = `oda-seviye-giris-${roomId}`;
    for (const ch of supabase.getChannels()) {
      const topic = ch.topic ?? '';
      if (topic.includes(imza)) void supabase.removeChannel(ch);
    }

    const channel = supabase
      .channel(`${imza}-${Date.now().toString(36)}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_members',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const row = payload.new as { user_id?: string } | null;
          const uid = row?.user_id;
          if (!uid || uid === selfUserId) return;
          const key = OdaGirisAnimAnahtari(roomId, 'seviye', uid);
          if (OdaGirisAnimasyonuGosterildiMi(key)) return;

          void (async () => {
            const data = await ProfilMiniCache.al(uid);
            if (!data) return;
            const level = typeof data.level === 'number' ? data.level : 0;
            const kademe = SeviyeGirisKademesiniCoz(level);
            if (!kademe) return;
            kuyrugaEkle({
              userId: uid,
              ad: ProfilMiniCache.gosterimAdi(data, i18n.t('ortak.kullanici')),
              avatarUrl: data.avatar_url ?? null,
              level,
              kademe,
            });
          })();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, roomId, selfUserId, kuyrugaEkle]);

  useEffect(() => {
    kuyrukRef.current = [];
    oynuyorRef.current = false;
    setAktif(null);
  }, [roomId]);

  return { aktif, bitti };
}
