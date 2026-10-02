import { supabase } from '../../../lib/supabase';
import { FinansIdempotencyAnahtariOlustur } from '../../cuzdan/islemler/FinansIdempotencyAnahtariOlustur';
import i18n from '../../../i18n';

export type StripeCheckoutSonuc =
  | { ok: true; url: string; sessionId: string }
  | { ok: false; hata: string };

/**
 * Stripe Checkout oturumu.
 * catalog: coin | ai_music | agency_package
 * iOS App Store dijital satış için KULLANILMAZ — orada IAP gerekir.
 */
export async function StripeCheckoutBaslat(input: {
  packageId?: string;
  productId?: string;
  offerId?: string;
  catalog?: 'coin' | 'ai_music' | 'agency_package';
  successUrl?: string;
  cancelUrl?: string;
  idempotencyKey?: string;
}): Promise<StripeCheckoutSonuc> {
  const base =
    process.env.EXPO_PUBLIC_STRIPE_CHECKOUT_URL ??
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-checkout`;

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
        ? 'ai_music_stripe'
        : catalog === 'agency_package'
          ? 'agency_pkg_stripe'
          : 'coin_purchase',
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
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        idempotencyKey: idem,
      }),
    });
    const json = (await res.json()) as {
      ok?: boolean;
      url?: string;
      sessionId?: string;
      error?: string;
    };
    if (!res.ok || !json.ok || !json.url || !json.sessionId) {
      return { ok: false, hata: json.error ?? `Stripe ${res.status}` };
    }
    return { ok: true, url: json.url, sessionId: json.sessionId };
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : i18n.t('cuzdanX.stripeNetworkHata'),
    };
  }
}
