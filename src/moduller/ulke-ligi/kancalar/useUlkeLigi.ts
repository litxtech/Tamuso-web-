import { useCallback, useEffect, useRef, useState } from 'react';
import { KillSwitchAktifMiSunucu } from '../../ozellik-bayraklari/okuma/KillSwitchAktifMiSunucu';
import { OzellikBayragiAktifMiSunucu } from '../../ozellik-bayraklari/okuma/OzellikBayragiAktifMiSunucu';
import {
  BenimUlkeKatkiGetir,
  UlkeLiderligiGetir,
} from '../islemler/UlkeLigiApi';
import type {
  BenimUlkeKatkisi,
  UlkeLiderSatiri,
  UlkeLigiPeriod,
} from '../tipler';

type Secenekler = {
  period: UlkeLigiPeriod;
  search?: string;
  aktif?: boolean;
  limit?: number;
};

type Sonuc = {
  satirlar: UlkeLiderSatiri[];
  benim: BenimUlkeKatkisi | null;
  yukleniyor: boolean;
  hata: boolean;
  modulAcik: boolean;
  hasMore: boolean;
  yenile: () => void;
  dahaFazla: () => void;
};

/**
 * Dünya ülke ligi — liderlik + kendi katkı.
 * Bayrak / kill-switch kapalıysa boş döner.
 */
export function useUlkeLigi({
  period,
  search = '',
  aktif = true,
  limit = 50,
}: Secenekler): Sonuc {
  const [satirlar, setSatirlar] = useState<UlkeLiderSatiri[]>([]);
  const [benim, setBenim] = useState<BenimUlkeKatkisi | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState(false);
  const [modulAcik, setModulAcik] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const canliMi = useRef(true);
  const cursorRef = useRef<number | null>(null);

  const bayrakKontrol = useCallback(async (): Promise<boolean> => {
    const [ana, kill] = await Promise.all([
      OzellikBayragiAktifMiSunucu('country_league_enabled'),
      KillSwitchAktifMiSunucu('kill_country_league_display'),
    ]);
    if (!ana || kill) return false;
    if (period === 'weekly') {
      return OzellikBayragiAktifMiSunucu('country_league_weekly_enabled');
    }
    return OzellikBayragiAktifMiSunucu('country_league_all_time_enabled');
  }, [period]);

  const yukle = useCallback(
    async (append = false) => {
      if (!aktif) {
        setSatirlar([]);
        setBenim(null);
        setYukleniyor(false);
        setHata(false);
        return;
      }
      if (!append) {
        setYukleniyor(true);
        cursorRef.current = null;
      }
      setHata(false);
      try {
        const acik = await bayrakKontrol();
        if (!canliMi.current) return;
        setModulAcik(acik);
        if (!acik) {
          setSatirlar([]);
          setBenim(null);
          setHasMore(false);
          return;
        }

        const [board, me] = await Promise.all([
          UlkeLiderligiGetir({
            period,
            limit,
            cursorRank: append ? cursorRef.current : null,
            search: search.trim() || null,
          }),
          append ? Promise.resolve(null) : BenimUlkeKatkiGetir().catch(() => null),
        ]);
        if (!canliMi.current) return;
        setSatirlar((prev) => (append ? [...prev, ...board.rows] : board.rows));
        if (me) setBenim(me);
        setHasMore(board.has_more);
        const son = board.rows[board.rows.length - 1];
        cursorRef.current = son?.rank ?? board.next_cursor_rank;
      } catch {
        if (canliMi.current) {
          if (!append) setSatirlar([]);
          setHata(true);
        }
      } finally {
        if (canliMi.current) setYukleniyor(false);
      }
    },
    [aktif, bayrakKontrol, limit, period, search],
  );

  useEffect(() => {
    canliMi.current = true;
    void yukle(false);
    return () => {
      canliMi.current = false;
    };
  }, [yukle]);

  const yenile = useCallback(() => {
    void yukle(false);
  }, [yukle]);

  const dahaFazla = useCallback(() => {
    if (!hasMore || yukleniyor) return;
    void yukle(true);
  }, [hasMore, yukleniyor, yukle]);

  return {
    satirlar,
    benim,
    yukleniyor,
    hata,
    modulAcik,
    hasMore,
    yenile,
    dahaFazla,
  };
}
