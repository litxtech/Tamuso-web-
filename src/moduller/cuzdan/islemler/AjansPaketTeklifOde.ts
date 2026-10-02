import { Platform } from 'react-native';
import { OzellikBayragiAktifMiSunucu } from '../../ozellik-bayraklari/okuma/OzellikBayragiAktifMiSunucu';
import {
  StripeNativeHazirMi,
  StripeUygulamaIciOdemeYap,
} from '../../stripe/islemler/StripeUygulamaIciOdemeYap';
import i18n from '../../../i18n';

export type AjansPaketOdemeSonuc =
  | { ok: true; method: 'stripe'; paymentIntentId?: string; webSheet?: boolean }
  | { ok: false; hata: string; kod?: string; webSheet?: boolean };

/**
 * Ajans paket teklifi — Stripe PaymentSheet (native) veya WebView Checkout.
 */
export async function AjansPaketTeklifOde(
  offerId: string,
): Promise<AjansPaketOdemeSonuc> {
  if (!(await OzellikBayragiAktifMiSunucu('stripe_enabled'))) {
    return {
      ok: false,
      hata: i18n.t('cuzdan.stripeKapali'),
      kod: 'flag',
    };
  }

  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return {
      ok: false,
      hata: i18n.t('cuzdanX.paymentSheetYalnizMobil'),
      kod: 'native',
      webSheet: true,
    };
  }

  if (!StripeNativeHazirMi()) {
    return {
      ok: false,
      hata: i18n.t('cuzdanX.stripeNativeSonrakiBuild'),
      kod: 'native',
      webSheet: true,
    };
  }

  const sheet = await StripeUygulamaIciOdemeYap({
    catalog: 'agency_package',
    offerId,
  });

  if (sheet.ok) {
    return {
      ok: true,
      method: 'stripe',
      paymentIntentId: sheet.paymentIntentId,
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
