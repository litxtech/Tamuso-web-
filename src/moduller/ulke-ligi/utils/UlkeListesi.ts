import { ulkeGorunenAd } from '../../kisiler-kesif/utils/KisilerYardimcilar';

/**
 * Geniş ISO 3166-1 alpha-2 kataloğu — picker / arama.
 * İsimler Intl.DisplayNames ile lokalize edilir (ulkeGorunenAd).
 */
export const ULKE_LIGI_ISO_KODLARI = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS',
  'BT', 'BV', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN',
  'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE',
  'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF',
  'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM',
  'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM',
  'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC',
  'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK',
  'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA',
  'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG',
  'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW',
  'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS',
  'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO',
  'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI',
  'VN', 'VU', 'WF', 'WS', 'XK', 'YE', 'YT', 'ZA', 'ZM', 'ZW',
] as const;

export type UlkeListeOgesi = { code: string; name: string };

/** Diyakritik / aksan temizleme — arama eşleşmesi için */
export function ulkeMetinNormalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .trim();
}

/** Tam katalog — dil değişince yeniden hesaplanır */
export function ulkeLigiListesi(): UlkeListeOgesi[] {
  return ULKE_LIGI_ISO_KODLARI.map((code) => ({
    code,
    name: ulkeGorunenAd(code),
  }));
}

/**
 * Picker araması — kod, lokalize ad ve diyakritiksiz ad.
 * `kaynak` verilmezse tam ISO listesi kullanılır.
 */
export function ulkeLigiAra(
  sorgu: string,
  kaynak?: UlkeListeOgesi[],
): UlkeListeOgesi[] {
  const liste = kaynak ?? ulkeLigiListesi();
  const q = ulkeMetinNormalize(sorgu);
  if (!q) return liste;
  return liste.filter((u) => {
    const kod = u.code.toLowerCase();
    const ad = ulkeMetinNormalize(u.name);
    return kod.includes(q) || ad.includes(q);
  });
}

/** Sunucu katalogu + ISO birleşimi — yerelleştirilmiş tam ad öncelikli */
export function ulkeLigiKatalogBirlestir(
  sunucu: { code: string; name?: string | null }[],
): UlkeListeOgesi[] {
  const map = new Map<string, UlkeListeOgesi>();
  for (const code of ULKE_LIGI_ISO_KODLARI) {
    map.set(code, { code, name: ulkeGorunenAd(code) });
  }
  for (const u of sunucu) {
    const code = String(u.code ?? '')
      .trim()
      .toUpperCase();
    if (code.length !== 2) continue;
    const sunucuAd = u.name?.trim() || null;
    map.set(code, {
      code,
      // DisplayNames başarısızsa sunucu İngilizce tam adı kullanılır
      name: ulkeGorunenAd(code, sunucuAd ?? map.get(code)?.name),
    });
  }
  return [...map.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
}
