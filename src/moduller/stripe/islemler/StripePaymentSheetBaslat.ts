import { supabase } from '../../../lib/supabase';
import { FinansIdempotencyAnahtariOlustur } from '../../cuzdan/islemler/FinansIdempotencyAnahtariOlustur';
import i18n from '../../../i18n';

export type StripePaymentSheetParams = {
  paymentIntentClientSecret: string;
  paymentIntentId: string;
  ephemeralKey: string;
  customerId: string;
  publishableKey: string | null;
  productLabel: string;
  amountCents: number;
  currency: string;
  idempotencyKey: string;
};

export type StripePaymentSheetSonuc =
  | ({ ok: true } & StripePaymentSheetParams)
  | { ok: false; hata: string };

/**
 * In-app PaymentSheet için PaymentIntent + ephemeral key.
 */
export async function StripePaymentSheetBaslat(input: {
  packageId?: string;
  productId?: string;
  offerId?: string;
  catalog?: 'coin' | 'ai_music' | 'agency_package';
  idempotencyKey?: string;
}): Promise<StripePaymentSheetSonuc> {
  const base =
    process.env.EXPO_PUBLIC_STRIPE_PAYMENT_SHEET_URL ??
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-payment-sheet`;

  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  if (!jwt) return { ok: false, hata: i18n.t('cuzdanX.oturumGerekli') };

  const catalog = input.catalog ?? 'coin';
  const ref =
    catalog === 'ai_music'
      ? (input.productId ?? input.packageId)
      : catalog === 'agency_package'
        ? (input.offerId ?? input.packageId)
        : input.packageId;
  if (!ref) return { ok: false, hata: i18n.t('cuzdanX.paketSecilmedi') };

  const idem =
    input.idempotencyKey ??
    FinansIdempotencyAnahtariOlustur(
      catalog === 'ai_music'
        ? 'ai_music_stripe_sheet'
        : catalog === 'agency_package'
          ? 'agency_pkg_stripe_sheet'
          : 'coin_stripe_sheet',
    );

  try {
    const res = await fetch(base, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        catalog,
        packageId: catalog === 'coin' ? ref : undefined,
        productId: catalog === 'ai_music' ? ref : undefined,
        offerId: catalog === 'agency_package' ? ref : undefined,
        idempotencyKey: idem,
      }),
    });
    const json = (await res.json()) as Partial<StripePaymentSheetParams> & {
      ok?: boolean;
      error?: string;
    };
    if (!res.ok || !json.ok || !json.paymentIntentClientSecret || !json.ephemeralKey || !json.customerId) {
      return { ok: false, hata: json.error ?? `Stripe sheet ${res.status}` };
    }
    return {
      ok: true,
      paymentIntentClientSecret: json.paymentIntentClientSecret,
      paymentIntentId: json.paymentIntentId ?? '',
      ephemeralKey: json.ephemeralKey,
      customerId: json.customerId,
      publishableKey: json.publishableKey ?? null,
      productLabel: json.productLabel ?? 'Tamuso',
      amountCents: Number(json.amountCents ?? 0),
      currency: json.currency ?? 'try',
      idempotencyKey: idem,
    };
  } catch (e) {
    return { ok: false, hata: e instanceof Error ? e.message : 'Stripe network error' };
  }
}
