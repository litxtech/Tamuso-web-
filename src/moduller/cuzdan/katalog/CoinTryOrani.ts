import { EkonomiOranCacheOku } from './EkonomiOranlariniGetir';
import i18n from '../../../i18n';
import { AktifSayiLocale } from '../../../i18n/diller';

/** @deprecated Canlı oran için EkonomiOranCacheOku().coin_try kullan */
export const COIN_TRY_ORANI = 0.1;

export function CoinTryOraniCanli(): number {
  return EkonomiOranCacheOku().coin_try;
}

export function DiamondTryOraniCanli(): number {
  return EkonomiOranCacheOku().diamond_try;
}

export function CoinTryKarsiligi(coins: number): number {
  const n = Number(coins);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * CoinTryOraniCanli() * 100) / 100;
}

export function ElmasTryKarsiligi(diamonds: number): number {
  const n = Number(diamonds);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * DiamondTryOraniCanli() * 100) / 100;
}

export function TryYazi(tutar: number, locale?: string | null): string {
  const loc = locale ?? AktifSayiLocale(i18n.language);
  return `${tutar.toLocaleString(loc, {
    minimumFractionDigits: tutar % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} ₺`;
}
