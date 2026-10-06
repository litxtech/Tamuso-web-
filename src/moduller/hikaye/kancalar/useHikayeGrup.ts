import { useCallback, useEffect, useState } from 'react';
import type { HikayeGrup } from '../tipler';
import { HikayeGrupGetir } from '../islemler/HikayeIslemleri';

export function useHikayeGrup(userId: string | undefined) {
  const [grup, setGrup] = useState<HikayeGrup | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const yenile = useCallback(async () => {
    if (!userId) {
      setGrup(null);
      setYukleniyor(false);
      setHata(null);
      return;
    }
    setYukleniyor(true);
    setHata(null);
    const r = await HikayeGrupGetir(userId);
    setYukleniyor(false);
    if (!r.ok) {
      setGrup(null);
      setHata(r.hata);
      return;
    }
    setGrup(r.data);
  }, [userId]);

  useEffect(() => {
    void yenile();
  }, [yenile]);

  return { grup, yukleniyor, hata, yenile };
}
