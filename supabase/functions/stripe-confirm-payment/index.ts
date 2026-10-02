/**
 * stripe-confirm-payment — PaymentSheet sonrası yedek onay.
 * Webhook imza hatası / gecikmesinde client PI'yi Stripe'tan doğrulayıp fulfillment çağırır.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

async function odemeyiIsle(
  admin: ReturnType<typeof createClient>,
  input: {
    userId: string;
    catalog: string;
    packageId?: string | null;
    aiProductId?: string | null;
    agencyOfferId?: string | null;
    idem: string;
    txId: string;
    amountTotal: number | null;
    currency: string;
    receipt: Record<string, unknown>;
  },
) {
  const {
    userId,
    catalog,
    packageId,
    aiProductId,
    agencyOfferId,
    idem,
    txId,
    amountTotal,
    currency,
    receipt,
  } = input;

  if (catalog === 'agency_package' && agencyOfferId) {
    const { data, error } = await admin.rpc('ajans_paket_teklif_stripe_onayla', {
      p_user_id: userId,
      p_offer_id: agencyOfferId,
      p_idempotency_key: idem,
      p_provider_tx_id: txId,
      p_amount_try: currency === 'try' ? amountTotal : null,
      p_receipt: receipt,
    });
    if (error) throw new Error(error.message);
    return data;
  }

  if (catalog === 'ai_music' && aiProductId) {
    const { data, error } = await admin.rpc('ai_music_stripe_satin_al_onayla', {
      p_user_id: userId,
      p_product_id: aiProductId,
      p_idempotency_key: idem,
      p_provider_tx_id: txId,
      p_amount_try: currency === 'try' ? amountTotal : null,
      p_amount_usd: currency === 'usd' ? amountTotal : null,
      p_receipt: receipt,
    });
    if (error) throw new Error(error.message);
    return data;
  }

  if (packageId) {
    const { data, error } = await admin.rpc('coin_satin_al_onayla_servis', {
      p_user_id: userId,
      p_package_id: packageId,
      p_idempotency_key: idem,
      p_provider: 'stripe',
      p_provider_tx_id: txId,
      p_store: 'manual',
      p_amount_usd: currency === 'usd' ? amountTotal : null,
      p_receipt: receipt,
    });
    if (error) throw new Error(error.message);
    return data;
  }

  throw new Error('Unknown catalog / missing product ref');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!stripeKey || !supabaseUrl || !anon || !serviceKey) {
      return Response.json({ error: 'env missing' }, { status: 500, headers: corsHeaders });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) {
      return Response.json({ error: 'Invalid session' }, { status: 401, headers: corsHeaders });
    }

    const body = (await req.json()) as { paymentIntentId?: string };
    if (!body.paymentIntentId) {
      return Response.json({ error: 'paymentIntentId required' }, { status: 400, headers: corsHeaders });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });
    const pi = await stripe.paymentIntents.retrieve(body.paymentIntentId);

    if (pi.metadata?.user_id && pi.metadata.user_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
    }

    if (pi.status !== 'succeeded') {
      return Response.json(
        { ok: false, status: pi.status, error: 'Payment not succeeded yet' },
        { status: 402, headers: corsHeaders },
      );
    }

    const catalog = pi.metadata?.catalog ?? 'coin';
    const packageId = pi.metadata?.package_id || null;
    const aiProductId = pi.metadata?.ai_music_product_id || null;
    const agencyOfferId = pi.metadata?.agency_package_offer_id || null;
    const idem = pi.metadata?.idempotency_key ?? pi.id;
    const amountTotal =
      pi.amount_received != null ? pi.amount_received / 100 : pi.amount / 100;
    const currency = (pi.currency ?? '').toLowerCase();

    const admin = createClient(supabaseUrl, serviceKey);
    const result = await odemeyiIsle(admin, {
      userId: user.id,
      catalog,
      packageId: packageId || null,
      aiProductId: aiProductId || null,
      agencyOfferId: agencyOfferId || null,
      idem,
      txId: pi.id,
      amountTotal,
      currency,
      receipt: { payment_intent: pi.id, currency, mode: 'client_confirm' },
    });

    return Response.json(
      { ok: true, catalog, paymentIntentId: pi.id, result },
      { headers: corsHeaders },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'confirm failed';
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
