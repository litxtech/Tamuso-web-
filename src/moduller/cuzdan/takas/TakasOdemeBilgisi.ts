/**
 * MUTA PAY takas hesap özeti metinleri.
 * Elmas çekimi (`CekimOdemeBilgisi`) ile karıştırılmaz.
 * Dil: Apple incelemesi — kumar / nakit bozdurma ima etmez.
 */

import i18n from '../../../i18n';

export const TAKAS_ODEME_PENCERELERI = ['01–15', '15–31'] as const;

/** Güncel dildeki ödeme penceresi notu */
export function TakasOdemeBilgisi(): string {
  return i18n.t('takas.odemeBilgisi') as string;
}

/** Güncel dildeki iade / usulsüzlük uyarısı */
export function TakasIadeUyari(): string {
  return i18n.t('takas.iadeUyari') as string;
}

/** @deprecated Prefer TakasOdemeBilgisi() */
export const TAKAS_ODEME_BILGISI = () => TakasOdemeBilgisi();

/** @deprecated Prefer TakasIadeUyari() */
export const TAKAS_IADE_UYARISI = () => TakasIadeUyari();

export const TAKAS_DIL_NOTU = () => i18n.t('takas.dilNotu');
