import { useEffect, useRef, type MutableRefObject } from 'react';
import { supabase } from '../../../lib/supabase';

type Opts = {
  /** Kullanıcı listenin üstüne yakın mı (offset < eşik) */
  ustteMiRef: MutableRefObject<boolean>;
  /** Ustteyken sessiz yenile; değilse floating göster */
  onYeniUstte: () => void;
  onYeniAsagida: () => void;
  onSilindi: (id: string) => void;
  enabled?: boolean;
};

/**
 * Feed seviyesinde tek subscription.
 * Post başına kanal açılmaz.
 */
export function useDurumAkisRealtime({
  ustteMiRef,
  onYeniUstte,
  onYeniAsagida,
  onSilindi,
  enabled = true,
}: Opts) {
  const ustteCb = useRef(onYeniUstte);
  const asagiCb = useRef(onYeniAsagida);
  const silCb = useRef(onSilindi);
  ustteCb.current = onYeniUstte;
  asagiCb.current = onYeniAsagida;
  silCb.current = onSilindi;

  useEffect(() => {
    if (!enabled) return;

    let insertTimer: ReturnType<typeof setTimeout> | null = null;
    const insertGecikmeli = () => {
      if (insertTimer) clearTimeout(insertTimer);
      insertTimer = setTimeout(() => {
        insertTimer = null;
        if (ustteMiRef.current) ustteCb.current();
        else asagiCb.current();
      }, 800);
    };

    const kanal = supabase
      .channel('durum-akis-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'status_posts',
        },
        insertGecikmeli,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'status_posts',
        },
        (payload: { new?: { id?: string; deleted_at?: string | null } }) => {
          const row = payload?.new;
          if (row?.id && row.deleted_at) {
            silCb.current(row.id);
          }
        },
      )
      .subscribe();

    return () => {
      if (insertTimer) clearTimeout(insertTimer);
      void supabase.removeChannel(kanal);
    };
  }, [enabled, ustteMiRef]);
}
