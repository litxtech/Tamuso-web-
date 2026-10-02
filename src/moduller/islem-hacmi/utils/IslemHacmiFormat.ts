import type { IslemHacmiKademe } from '../tipler';
import i18n from '../../../i18n';
import { DilNormalizeEt, DIL_LOCALE_MAP } from '../../../i18n/diller';

/** Tam TL tutar — aktif (veya verilen) locale ile biçimlendirilir; sembol ₺ */
export function formatTryExact(
  tutar: number | null | undefined,
  locale?: string | null,
): string {
  const v = Number(tutar ?? 0);
  if (!Number.isFinite(v)) return '₺0';
  const loc =
    locale && locale.includes('-')
      ? locale
      : DIL_LOCALE_MAP[DilNormalizeEt(locale ?? i18n.language)];
  return `₺${v.toLocaleString(loc, { maximumFractionDigits: 2 })}`;
}

/** Kademe etiketi — display_label > name > tire */
export function formatTierLabel(
  tier: IslemHacmiKademe | null | undefined,
  yedek?: string | null,
): string {
  const label = tier?.display_label?.trim() || tier?.name?.trim() || yedek?.trim();
  return label || '—';
}

/** 0..1 ilerlemeyi güvenli aralığa sabitler */
export function progressGuvenli(p: number | null | undefined): number {
  const v = Number(p ?? 0);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}
