/** Desteklenen arayüz dilleri + locale / ülke çözümleme. */

export const DESTEKLENEN_DILLER = [
  'tr',
  'en',
  'es',
  'pt',
  'ar',
  'fr',
  'fil',
] as const;

export type UygulamaDili = (typeof DESTEKLENEN_DILLER)[number];

/** SYSTEM = cihaz/ülke dili; MANUAL = kullanıcı sabitledi — restart’ta değişmez */
export type DilModu = 'SYSTEM' | 'MANUAL';

/** Desteklenmeyen dil/ülke → English */
export const VARSAYILAN_DIL: UygulamaDili = 'en';

export const DIL_ETIKETLERI: Record<UygulamaDili, string> = {
  tr: 'Türkçe',
  en: 'English',
  es: 'Español',
  pt: 'Português',
  ar: 'العربية',
  fr: 'Français',
  fil: 'Filipino',
};

export const DIL_LOCALE_MAP: Record<UygulamaDili, string> = {
  tr: 'tr-TR',
  en: 'en-US',
  es: 'es-ES',
  pt: 'pt-BR',
  ar: 'ar',
  fr: 'fr-FR',
  fil: 'fil-PH',
};

/**
 * ISO 3166-1 alpha-2 ülke → uygulama dili.
 * Cihaz dili desteklenmiyorsa (örn. de-DE) ülke ile yedek çözümleme.
 */
export const ULKE_DIL_HARITASI: Record<string, UygulamaDili> = {
  // Türkçe
  TR: 'tr',
  CY: 'tr',
  // Arapça
  SA: 'ar',
  AE: 'ar',
  EG: 'ar',
  IQ: 'ar',
  JO: 'ar',
  KW: 'ar',
  LB: 'ar',
  LY: 'ar',
  MA: 'ar',
  OM: 'ar',
  QA: 'ar',
  SY: 'ar',
  TN: 'ar',
  YE: 'ar',
  BH: 'ar',
  DZ: 'ar',
  SD: 'ar',
  PS: 'ar',
  MR: 'ar',
  // İspanyolca
  ES: 'es',
  MX: 'es',
  AR: 'es',
  CO: 'es',
  CL: 'es',
  PE: 'es',
  VE: 'es',
  EC: 'es',
  GT: 'es',
  CU: 'es',
  BO: 'es',
  DO: 'es',
  HN: 'es',
  PY: 'es',
  SV: 'es',
  NI: 'es',
  CR: 'es',
  PA: 'es',
  UY: 'es',
  PR: 'es',
  // Portekizce
  BR: 'pt',
  PT: 'pt',
  AO: 'pt',
  MZ: 'pt',
  CV: 'pt',
  GW: 'pt',
  ST: 'pt',
  TL: 'pt',
  // Fransızca
  FR: 'fr',
  BE: 'fr',
  CH: 'fr',
  LU: 'fr',
  MC: 'fr',
  SN: 'fr',
  CI: 'fr',
  CM: 'fr',
  CD: 'fr',
  MG: 'fr',
  HT: 'fr',
  // Filipino
  PH: 'fil',
  // İngilizce (açık ülke listesi — diğerleri de en fallback)
  US: 'en',
  GB: 'en',
  AU: 'en',
  CA: 'en',
  NZ: 'en',
  IE: 'en',
  ZA: 'en',
  SG: 'en',
  IN: 'en',
  NG: 'en',
  KE: 'en',
  GH: 'en',
  JM: 'en',
  TT: 'en',
};

/** Birincil dil alt etiketi — fil (3 harf) ve tl→fil özel */
function DilPrimaryAl(raw: string): string {
  const kod = raw.trim().toLowerCase().replace('_', '-');
  const primary = kod.split('-')[0] ?? '';
  if (primary === 'tl' || primary === 'fil') return 'fil';
  return primary;
}

/** Locale etiketinden ülke (region) kodu — örn. es-MX → MX */
function LocaleUlkeAl(raw: string): string | null {
  const kod = raw.trim().toUpperCase().replace('_', '-');
  const parts = kod.split('-');
  if (parts.length >= 2) {
    const region = parts[parts.length - 1] ?? '';
    if (/^[A-Z]{2}$/.test(region)) return region;
  }
  return null;
}

/** Aktif (veya verilen) dil için Intl locale etiketi */
export function AktifSayiLocale(dil?: string | null): string {
  return DIL_LOCALE_MAP[DilNormalizeEt(dil)];
}

export function DilDestekleniyorMu(kod: string | null | undefined): boolean {
  if (!kod) return false;
  const k = DilPrimaryAl(kod);
  return (DESTEKLENEN_DILLER as readonly string[]).includes(k);
}

/**
 * Locale / dil kodu → desteklenen dil.
 * 1) dil alt etiketi (tr, es, …)
 * 2) ülke/region haritası (MX→es, PH→fil, …)
 * 3) en
 */
export function DilNormalizeEt(raw: string | null | undefined): UygulamaDili {
  if (!raw) return VARSAYILAN_DIL;
  const primary = DilPrimaryAl(raw);
  if ((DESTEKLENEN_DILLER as readonly string[]).includes(primary)) {
    return primary as UygulamaDili;
  }
  const ulke = LocaleUlkeAl(raw);
  if (ulke && ULKE_DIL_HARITASI[ulke]) return ULKE_DIL_HARITASI[ulke];
  return VARSAYILAN_DIL;
}

/** ISO ülke kodundan dil (profil country_code vb.) */
export function UlkeKodundanDil(ulkeKodu: string | null | undefined): UygulamaDili {
  if (!ulkeKodu) return VARSAYILAN_DIL;
  const kod = ulkeKodu.trim().toUpperCase();
  return ULKE_DIL_HARITASI[kod] ?? VARSAYILAN_DIL;
}

/** Cihaz dili — Intl locale (+ ülke yedek eşlemesi). */
export function CihazDiliniAl(): UygulamaDili {
  try {
    const tag =
      typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().locale
        : '';
    if (tag) return DilNormalizeEt(tag);
  } catch {
    /* Intl yok / bozuk */
  }
  return VARSAYILAN_DIL;
}

/**
 * Öncelik:
 * 1. MANUAL + kayıtlı dil → o dil (kilitle)
 * 2. SYSTEM → cihaz locale (dil + ülke region haritası)
 * 3. profil ülkesi (cihaz locale yoksa)
 * 4. en
 */
export function DilCozumle(input: {
  mod: DilModu;
  manuelDil?: string | null;
  profilDili?: string | null;
  profilUlke?: string | null;
}): UygulamaDili {
  if (input.mod === 'MANUAL' && input.manuelDil) {
    return DilNormalizeEt(input.manuelDil);
  }
  try {
    const tag =
      typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().locale
        : '';
    if (tag) return DilNormalizeEt(tag);
  } catch {
    /* Intl yok */
  }
  if (input.profilUlke) return UlkeKodundanDil(input.profilUlke);
  return VARSAYILAN_DIL;
}
