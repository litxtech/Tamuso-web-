import i18n from '../../../i18n';
import { DilNormalizeEt, DIL_LOCALE_MAP } from '../../../i18n/diller';
import {
  HIKAYE_GOSEL_SURE_MS,
  HIKAYE_METIN_SURE_MS,
} from '../sabitler';
import type { HikayeMedyaTuru } from '../tipler';

function aktifLocale(): string {
  const dil = DilNormalizeEt(i18n.language);
  return DIL_LOCALE_MAP[dil] ?? dil;
}

/** Göreli zaman — DurumZaman ile aynı kısa biçim */
export function HikayeZamanMetni(iso: string): string {
  try {
    const d = new Date(iso);
    const fark = Date.now() - d.getTime();
    if (fark < 60_000) {
      return i18n.t('hikaye.zamanSn', { n: Math.max(1, Math.floor(fark / 1000)) });
    }
    if (fark < 3_600_000) {
      return i18n.t('hikaye.zamanDk', { n: Math.floor(fark / 60_000) });
    }
    if (fark < 86_400_000) {
      return i18n.t('hikaye.zamanSa', { n: Math.floor(fark / 3_600_000) });
    }
    return d.toLocaleDateString(aktifLocale(), {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '';
  }
}

export function HikayeTarihSaat(iso: string): string {
  try {
    return new Date(iso).toLocaleString(aktifLocale(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/** İzleyici ilerleme süresi — sunucu duration_ms yoksa varsayılan */
export function HikayeOgeSuresiMs(
  mediaType: HikayeMedyaTuru,
  durationMs?: number | null,
): number {
  const n = Number(durationMs ?? 0);
  if (Number.isFinite(n) && n > 0) return Math.min(Math.floor(n), 60_000);
  if (mediaType === 'text') return HIKAYE_METIN_SURE_MS;
  return HIKAYE_GOSEL_SURE_MS;
}
