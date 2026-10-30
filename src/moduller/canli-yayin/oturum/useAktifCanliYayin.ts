import { useEffect, useState } from 'react';
import {
  AktifCanliYayinDinle,
  type AktifCanliYayinDurum,
} from './AktifCanliYayinOturumu';

/** Aktif canlı yayın oturumunu abone ol — mini pencere */
export function useAktifCanliYayin(): AktifCanliYayinDurum | null {
  const [durum, setDurum] = useState<AktifCanliYayinDurum | null>(null);
  useEffect(() => AktifCanliYayinDinle(setDurum), []);
  return durum;
}
