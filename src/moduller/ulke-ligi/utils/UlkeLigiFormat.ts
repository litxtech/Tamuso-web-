import i18n from '../../../i18n';
import { DilNormalizeEt, DIL_LOCALE_MAP } from '../../../i18n/diller';

function aktifLocale(): string {
  try {
    return DIL_LOCALE_MAP[DilNormalizeEt(i18n.language)] ?? 'en-US';
  } catch {
    return 'en-US';
  }
}

/**
 * Kompakt puan biçimi — locale-aware (1.2K / 3.4M).
 * Para birimi toplamaz; sadece contribution points.
 */
export function ulkePuanKisa(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return '0';
  const abs = Math.abs(v);
  const locale = aktifLocale();
  const isaret = v < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    return `${isaret}${(abs / 1_000_000_000).toLocaleString(locale, {
      maximumFractionDigits: abs >= 10_000_000_000 ? 0 : 1,
    })}B`;
  }
  if (abs >= 1_000_000) {
    return `${isaret}${(abs / 1_000_000).toLocaleString(locale, {
      maximumFractionDigits: abs >= 10_000_000 ? 0 : 1,
    })}M`;
  }
  if (abs >= 1000) {
    return `${isaret}${(abs / 1000).toLocaleString(locale, {
      maximumFractionDigits: abs >= 10_000 ? 0 : 1,
    })}K`;
  }
  return `${isaret}${Math.round(abs).toLocaleString(locale)}`;
}

/** Tam puan — locale ayırıcılarla */
export function ulkePuanTam(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return '0';
  return Math.round(v).toLocaleString(aktifLocale());
}

/** Sıra hareketi etiketi (+3 / −1 / —) */
export function ulkeHareketMetni(delta: number | null | undefined): string | null {
  if (delta == null || !Number.isFinite(delta) || delta === 0) return null;
  const n = Math.round(delta);
  return n > 0 ? `↑${n}` : `↓${Math.abs(n)}`;
}
