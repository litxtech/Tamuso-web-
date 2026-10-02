import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';

export type StripeOdemeOnaySonuc =
  | { ok: true; catalog?: string; paymentIntentId: string; result?: unknown }
  | { ok: false; hata: string; status?: string };

/**
 * PaymentSheet sonrası Stripe PI'yi sunucuda doğrula + fulfillment.
 * Webhook gecikse / imza bozulsa bile dakika/coin yüklenir.
 */
export async function StripeOdemeOnayla(
  paymentIntentId: string,
): Promise<StripeOdemeOnaySonuc> {
  if (!paymentIntentId) {
    return { ok: false, hata: i18n.t('cuzdanX.paketSecilmedi') };
  }

  const base =
    process.env.EXPO_PUBLIC_STRIPE_CONFIRM_URL ??
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-confirm-payment`;

  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  if (!jwt) return { ok: false, hata: i18n.t('cuzdanX.oturumGerekli') };

  try {
    const res = await fetch(base, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ paymentIntentId }),
    });
    const json = (await res.json()) as {
      ok?: boolean;
      error?: string;
      status?: string;
      catalog?: string;
      paymentIntentId?: string;
      result?: unknown;
    };
    if (!res.ok || !json.ok) {
      return {
        ok: false,
        hata: json.error ?? `Confirm ${res.status}`,
        status: json.status,
      };
    }
    return {
      ok: true,
      catalog: json.catalog,
      paymentIntentId: json.paymentIntentId ?? paymentIntentId,
      result: json.result,
    };
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : i18n.t('cuzdanX.stripeNetworkHata'),
    };
  }
}
