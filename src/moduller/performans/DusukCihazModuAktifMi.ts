import { Platform } from 'react-native';
import { OzellikBayragiAktifMi } from '../ozellik-bayraklari/OzellikBayragiAktifMi';

/**
 * Dusuk cihaz heuristik — remote flag veya basit Android sinyali.
 * Gercek device class backend risk input; burada UI kisitlama.
 */
export function DusukCihazModuAktifMi(): boolean {
  if (OzellikBayragiAktifMi('low_end_mode_enabled')) return true;
  // Manuel override yoksa varsayilan kapali; stres testinde flag acilir.
  if (Platform.OS === 'android') {
    // Expo Go / genelde yeterli; agresif otomatik acma yok.
    return false;
  }
  return false;
}

export function DusukCihazAnimasyonSiniri(): {
  maxKuyruk: number;
  maxDurationMs: number;
  fullScreenIzinli: boolean;
} {
  if (!DusukCihazModuAktifMi()) {
    // Spam hediyede JS/GPU ısısı — 12 → 6
    return { maxKuyruk: 6, maxDurationMs: 6000, fullScreenIzinli: true };
  }
  return { maxKuyruk: 2, maxDurationMs: 1000, fullScreenIzinli: false };
}
