import type { CoinPackage } from '../../../types/models';
import i18n from '../../../i18n';
import { AktifSayiLocale } from '../../../i18n/diller';

export function PaketFiyatTry(pkg: CoinPackage): number {
  if (pkg.store_price_amount != null && Number(pkg.store_price_amount) > 0) {
    return Number(pkg.store_price_amount);
  }
  if (pkg.price_try != null && Number(pkg.price_try) > 0) {
    return Number(pkg.price_try);
  }
  return Math.round(Number(pkg.price_usd) * 35);
}

/** Kullanıcıya gösterilecek fiyat metni (mağaza localized tercih) */
export function PaketFiyatYazi(pkg: CoinPackage, locale?: string | null): string {
  if (pkg.store_display_price?.trim()) {
    return pkg.store_display_price.trim();
  }
  const n = PaketFiyatTry(pkg);
  if (!n || n <= 0) return '—';
  const loc = locale ?? AktifSayiLocale(i18n.language);
  return `${n.toLocaleString(loc, {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  })} ₺`;
}
