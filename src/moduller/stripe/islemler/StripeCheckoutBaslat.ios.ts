import i18n from '../../../i18n';

export type StripeCheckoutSonuc =
  | { ok: true; url: string; sessionId: string }
  | { ok: false; hata: string };

/** iOS: dijital içerik yalnızca App Store uygulama içi satın alma ile satılır. */
export async function StripeCheckoutBaslat(_input: {
  packageId?: string;
  productId?: string;
  offerId?: string;
  catalog?: 'coin' | 'ai_music' | 'agency_package';
  successUrl?: string;
  cancelUrl?: string;
  idempotencyKey?: string;
}): Promise<StripeCheckoutSonuc> {
  return { ok: false, hata: i18n.t('cuzdanY.iosYalnizAppStore') };
}
