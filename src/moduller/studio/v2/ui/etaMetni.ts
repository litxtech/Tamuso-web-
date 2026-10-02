import type { CeviriAnahtari } from '../../../../i18n/useCeviri';

export type EtaVeri = {
  remainingSeconds: number;
  minSeconds: number;
  maxSeconds: number;
  confidence: 'measured' | 'low' | 'estimating' | 'unknown' | 'done' | 'stopped';
};

type Cevir = (key: CeviriAnahtari, opts?: Record<string, unknown>) => string;

function dakika(saniye: number) {
  return Math.max(1, Math.round(saniye / 60));
}

export function etaMetni(eta: EtaVeri | null | undefined, t: Cevir): string | null {
  if (!eta) return t('studio.sureHesap');
  if (eta.confidence === 'done' || eta.confidence === 'stopped') return null;
  if (eta.confidence === 'unknown' || eta.remainingSeconds <= 0) return t('studio.sureHesap');
  if (eta.confidence === 'estimating' || eta.confidence === 'low') {
    const alt = dakika(eta.minSeconds || eta.remainingSeconds);
    const ust = dakika(eta.maxSeconds || eta.remainingSeconds);
    if (alt === ust) return t('studio.sureYaklasik', { dakika: alt });
    return t('studio.sureAralik', { alt, ust });
  }
  const sn = eta.remainingSeconds;
  if (sn < 90) return t('studio.sureKisa');
  const dk = Math.floor(sn / 60);
  const kalan = sn % 60;
  return t('studio.sureTam', { dakika: dk, saniye: kalan });
}

export function etaKisa(eta: EtaVeri | null | undefined, t: Cevir): string | null {
  if (!eta || eta.confidence === 'done' || eta.confidence === 'stopped' || eta.confidence === 'unknown') return null;
  const alt = dakika(eta.minSeconds || eta.remainingSeconds);
  const ust = dakika(Math.max(eta.maxSeconds, eta.remainingSeconds));
  if (!eta.remainingSeconds) return t('studio.sureHesap');
  return t('studio.sureKart', { alt, ust });
}
