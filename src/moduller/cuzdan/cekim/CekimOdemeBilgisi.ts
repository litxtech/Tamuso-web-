/** Onaylanan elmas cekimlerinin bankaya yatis suresi (is gunu). */
import i18n from '../../../i18n';

export const CEKIM_ODEME_IS_GUNU = 23;

export function CekimOdemeBilgisi(): string {
  return i18n.t('cuzdanX.cekimOdemeBilgisi', { gun: CEKIM_ODEME_IS_GUNU });
}

/** Localized payout note — call as CEKIM_ODEME_BILGISI() */
export const CEKIM_ODEME_BILGISI = CekimOdemeBilgisi;
