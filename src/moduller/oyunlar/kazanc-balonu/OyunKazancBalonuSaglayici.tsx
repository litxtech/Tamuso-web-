import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useSegments } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { ProfilMiniCache } from '../../kullanici-profili/onbellek/ProfilMiniCache';
import { OyunKazancBalonu } from './OyunKazancBalonu';
import { OyunKazancOdaSecici } from './OyunKazancOdaSecici';
import { OyunKazanciAc } from './OyunKazancinaGit';
import type { OyunKazancDuyurusu } from './OyunKazancDuyuruTipleri';

type RawRow = {
  id: string;
  user_id: string;
  room_id: string | null;
  game_code: string;
  game_title: string;
  win_amount: number;
  bet_amount: number;
  multiplier?: number | string | null;
  round_id: string | null;
  created_at: string;
};

/** Ana akış, odalar listesi ve ses odası — bildirimin göründüğü yerler. */
function kazancEkraniMi(segments: readonly string[], pathname: string): boolean {
  if (segments[0] === 'room' || pathname.startsWith('/room')) return true;
  if (segments[0] !== '(tabs)') return false;
  const sekme = segments[1];
  return sekme == null || sekme === 'index' || sekme === 'rooms';
}

/**
 * Üstte akan kazanç bildirimi — push değil.
 * Yalnızca ana akış ve ses odalarında görünür.
 * Tıklanınca aktif ses odasında oyunu açar.
 */
function carpanOku(v: number | string | null | undefined): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function OyunKazancBalonuSaglayici() {
  const { user } = useAuth();
  const segments = useSegments();
  const pathname = usePathname();
  const yuzey = kazancEkraniMi(segments, pathname);
  const yuzeyRef = useRef(yuzey);
  yuzeyRef.current = yuzey;
  const [aktif, setAktif] = useState<OyunKazancDuyurusu | null>(null);
  const [odaSecici, setOdaSecici] = useState<string | null>(null);
  const bekleyen = useRef<OyunKazancDuyurusu | null>(null);
  const gorulen = useRef(new Set<string>());
  const busy = useRef(false);

  const goster = useCallback((d: OyunKazancDuyurusu) => {
    busy.current = true;
    setAktif(d);
  }, []);

  const dismiss = useCallback(() => {
    busy.current = false;
    setAktif(null);
    const sonraki = bekleyen.current;
    bekleyen.current = null;
    if (!sonraki) return;
    if (yuzeyRef.current) goster(sonraki);
    else bekleyen.current = sonraki;
  }, [goster]);

  const ekle = useCallback(
    (d: OyunKazancDuyurusu) => {
      if (gorulen.current.has(d.id)) return;
      gorulen.current.add(d.id);
      if (busy.current || !yuzeyRef.current) {
        bekleyen.current = d;
        return;
      }
      goster(d);
    },
    [goster],
  );

  useEffect(() => {
    if (!yuzey || busy.current) return;
    const sonraki = bekleyen.current;
    if (!sonraki) return;
    bekleyen.current = null;
    goster(sonraki);
  }, [goster, yuzey]);

  useEffect(() => {
    // Yüzey dışında abone olma — tüm oturumlara kazanç INSERT fan-out'unu keser
    if (!user?.id || !yuzey) return;

    const topic = 'oyun-kazanc-balonu';
    for (const ch of supabase.getChannels()) {
      if (ch.topic === `realtime:${topic}` || ch.topic === topic) {
        void supabase.removeChannel(ch);
      }
    }

    const MIN_WIN = 1;
    let sonEklenenMs = 0;
    const RATE_MS = 400;

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
          if (!yuzeyRef.current) return;
          const row = payload.new as unknown as RawRow;
          if (!row?.id || !row.win_amount) return;
          const win = Number(row.win_amount) || 0;
          if (win < MIN_WIN) return;
          const simdi = Date.now();
          if (simdi - sonEklenenMs < RATE_MS) return;
          sonEklenenMs = simdi;
          void (async () => {
            const profil = await ProfilMiniCache.al(row.user_id);
            ekle({
              id: row.id,
              user_id: row.user_id,
              room_id: row.room_id,
              game_code: row.game_code,
              game_title: row.game_title,
              win_amount: win,
              bet_amount: Number(row.bet_amount) || 0,
              multiplier: carpanOku(row.multiplier),
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
  }, [ekle, user?.id, yuzey]);

  const oyunaGit = useCallback(() => {
    if (!aktif) return;
    const gameCode = aktif.game_code || 'fruit_wheel';
    if (OyunKazanciAc(gameCode)) {
      dismiss();
      return;
    }
    dismiss();
    setOdaSecici(gameCode);
  }, [aktif, dismiss]);

  if (!aktif && !odaSecici) return null;

  return (
    <>
      {aktif && yuzey ? (
        <OyunKazancBalonu duyuru={aktif} onPress={oyunaGit} onDismiss={dismiss} />
      ) : null}
      <OyunKazancOdaSecici gameCode={odaSecici} onClose={() => setOdaSecici(null)} />
    </>
  );
}
