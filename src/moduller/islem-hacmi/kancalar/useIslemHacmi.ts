import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { KillSwitchAktifMiSunucu } from '../../ozellik-bayraklari/okuma/KillSwitchAktifMiSunucu';
import { OzellikBayragiAktifMiSunucu } from '../../ozellik-bayraklari/okuma/OzellikBayragiAktifMiSunucu';
import {
  BenimIslemHacmimiGetir,
  KamuIslemHacminiGetir,
} from '../islemler/IslemHacmiApi';
import type { BenimIslemHacmim, KamuIslemHacmi } from '../tipler';

type Secenekler = {
  mode: 'own' | 'public';
  /** public modda zorunlu; own modda realtime filtresi için önerilir */
  userId?: string | null;
  /** false ise hiç yükleme yapılmaz (ör. misafir) */
  aktif?: boolean;
};

type Sonuc = {
  veri: BenimIslemHacmim | KamuIslemHacmi | null;
  benim: BenimIslemHacmim | null;
  yukleniyor: boolean;
  /** Kart bu kullanıcı için gösterilebilir mi (bayrak + gizlilik) */
  gorunur: boolean;
  yenile: () => void;
};

/**
 * İşlem hacmi verisi — own/public yükler, user_transaction_volume_summary
 * değişimlerini realtime dinleyip yeniden çeker.
 */
export function useIslemHacmi({ mode, userId, aktif = true }: Secenekler): Sonuc {
  const [veri, setVeri] = useState<BenimIslemHacmim | KamuIslemHacmi | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const canliMi = useRef(true);

  const yukle = useCallback(async () => {
    if (!aktif || (mode === 'public' && !userId)) {
      setVeri(null);
      setYukleniyor(false);
      return;
    }
    setYukleniyor(true);
    try {
      const [anaBayrak, profilBayrak, killDisplay] = await Promise.all([
        OzellikBayragiAktifMiSunucu('transaction_volume_enabled'),
        OzellikBayragiAktifMiSunucu('transaction_volume_profile_enabled'),
        KillSwitchAktifMiSunucu('kill_transaction_volume_display'),
      ]);
      if (!anaBayrak || !profilBayrak || killDisplay) {
        if (canliMi.current) setVeri(null);
        return;
      }
      const d =
        mode === 'own'
          ? await BenimIslemHacmimiGetir()
          : await KamuIslemHacminiGetir(userId as string);
      if (canliMi.current) setVeri(d);
    } catch {
      if (canliMi.current) setVeri(null);
    } finally {
      if (canliMi.current) setYukleniyor(false);
    }
  }, [mode, userId, aktif]);

  useEffect(() => {
    canliMi.current = true;
    void yukle();
    return () => {
      canliMi.current = false;
    };
  }, [yukle]);

  // Realtime — özet satırı değişince yeniden çek
  useEffect(() => {
    if (!aktif || !userId) return;

    const topic = `islem-hacmi-${userId}`;
    for (const ch of supabase.getChannels()) {
      if (ch.topic === `realtime:${topic}` || ch.topic === topic) {
        void supabase.removeChannel(ch);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kanal: any = supabase.channel(topic);
    kanal
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_transaction_volume_summary',
          filter: `user_id=eq.${userId}`,
        },
        () => void yukle(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(kanal);
    };
  }, [aktif, userId, yukle]);

  const gorunur =
    !!veri &&
    veri.enabled !== false &&
    (mode === 'own' ||
      veri.is_owner ||
      (veri.visible !== false && veri.visibility !== 'PRIVATE'));

  const yenile = useCallback(() => {
    void yukle();
  }, [yukle]);

  return {
    veri,
    benim: mode === 'own' ? (veri as BenimIslemHacmim | null) : null,
    yukleniyor,
    gorunur,
    yenile,
  };
}
