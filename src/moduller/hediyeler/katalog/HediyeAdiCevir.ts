import i18n from '../../../i18n';

/** Katalog / fallback hediye adı — bilinen code → çeviri, yoksa sunucu adı */
export function HediyeAdiCevir(
  code: string | null | undefined,
  fallback?: string | null,
): string {
  if (code && i18n.exists(`hediyeAd.${code}`)) {
    return i18n.t(`hediyeAd.${code}`);
  }
  const ad = fallback?.trim();
  if (ad) return ad;
  return i18n.t('hediye.varsayilanAd');
}
