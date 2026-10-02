/**
 * Seviyeye göre odaya giriş animasyon eşikleri.
 * 10+ kullanıcı odaya girince herkese gösterilir.
 * Altın/Efsane: tam ekran sinematik; Bronz/Gümüş: üst banner.
 */

import i18n from '../../../i18n';

export type SeviyeGirisKademe = 'bronz' | 'gumus' | 'altin' | 'efsane';

export type SeviyeGirisOgesi = {
  userId: string;
  ad: string;
  avatarUrl?: string | null;
  level: number;
  kademe: SeviyeGirisKademe;
};

/** Giriş animasyonu için minimum seviye */
export const SEVIYE_GIRIS_ESIGI = 10;

export function SeviyeGirisKademesiniCoz(level: number): SeviyeGirisKademe | null {
  if (!level || level < SEVIYE_GIRIS_ESIGI) return null;
  if (level >= 50) return 'efsane';
  if (level >= 30) return 'altin';
  if (level >= 20) return 'gumus';
  return 'bronz';
}

/** Altın ve efsane tam ekran sinematik sahne kullanır */
export function SeviyeGirisSinematikMi(kademe: SeviyeGirisKademe): boolean {
  return kademe === 'altin' || kademe === 'efsane';
}

export function SeviyeGirisEtiketi(kademe: SeviyeGirisKademe): string {
  switch (kademe) {
    case 'efsane':
      return i18n.t('sesOda.girisEfsane');
    case 'altin':
      return i18n.t('sesOda.girisAltin');
    case 'gumus':
      return i18n.t('sesOda.girisGumus');
    default:
      return i18n.t('sesOda.girisOzel');
  }
}

export function SeviyeGirisAltMetin(kademe: SeviyeGirisKademe, level: number): string {
  switch (kademe) {
    case 'efsane':
      return i18n.t('sesOda.girisAltEfsane', { level });
    case 'altin':
      return i18n.t('sesOda.girisAltAltin', { level });
    case 'gumus':
      return i18n.t('sesOda.girisAltKatildi', { level });
    default:
      return i18n.t('sesOda.girisAltKatildi', { level });
  }
}

export function SeviyeGirisSuresiMs(kademe: SeviyeGirisKademe): number {
  switch (kademe) {
    case 'efsane':
      return 3400;
    case 'altin':
      return 3000;
    case 'gumus':
      return 2600;
    default:
      return 2400;
  }
}

/** [açık, orta, koyu] — gradient / çerçeve */
export const SEVIYE_GIRIS_RENKLERI: Record<
  SeviyeGirisKademe,
  readonly [string, string, string]
> = {
  bronz: ['#E8C49A', '#D4A574', '#8B5E3C'],
  gumus: ['#F5F8FF', '#C5D0E4', '#6E7A90'],
  altin: ['#FFF3B0', '#F0B429', '#C99214'],
  efsane: ['#FFE08A', '#FF6B9A', '#9B5CFF'],
};

/** Sinematik ışın / glow RGBA parçaları */
export const SEVIYE_GIRIS_ISIN: Record<
  SeviyeGirisKademe,
  {
    sol: string;
    sag: string;
    core: readonly string[];
    halka: string;
    parcacik: string;
  }
> = {
  bronz: {
    sol: 'rgba(212,165,116,0.28)',
    sag: 'rgba(139,94,60,0.18)',
    core: ['rgba(212,165,116,0.5)', 'rgba(166,124,82,0.22)', 'transparent'],
    halka: 'rgba(212,165,116,0.5)',
    parcacik: '#E8C49A',
  },
  gumus: {
    sol: 'rgba(200,214,235,0.32)',
    sag: 'rgba(124,92,255,0.18)',
    core: ['rgba(232,238,248,0.45)', 'rgba(168,180,200,0.2)', 'transparent'],
    halka: 'rgba(200,214,235,0.55)',
    parcacik: '#E8EEF8',
  },
  altin: {
    sol: 'rgba(240,180,41,0.38)',
    sag: 'rgba(255,200,80,0.22)',
    core: [
      'rgba(255,224,138,0.65)',
      'rgba(240,180,41,0.35)',
      'rgba(201,146,20,0.12)',
      'transparent',
    ],
    halka: 'rgba(240,180,41,0.65)',
    parcacik: '#FFE08A',
  },
  efsane: {
    sol: 'rgba(255,215,106,0.4)',
    sag: 'rgba(155,92,255,0.32)',
    core: [
      'rgba(255,215,106,0.6)',
      'rgba(255,107,154,0.35)',
      'rgba(155,92,255,0.18)',
      'transparent',
    ],
    halka: 'rgba(255,107,154,0.55)',
    parcacik: '#FFD76A',
  },
};
