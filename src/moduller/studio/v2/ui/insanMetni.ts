import type { CeviriAnahtari } from '../../../../i18n/useCeviri';

type Cevir = (key: CeviriAnahtari, opts?: Record<string, unknown>) => string;

export function varlikAdi(key: string): string {
  const yazi = key.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!yazi) return key;
  return yazi.charAt(0).toLocaleUpperCase() + yazi.slice(1);
}

export function durumInsan(status: string, t: Cevir): string {
  switch (status) {
    case 'READY':
    case 'COMPLETED':
    case 'bitti':
      return t('studio.durumHazirKisa');
    case 'RUNNING':
    case 'RETRYING':
    case 'oluyor':
      return t('studio.durumUretiliyor');
    case 'QUEUED':
    case 'BLOCKED':
    case 'bekliyor':
      return t('studio.durumSirada');
    case 'FAILED':
    case 'hata':
      return t('studio.durumHata');
    case 'CANCELLED':
    case 'CANCEL_REQUESTED':
    case 'CANCELLING':
      return t('studio.durumDurdu');
    default:
      return t('studio.hazirlaniyorKisa');
  }
}

export function yamaIslemi(operation: string): CeviriAnahtari {
  switch (operation) {
    case 'UPDATE_MATERIAL':
      return 'studio.opMalzeme';
    case 'UPDATE_TRANSFORM':
      return 'studio.opBoyut';
    case 'UPDATE_LIGHT':
      return 'studio.opIsik';
    case 'UPDATE_CAMERA':
      return 'studio.opKamera';
    case 'UPDATE_ASSET_PROMPT':
      return 'studio.opVarlik';
    default:
      return 'studio.isDosya';
  }
}
