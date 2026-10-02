import { Platform } from 'react-native';
import i18n from '../../../i18n';
import { FinansIdempotencyAnahtariOlustur } from '../../cuzdan/islemler/FinansIdempotencyAnahtariOlustur';
import { KillSwitchAktifMiSunucu } from '../../ozellik-bayraklari/okuma/KillSwitchAktifMiSunucu';
import { OzellikBayragiAktifMiSunucu } from '../../ozellik-bayraklari/okuma/OzellikBayragiAktifMiSunucu';
import type { CoinPackage } from '../../../types/models';
import { CoinSatinAlOnayla } from './CoinSatinAlOnayla';
import { IapIleCoinSatinAl } from './IapIleCoinSatinAl';
import { StripeCheckoutBaslat } from '../../stripe/islemler/StripeCheckoutBaslat';

export type CoinYukleSonuc =
  | { ok: true; coinsAdded?: number; method: 'iap' | 'stripe' | 'dev'; url?: string }
  | { ok: false; hata: string };

/**
 * Platforma gore odeme yolu:
 * - iOS / Android: IAP (dijital coin — App Store kurali)
 * - web: Stripe Checkout
 * - __DEV__ + store yoksa: manuel sandbox RPC (yalnizca gelistirme)
 */
export async function CoinPaketiSatinAl(pkg: CoinPackage): Promise<CoinYukleSonuc> {
  if (await KillSwitchAktifMiSunucu('kill_coin_purchase')) {
    return { ok: false, hata: i18n.t('cuzdan.coinSatinAlmaKapali') };
  }

  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    const iap = await IapIleCoinSatinAl(pkg);
    if (iap.ok) return { ok: true, coinsAdded: iap.coinsAdded, method: 'iap' };
    if (iap.kod === 'cancel') return { ok: false, hata: i18n.t('auth.iptalEdildi') };

    // Dev fallback: Expo Go / store ürünü yokken
    if (__DEV__ && (iap.kod === 'store' || iap.kod === 'flag')) {
      const dev = await CoinSatinAlOnayla({
        packageId: pkg.id,
        store: 'manual',
        amountUsd: pkg.price_usd,
        idempotencyKey: FinansIdempotencyAnahtariOlustur('coin_purchase'),
      });
      if (!dev.ok) return { ok: false, hata: `${iap.hata} · dev: ${dev.hata}` };
      return { ok: true, coinsAdded: dev.coinsAdded, method: 'dev' };
    }
    return { ok: false, hata: iap.hata };
  }

  // Web / diğer: Stripe
  if (!(await OzellikBayragiAktifMiSunucu('stripe_enabled'))) {
    return { ok: false, hata: i18n.t('cuzdan.stripeKapali') };
  }
  const stripe = await StripeCheckoutBaslat({ packageId: pkg.id });
  if (!stripe.ok) return { ok: false, hata: stripe.hata };
  return { ok: true, method: 'stripe', url: stripe.url };
}
