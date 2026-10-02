/**
 * Admin'de açık oyun kodlarını yükler — kapalı oyunlar UI'da kullanılmaz.
 * Platform bayrağı (games_enabled) ve kill_games sunucudan okunur.
 */

import { useCallback, useEffect, useState } from 'react';
import { OzellikBayragiAktifMiSunucu } from '../../../ozellik-bayraklari/okuma/OzellikBayragiAktifMiSunucu';
import { KillSwitchAktifMiSunucu } from '../../../ozellik-bayraklari/okuma/KillSwitchAktifMiSunucu';
import { listVisibleGameCodes } from '../servisler/OyunKontrolServisi';
import type { GameCode } from '../tipler/OyunTipleri';

export function useGorunurOyunKodlari(params?: { enabled?: boolean }) {
  const enabled = params?.enabled !== false;
  /** İlk boyamada boş liste gösterme — sunucu gelene kadar varsayılan oyunlar */
  const [codes, setCodes] = useState<GameCode[]>(
    enabled ? ['fruit_wheel', 'fair_spin', 'astral_falls', 'zeus', 'nox_reels', 'kozmik_kaskad'] : [],
  );
  const [platformAcik, setPlatformAcik] = useState(true);
  const [loading, setLoading] = useState(enabled);

  const yenile = useCallback(async () => {
    if (!enabled) {
      setCodes([]);
      setPlatformAcik(false);
      setLoading(false);
      return [] as GameCode[];
    }
    setLoading(true);
    try {
      const [gamesOk, killAktif, res] = await Promise.all([
        OzellikBayragiAktifMiSunucu('games_enabled'),
        KillSwitchAktifMiSunucu('kill_games'),
        listVisibleGameCodes(),
      ]);
      const plat = Boolean(gamesOk) && !killAktif;
      setPlatformAcik(plat);
      const next = plat && res.ok ? res.data : [];
      setCodes(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void yenile();
  }, [yenile]);

  return {
    codes,
    anyVisible: codes.length > 0,
    platformAcik,
    isVisible: (code: GameCode) => codes.includes(code),
    loading,
    yenile,
  };
}
