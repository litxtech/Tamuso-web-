import { NativeModules, Platform } from 'react-native';
import i18n from '../../../i18n';

export type StripeUygulamaIciOdemeSonuc =
  | { ok: true; paymentIntentId: string; onayBekleniyor?: boolean; onayHata?: string }
  | { ok: false; hata: string; kod?: 'cancel' | 'native' | 'init' | 'stripe' };

/**
 * Native Stripe binary bu build'de var mı?
 * Yoksa @stripe/stripe-react-native ASLA yüklenmez.
 * Paket + app.config plugin bir sonraki EAS build için durur.
 */
export function StripeNativeHazirMi(): boolean {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
  const m = NativeModules as Record<string, unknown>;
  return !!(m.StripeSdk ?? m.Stripe ?? m.RNStripe);
}

/**
 * Native PaymentSheet. Native yoksa kod:native → WebView sheet.
 * require('@stripe/...') yalnız native hazırken, ayrı dosyadan.
 */
export async function StripeUygulamaIciOdemeYap(input: {
  packageId?: string;
  productId?: string;
  offerId?: string;
  catalog?: 'coin' | 'ai_music' | 'agency_package';
}): Promise<StripeUygulamaIciOdemeSonuc> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return { ok: false, hata: i18n.t('cuzdanX.paymentSheetYalnizMobil'), kod: 'native' };
  }

  if (!StripeNativeHazirMi()) {
    return {
      ok: false,
      hata: i18n.t('cuzdanX.stripeNativeSonrakiBuild'),
      kod: 'native',
    };
  }

  // Ayrı dosya: mevcut build'de bu satıra hiç girilmez → stripe JS yüklenmez
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { StripeNativePaymentSheetCalistir } = require('./StripeNativePaymentSheetCalistir') as typeof import('./StripeNativePaymentSheetCalistir');
  return StripeNativePaymentSheetCalistir(input);
}
