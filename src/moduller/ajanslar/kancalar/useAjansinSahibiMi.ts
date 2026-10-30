import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

/** Kullanıcı bu ajansın sahibi mi (ajans sohbetinde teklif / talep ayrımı). */
export function useAjansinSahibiMi(
  agencyId: string | null | undefined,
  userId: string | null | undefined,
): boolean {
  const [sahip, setSahip] = useState(false);

  useEffect(() => {
    if (!agencyId || !userId) {
      setSahip(false);
      return;
    }
    let iptal = false;
    void supabase
      .from('agencies')
      .select('owner_id')
      .eq('id', agencyId)
      .maybeSingle()
      .then(({ data }) => {
        if (!iptal) setSahip(data?.owner_id === userId);
      });
    return () => {
      iptal = true;
    };
  }, [agencyId, userId]);

  return sahip;
}
