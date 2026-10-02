/**
 * Native PaymentSheet — StripeNativeHazirMi() true iken require edilir.
 */
import { StripePublishableKey } from '../StripePublicSozlesmesi';
import { StripePaymentSheetBaslat } from './StripePaymentSheetBaslat';
import { StripeOdemeOnayla } from './StripeOdemeOnayla';
import type { StripeUygulamaIciOdemeSonuc } from './StripeUygulamaIciOdemeYap';
import i18n from '../../../i18n';

let stripeInitPromise: Promise<void> | null = null;

async function stripeSdkHazirla(
  stripeNative: typeof import('@stripe/stripe-react-native'),
  publishableKey: string,
): Promise<void> {
  if (!stripeInitPromise) {
    stripeInitPromise = stripeNative
      .initStripe({
        publishableKey,
        urlScheme: process.env.EXPO_PUBLIC_APP_SCHEME ?? 'muta',
      })
      .then(() => undefined)
      .catch((e) => {
        stripeInitPromise = null;
        throw e;
      });
  }
  await stripeInitPromise;
}

export async function StripeNativePaymentSheetCalistir(input: {
  packageId?: string;
  productId?: string;
  offerId?: string;
  catalog?: 'coin' | 'ai_music' | 'agency_package';
}): Promise<StripeUygulamaIciOdemeSonuc> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const stripeNative = require('@stripe/stripe-react-native') as typeof import('@stripe/stripe-react-native');

  const pkHint = StripePublishableKey();
  const initWarm =
    pkHint != null
      ? stripeSdkHazirla(stripeNative, pkHint).catch(() => undefined)
      : Promise.resolve();

  const sheet = await StripePaymentSheetBaslat(input);
  if (!sheet.ok) return { ok: false, hata: sheet.hata, kod: 'stripe' };

  const pk = sheet.publishableKey ?? pkHint;
  if (!pk) {
    return {
      ok: false,
      hata: i18n.t('cuzdanX.publishableKeyEksik'),
      kod: 'init',
    };
  }

  try {
    await initWarm;
    await stripeSdkHazirla(stripeNative, pk);
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : i18n.t('cuzdanX.stripeInitBasarisiz'),
      kod: 'native',
    };
  }

  const { error: initErr } = await stripeNative.initPaymentSheet({
    merchantDisplayName: 'Tamuso',
    customerId: sheet.customerId,
    customerEphemeralKeySecret: sheet.ephemeralKey,
    paymentIntentClientSecret: sheet.paymentIntentClientSecret,
    allowsDelayedPaymentMethods: false,
    returnURL: `${process.env.EXPO_PUBLIC_APP_SCHEME ?? 'muta'}://stripe-redirect`,
    defaultBillingDetails: {},
  });

  if (initErr) {
    return { ok: false, hata: initErr.message, kod: 'init' };
  }

  const { error: presentErr } = await stripeNative.presentPaymentSheet();
  if (presentErr) {
    if (presentErr.code === 'Canceled') {
      return { ok: false, hata: i18n.t('auth.iptalEdildi'), kod: 'cancel' };
    }
    return { ok: false, hata: presentErr.message, kod: 'stripe' };
  }

  if (sheet.paymentIntentId) {
    const onay = await StripeOdemeOnayla(sheet.paymentIntentId);
    if (!onay.ok) {
      return {
        ok: true,
        paymentIntentId: sheet.paymentIntentId,
        onayBekleniyor: true,
        onayHata: onay.hata,
      };
    }
  }

  return { ok: true, paymentIntentId: sheet.paymentIntentId };
}
