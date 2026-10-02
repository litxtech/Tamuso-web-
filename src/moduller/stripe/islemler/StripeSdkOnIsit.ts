/**
 * Stripe native SDK ön ısıtma — ödeme sheet'i açılmadan önce çağır.
 */
import { Platform } from 'react-native';
import { StripeNativeHazirMi } from './StripeUygulamaIciOdemeYap';
import { StripePublishableKey } from '../StripePublicSozlesmesi';

let warmPromise: Promise<void> | null = null;

export function StripeSdkOnIsit(): void {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
  if (!StripeNativeHazirMi()) return;
  const pk = StripePublishableKey();
  if (!pk || warmPromise) return;

  warmPromise = (async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const stripeNative = require('@stripe/stripe-react-native') as typeof import('@stripe/stripe-react-native');
    await stripeNative.initStripe({
      publishableKey: pk,
      urlScheme: process.env.EXPO_PUBLIC_APP_SCHEME ?? 'muta',
    });
  })().catch(() => {
    warmPromise = null;
  });
}
