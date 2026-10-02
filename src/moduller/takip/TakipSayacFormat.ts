import i18n from '../../i18n';
import { DilNormalizeEt, DIL_LOCALE_MAP } from '../../i18n/diller';

/** Database integer tutar; UI locale kisa formata cevirir. */
export function TakipSayaciniFormatla(
  n: number | null | undefined,
  locale?: string | null,
): string {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  const loc = DilNormalizeEt(
    locale && !locale.includes('-')
      ? locale
      : locale?.slice(0, 2) ?? i18n.language,
  );
  const tr = loc === 'tr';
  if (v < 1000) return String(v);
  const kisalt = (orani: number, trEk: string, enEk: string) => {
    const raw = v / orani;
    if (tr) {
      let s = raw.toFixed(1).replace('.', ',');
      if (s.endsWith(',0')) s = s.slice(0, -2);
      return `${s} ${trEk}`;
    }
    let s = raw.toFixed(1);
    if (s.endsWith('.0')) s = s.slice(0, -2);
    return `${s}${enEk}`;
  };
  if (v < 1_000_000) return kisalt(1000, 'B', 'K');
  return kisalt(1_000_000, 'Mn', 'M');
}

/** Aktif dil için locale string (call site kolaylığı) */
export function TakipSayacLocale(): string {
  return DIL_LOCALE_MAP[DilNormalizeEt(i18n.language)];
}

export function TakipIliskiEtiketi(input: {
  state: string;
  followsYou?: boolean;
  isMutual?: boolean;
}): string | null {
  if (input.state === 'MUTUAL' || input.isMutual) return i18n.t('takip.karsilikli');
  if (input.state === 'FOLLOWS_YOU' || input.followsYou)
    return i18n.t('takip.seniTakipEdiyor');
  if (input.state === 'INCOMING_REQUEST') return i18n.t('takip.istekGonderdi');
  return null;
}
