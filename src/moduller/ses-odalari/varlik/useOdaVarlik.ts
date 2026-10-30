import { useEffect, useState } from 'react';
import {
  OdaVarlikDinle,
  OdaVarlikDurumunuAl,
  type OdaVarlikDurum,
} from './OdaVarlikKanali';

/** Odadaki anlık kişiler. roomId yoksa (demo vb.) null. */
export function useOdaVarlik(
  roomId: string | null | undefined,
): OdaVarlikDurum | null {
  const [durum, setDurum] = useState<OdaVarlikDurum | null>(() =>
    roomId ? OdaVarlikDurumunuAl(roomId) : null,
  );

  useEffect(() => {
    if (!roomId) {
      setDurum(null);
      return;
    }
    return OdaVarlikDinle(roomId, setDurum);
  }, [roomId]);

  return durum;
}

/** Senkron gelmiş, hatasız varlık listesi; aksi halde null. */
export function canliVarlikIdleri(durum: OdaVarlikDurum | null): string[] | null {
  return durum?.senkron && !durum.hata ? durum.userIds : null;
}
