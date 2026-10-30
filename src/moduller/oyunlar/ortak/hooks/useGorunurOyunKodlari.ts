/**
 * Admin'de açık oyun kodlarını yükler — kapalı oyunlar UI'da kullanılmaz.
 * Platform bayrağı (games_enabled) ve kill_games sunucudan okunur.
 * Admin aç/kapat canlı yansır: game_control_configs + bayrak cache realtime.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { OzellikBayrakCacheAbone } from '../../../ozellik-bayraklari/OzellikBayrakCache';
import { OzellikBayragiAktifMiSunucu } from '../../../ozellik-bayraklari/okuma/OzellikBayragiAktifMiSunucu';
import { KillSwitchAktifMiSunucu } from '../../../ozellik-bayraklari/okuma/KillSwitchAktifMiSunucu';
import { listVisibleGameCodes } from '../servisler/OyunKontrolServisi';
import type { GameCode } from '../tipler/OyunTipleri';
import { STORM_KING_PAKETTE } from '../../storm-king/StormKingPaket';

const VARSAYILAN_OYUNLAR: GameCode[] = STORM_KING_PAKETTE ? ['fruit_wheel', 'storm_king'] : ['fruit_wheel'];

const CANLI_YENILE_MS = 400;

export function useGorunurOyunKodlari(params?: { enabled?: boolean }) {
  const enabled = params?.enabled !== false;
  /** İlk boyamada boş liste gösterme — sunucu gelene kadar varsayılan oyunlar */
  const [codes, setCodes] = useState<GameCode[]>(
    enabled ? VARSAYILAN_OYUNLAR : [],
  );
  const [platformAcik, setPlatformAcik] = useState(true);
  const [loading, setLoading] = useState(enabled);
  const istekNo = useRef(0);
  const sonKodlar = useRef(codes);

  const yenile = useCallback(async () => {
    if (!enabled) {
      setCodes([]);
      setPlatformAcik(false);
      setLoading(false);
      return [] as GameCode[];
    }
    const no = ++istekNo.current;
    setLoading(true);
    try {
      const [gamesOk, killAktif, res] = await Promise.all([
        OzellikBayragiAktifMiSunucu('games_enabled'),
        KillSwitchAktifMiSunucu('kill_games'),
        listVisibleGameCodes(),
      ]);
      const plat = Boolean(gamesOk) && !killAktif;
      // Liste okunamazsa son bilinen kalır; ağ dalgalanması açık oyunu kapatmasın.
      const next = !plat ? [] : res.ok ? res.data : sonKodlar.current;
      if (no === istekNo.current) {
        sonKodlar.current = next;
        setPlatformAcik(plat);
        setCodes(next);
      }
      return next;
    } finally {
      if (no === istekNo.current) setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void yenile();
  }, [yenile]);

  useEffect(() => {
    if (!enabled) return;
    let zamanlayici: ReturnType<typeof setTimeout> | null = null;
    const gecikmeliYenile = () => {
      if (zamanlayici) clearTimeout(zamanlayici);
      zamanlayici = setTimeout(() => void yenile(), CANLI_YENILE_MS);
    };

    const bayrakAboneligi = OzellikBayrakCacheAbone(gecikmeliYenile);
    const kanal = supabase
      .channel(`oyun-gorunurluk-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_control_configs' },
        gecikmeliYenile,
      )
      .subscribe();

    return () => {
      if (zamanlayici) clearTimeout(zamanlayici);
      bayrakAboneligi();
      void supabase.removeChannel(kanal);
    };
  }, [enabled, yenile]);

  return {
    codes,
    anyVisible: codes.length > 0,
    platformAcik,
    isVisible: (code: GameCode) => codes.includes(code),
    loading,
    yenile,
  };
}
