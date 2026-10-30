import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { PkMacSuresiDoldu } from '../islemler/PkMacBaslat';
import {
  PkCanliMaciniGetir,
  type PkCanliMacDetay,
} from '../skor/PkCanliMaciniGetir';

/** Canlı oturumun aktif PK maçını skor realtime ile takip eder */
export function useCanliPkMac(params: {
  liveSessionId: string | undefined;
  enabled?: boolean;
}) {
  const { liveSessionId, enabled = true } = params;
  const [mac, setMac] = useState<PkCanliMacDetay | null>(null);

  const yenile = useCallback(async () => {
    if (!liveSessionId) {
      setMac(null);
      return;
    }
    const row = await PkCanliMaciniGetir(liveSessionId);
    setMac(row);
  }, [liveSessionId]);

  useEffect(() => {
    if (!enabled || !liveSessionId) {
      setMac(null);
      return;
    }

    void yenile();

    const ch = supabase
      .channel(`pk-mac-live-${liveSessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pk_matches',
        },
        (payload: { new?: Record<string, unknown> }) => {
          const row = payload.new;
          if (!row) {
            void yenile();
            return;
          }
          const a = row.live_a_id;
          const b = row.live_b_id;
          const buMac = a === liveSessionId || b === liveSessionId || !a || !b;
          if (!buMac) return;
          if (row.status === 'live') {
            void yenile();
          } else if (a === liveSessionId || b === liveSessionId) {
            setMac(null);
          }
        },
      )
      .subscribe();

    const poll = setInterval(() => void yenile(), 4000);

    return () => {
      clearInterval(poll);
      void supabase.removeChannel(ch);
    };
  }, [enabled, liveSessionId, yenile]);

  useEffect(() => {
    if (!mac?.id || !mac.ends_at) return;
    let iptal = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const dene = async () => {
      if (iptal || !mac.ends_at) return;
      const kalan = new Date(mac.ends_at).getTime() - Date.now();
      if (kalan > 400) {
        timer = setTimeout(() => void dene(), kalan);
        return;
      }
      const r = await PkMacSuresiDoldu(mac.id);
      if (iptal) return;
      if (r.ok && r.status && r.status !== 'live') {
        void yenile();
        return;
      }
      timer = setTimeout(() => void dene(), 1000);
    };

    void dene();
    return () => {
      iptal = true;
      if (timer) clearTimeout(timer);
    };
  }, [mac?.id, mac?.ends_at, yenile]);

  return { mac, yenile };
}
