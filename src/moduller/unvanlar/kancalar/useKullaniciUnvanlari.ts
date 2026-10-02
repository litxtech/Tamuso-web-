import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { OzellikBayragiAktifMi } from '../../ozellik-bayraklari/OzellikBayragiAktifMi';
import {
  UnvanBenimkileriGetir,
  type UnvanBenimkilerSonuc,
} from '../islemler/UnvanKullaniciIslemleri';

type Secenekler = {
  /** Realtime filter — current user id */
  userId?: string | null;
  aktif?: boolean;
};

type Sonuc = {
  veri: UnvanBenimkilerSonuc | null;
  yukleniyor: boolean;
  yenile: () => void;
};

/**
 * Kullanıcının ünvanları + seçim; assignment realtime ile yenilenir.
 */
export function useKullaniciUnvanlari({
  userId,
  aktif = true,
}: Secenekler = {}): Sonuc {
  const [veri, setVeri] = useState<UnvanBenimkilerSonuc | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const canliMi = useRef(true);

  const yukle = useCallback(async () => {
    if (!aktif) {
      setVeri(null);
      setYukleniyor(false);
      return;
    }
    if (!OzellikBayragiAktifMi('user_titles_enabled')) {
      setVeri({
        ok: true,
        enabled: false,
        selected_title_id: null,
        display_title_id: null,
        items: [],
      });
      setYukleniyor(false);
      return;
    }
    setYukleniyor(true);
    try {
      const d = await UnvanBenimkileriGetir();
      if (canliMi.current) setVeri(d);
    } catch {
      if (canliMi.current) setVeri(null);
    } finally {
      if (canliMi.current) setYukleniyor(false);
    }
  }, [aktif]);

  useEffect(() => {
    canliMi.current = true;
    void yukle();
    return () => {
      canliMi.current = false;
    };
  }, [yukle]);

  useEffect(() => {
    if (!aktif || !userId || !OzellikBayragiAktifMi('user_titles_enabled')) return;

    const topic = `unvan-atanan-${userId}`;
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
          table: 'user_title_assignments',
          filter: `user_id=eq.${userId}`,
        },
        () => void yukle(),
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        () => void yukle(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(kanal);
    };
  }, [aktif, userId, yukle]);

  const yenile = useCallback(() => {
    void yukle();
  }, [yukle]);

  return { veri, yukleniyor, yenile };
}
