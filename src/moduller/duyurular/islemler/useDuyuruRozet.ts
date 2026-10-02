import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { DuyuruRozetSayisi } from './DuyuruIslemleri';

/** Tek satırlık announcement_signals kanalı. Tüm duyuru tablosuna abone olmaz. */
export function useDuyuruRozet(): number {
  const [sayi, setSayi] = useState(0);

  const yenile = useCallback(() => {
    void DuyuruRozetSayisi().then(setSayi);
  }, []);

  useFocusEffect(
    useCallback(() => {
      yenile();
      const kanal = supabase
        .channel('announcement-signal')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'announcement_signals' },
          () => yenile(),
        )
        .subscribe();
      return () => {
        void supabase.removeChannel(kanal);
      };
    }, [yenile]),
  );

  return sayi;
}
