import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

/** Aktif ajansın sahibi mi. Profil ve isim satırlarında arma için. */
export function useAjansSahibiMi(userId: string | null | undefined): boolean {
  const [sahip, setSahip] = useState(false);

  useEffect(() => {
    if (!userId) {
      setSahip(false);
      return;
    }
    let iptal = false;
    void supabase
      .from('agencies')
      .select('id')
      .eq('owner_id', userId)
      .eq('status', 'active')
      .limit(1)
      .then(({ data }) => {
        if (!iptal) setSahip((data?.length ?? 0) > 0);
      });
    return () => {
      iptal = true;
    };
  }, [userId]);

  return sahip;
}
