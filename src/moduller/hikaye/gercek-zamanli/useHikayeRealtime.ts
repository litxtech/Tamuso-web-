import { useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';

type Opts = {
  enabled?: boolean;
  onDegisti: () => void;
};

/**
 * Hikaye değişince tepsiyi sessiz yenile.
 * Aynı topic zaten subscribe ise önce kaldır — aksi halde
 * "cannot add postgres_changes callbacks after subscribe()" patlar.
 * Yalnızca `stories` (realtime publication'da); item ekleme/silme story satırını da günceller.
 */
export function useHikayeRealtime({ enabled = true, onDegisti }: Opts) {
  const cb = useRef(onDegisti);
  cb.current = onDegisti;

  useEffect(() => {
    if (!enabled) return;

    const topic = 'hikaye-tepsi';
    for (const ch of supabase.getChannels()) {
      if (ch.topic === `realtime:${topic}` || ch.topic === topic) {
        void supabase.removeChannel(ch);
      }
    }

    const debounce = { t: null as ReturnType<typeof setTimeout> | null };
    const tetikle = () => {
      if (debounce.t) clearTimeout(debounce.t);
      debounce.t = setTimeout(() => cb.current(), 800);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kanal: any = supabase.channel(topic);
    kanal
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stories' },
        tetikle,
      )
      .subscribe();

    return () => {
      if (debounce.t) clearTimeout(debounce.t);
      void supabase.removeChannel(kanal);
    };
  }, [enabled]);
}
