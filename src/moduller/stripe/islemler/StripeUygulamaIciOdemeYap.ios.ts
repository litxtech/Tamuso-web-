import i18n from '../../../i18n';

export type StripeUygulamaIciOdemeSonuc =
  | { ok: true; paymentIntentId: string; onayBekleniyor?: boolean; onayHata?: string }
  | { ok: false; hata: string; kod?: 'cancel' | 'native' | 'init' | 'stripe' };

/** iOS derlemesinde Stripe native SDK bağlanmaz. */
export function StripeNativeHazirMi(): boolean {
  return false;
}

export async function StripeUygulamaIciOdemeYap(_input: {
  packageId?: string;
  productId?: string;
  offerId?: string;
  catalog?: 'coin' | 'ai_music' | 'agency_package';
}): Promise<StripeUygulamaIciOdemeSonuc> {
  return { ok: false, hata: i18n.t('cuzdanY.iosYalnizAppStore'), kod: 'native' };
}
