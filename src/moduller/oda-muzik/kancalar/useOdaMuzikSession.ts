import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../../../lib/supabase';
import {
  MusicRuntimeConfigGet,
  RoomMusicSessionGet,
  type RoomMusicSession,
} from '../islemler/OdaMuzikApi';
import {
  AktifSesOdasiArkaPlandaMi,
  AktifSesOdasiKucultmeTazeMi,
} from '../../ses-odalari/oturum/AktifSesOdasiOturumu';
import {
  OdaMuzikConfigAyarla,
  OdaMuzikDurdur,
  OdaMuzikSessionUygula,
} from '../oynatici/OdaMuzikOynatici';

/**
 * Authoritative room music session + Realtime.
 * RoomScreen'i spam render etmez — yalnız session state değişince.
 */
export function useOdaMuzikSession(roomId: string | null | undefined) {
  const [session, setSession] = useState<RoomMusicSession | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const lastVersion = useRef(0);
  const yenileRef = useRef<() => Promise<void>>(async () => undefined);

  const uygula = useCallback(async (next: RoomMusicSession | null) => {
    if (next && next.version < lastVersion.current) return;
    if (next) lastVersion.current = next.version ?? 0;
    setSession(next);
    await OdaMuzikSessionUygula(next);
  }, []);

  const yenile = useCallback(async () => {
    if (!roomId) return;
    try {
      const s = await RoomMusicSessionGet(roomId);
      await uygula(s);
    } catch {
      /* sessiz */
    }
  }, [roomId, uygula]);

  yenileRef.current = yenile;

  useEffect(() => {
    void MusicRuntimeConfigGet()
      .then((c) => OdaMuzikConfigAyarla(c))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!roomId) {
      void OdaMuzikDurdur();
      setSession(null);
      lastVersion.current = 0;
      return;
    }

    let alive = true;
    lastVersion.current = 0;
    setYukleniyor(true);

    void (async () => {
      try {
        const s = await RoomMusicSessionGet(roomId);
        if (alive) await uygula(s);
      } catch {
        if (alive) setSession(null);
      } finally {
        if (alive) setYukleniyor(false);
      }
    })();

    const topic = `room-music:${roomId}:${Date.now()}`;

    const ch = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_music_sessions',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          void yenileRef.current();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_music_queue',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          void yenileRef.current();
        },
      )
      .subscribe();

    const appSub = AppState.addEventListener('change', (st) => {
      if (st === 'active') void yenileRef.current();
    });

    return () => {
      alive = false;
      appSub.remove();
      void supabase.removeChannel(ch);
      // Küçültülmüş odada müzik ekrandan bağımsız çalsın
      if (AktifSesOdasiArkaPlandaMi() || AktifSesOdasiKucultmeTazeMi()) return;
      void OdaMuzikDurdur();
    };
    // yalnız roomId — yenile ref ile; aksi halde subscribe sonrası .on() yarışı
  }, [roomId, uygula]);

  return { session, yukleniyor, yenile, setSession: uygula };
}
