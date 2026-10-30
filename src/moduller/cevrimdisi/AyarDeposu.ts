import { cevrimdisiOku, cevrimdisiYaz } from './CevrimdisiDeposu';

export type VideoOnbellekModu = 'wifi' | 'wifi_ve_mobil';

export type CevrimdisiAyar = {
  /** Mobil veride fotoğraf / story medya önbelleği. Varsayılan kapalı. */
  mobilMedya: boolean;
  videoOnbellek: VideoOnbellekModu;
  /** Kapalı: taslak internet gelince kendiliğinden yayınlanmaz. */
  otomatikPaylas: boolean;
};

export const VARSAYILAN_AYAR: CevrimdisiAyar = {
  mobilMedya: false,
  videoOnbellek: 'wifi',
  otomatikPaylas: false,
};

const ALAN = 'ayar';

export async function CevrimdisiAyarOku(userId: string): Promise<CevrimdisiAyar> {
  const kayit = await cevrimdisiOku<Partial<CevrimdisiAyar> | null>(userId, ALAN, null);
  if (!kayit || typeof kayit !== 'object') return { ...VARSAYILAN_AYAR };
  return {
    mobilMedya: kayit.mobilMedya === true,
    videoOnbellek: kayit.videoOnbellek === 'wifi_ve_mobil' ? 'wifi_ve_mobil' : 'wifi',
    otomatikPaylas: kayit.otomatikPaylas === true,
  };
}

export async function CevrimdisiAyarYaz(
  userId: string,
  yama: Partial<CevrimdisiAyar>,
): Promise<CevrimdisiAyar> {
  const onceki = await CevrimdisiAyarOku(userId);
  const sonraki = { ...onceki, ...yama };
  await cevrimdisiYaz(userId, ALAN, sonraki);
  return sonraki;
}

export function medyaOnbellekIzinliMi(
  ayar: CevrimdisiAyar,
  agTipi: string,
  tur: 'image' | 'video',
): boolean {
  const wifi = agTipi.toUpperCase() === 'WIFI';
  if (tur === 'video') {
    if (ayar.videoOnbellek === 'wifi_ve_mobil') return true;
    return wifi;
  }
  if (wifi) return true;
  return ayar.mobilMedya;
}
