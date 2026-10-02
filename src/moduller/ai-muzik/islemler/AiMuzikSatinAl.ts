import { Platform } from 'react-native';
import { OzellikBayragiAktifMiSunucu } from '../../ozellik-bayraklari/okuma/OzellikBayragiAktifMiSunucu';
import {
  StripeNativeHazirMi,
  StripeUygulamaIciOdemeYap,
} from '../../stripe/islemler/StripeUygulamaIciOdemeYap';
import type { AiMuzikProduct } from '../tipler';
import { AiMuzikIapSatinAl } from './AiMuzikIapSatinAl';

export type AiMuzikSatinAlSonuc =
  | {
      ok: true;
      method: 'iap' | 'stripe';
      secondsAdded?: number;
      availableSeconds?: number;
      webSheet?: boolean;
      paymentIntentId?: string;
    }
  | { ok: false; hata: string; kod?: string; webSheet?: boolean };

/**
 * AI müzik dakika:
 * - iOS/Android → IAP
 * - Stripe → native PaymentSheet (sonraki build) veya şimdi uygulama içi WebView sheet
 * @stripe/stripe-react-native paketi durur; native yokken import edilmez.
 */
export async function AiMuzikPaketSatinAl(
  pkg: AiMuzikProduct,
): Promise<AiMuzikSatinAlSonuc> {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    const iap = await AiMuzikIapSatinAl(pkg);
    if (iap.ok) {
      return {
        ok: true,
        method: 'iap',
        secondsAdded: iap.secondsAdded,
        availableSeconds: iap.availableSeconds,
      };
    }
    if (iap.kod === 'cancel') return { ok: false, hata: 'İptal edildi', kod: 'cancel' };

    const stripeAcik = await OzellikBayragiAktifMiSunucu('stripe_enabled');
    if (stripeAcik && (iap.kod === 'store' || iap.kod === 'flag')) {
      return AiMuzikStripeIleSatinAl(pkg);
    }
    return { ok: false, hata: iap.hata, kod: iap.kod };
  }

  return AiMuzikStripeIleSatinAl(pkg);
}

async function AiMuzikStripeIleSatinAl(
  pkg: AiMuzikProduct,
): Promise<AiMuzikSatinAlSonuc> {
  if (!(await OzellikBayragiAktifMiSunucu('stripe_enabled'))) {
    return {
      ok: false,
      hata: 'Kart ödemesi kapalı. iOS/Android mağaza satın almayı dene.',
      kod: 'flag',
    };
  }

  // Bu build'de native Stripe yok → WebView sheet (paket sonraki build için duruyor)
  if (!StripeNativeHazirMi()) {
    return {
      ok: false,
      hata: 'Stripe native sonraki build ile gelecek.',
      kod: 'native',
      webSheet: true,
    };
  }

  const sheet = await StripeUygulamaIciOdemeYap({
    catalog: 'ai_music',
    productId: pkg.product_id,
  });

  if (sheet.ok) {
    return {
      ok: true,
      method: 'stripe',
      paymentIntentId: sheet.paymentIntentId,
      // onayBekleniyor: webhook yedek; UI yine başarı gösterir, bakiye yenilenir
    };
  }

  if (sheet.kod === 'cancel') {
    return { ok: false, hata: sheet.hata, kod: 'cancel' };
  }

  return {
    ok: false,
    hata: sheet.hata,
    kod: sheet.kod,
    webSheet: true,
  };
}

export function AiMuzikPaketFiyatYazi(pkg: AiMuzikProduct): string {
  if (pkg.price_try != null && Number(pkg.price_try) > 0) {
    return `${Number(pkg.price_try).toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ₺`;
  }
  if (pkg.price_usd != null && Number(pkg.price_usd) > 0) {
    return `$${Number(pkg.price_usd).toFixed(2)}`;
  }
  return '—';
}

export function AiMuzikPaketDakika(pkg: AiMuzikProduct): number {
  const sn = Number(pkg.seconds_granted ?? 0) + Number(pkg.bonus_seconds ?? 0);
  return Math.max(1, Math.round(sn / 60));
}
