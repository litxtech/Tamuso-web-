import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { OzellikBayragiAktifMi } from '../../ozellik-bayraklari/OzellikBayragiAktifMi';
import { UnvanKatalogCache } from '../onbellek/UnvanKatalogCache';
import type { UnvanKatalogKaydi } from '../tipler';

type Sonuc = {
  items: UnvanKatalogKaydi[];
  yukleniyor: boolean;
  hata: string | null;
  yenile: () => void;
};

/**
 * Ünvan kataloğu — bellek cache + user_titles realtime invalidation.
 */
export function useUnvanKatalog(aktif = true): Sonuc {
  const [items, setItems] = useState<UnvanKatalogKaydi[]>(() => UnvanKatalogCache.tumu());
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const canliMi = useRef(true);

  const yukle = useCallback(
    async (force = false) => {
      if (!aktif) {
        setItems([]);
        setYukleniyor(false);
        return;
      }
      if (!OzellikBayragiAktifMi('user_titles_enabled')) {
        setItems([]);
        setYukleniyor(false);
        return;
      }
      setYukleniyor(true);
      try {
        const list = await UnvanKatalogCache.yukle({ force });
        if (canliMi.current) {
          setItems(list);
          setHata(null);
        }
      } catch (e) {
        if (canliMi.current) {
          setHata(e instanceof Error ? e.message : 'Katalog yüklenemedi');
          setItems(UnvanKatalogCache.tumu());
        }
      } finally {
        if (canliMi.current) setYukleniyor(false);
      }
    },
    [aktif],
  );

  useEffect(() => {
    canliMi.current = true;
    void yukle(false);
    return () => {
      canliMi.current = false;
    };
  }, [yukle]);

  useEffect(() => {
    if (!aktif || !OzellikBayragiAktifMi('user_titles_enabled')) return;

    const topic = 'unvan-katalog';
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
        { event: '*', schema: 'public', table: 'user_titles' },
        () => {
          UnvanKatalogCache.invalidate();
          void yukle(true);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(kanal);
    };
  }, [aktif, yukle]);

  const yenile = useCallback(() => {
    void yukle(true);
  }, [yukle]);

  return { items, yukleniyor, hata, yenile };
}
