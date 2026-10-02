import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type Catalog = 'coin' | 'ai_music' | 'agency_package';

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
      return Response.json({ error: 'Stripe/Supabase env missing' }, { status: 500, headers: corsHeaders });
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

    const body = (await req.json()) as {
      packageId?: string;
      productId?: string;
      offerId?: string;
      catalog?: Catalog;
      successUrl?: string;
      cancelUrl?: string;
      idempotencyKey?: string;
    };

    const catalog: Catalog =
      body.catalog === 'ai_music'
        ? 'ai_music'
        : body.catalog === 'agency_package'
          ? 'agency_package'
          : 'coin';

    const productRef =
      catalog === 'ai_music'
        ? (body.productId ?? body.packageId)
        : catalog === 'agency_package'
          ? (body.offerId ?? body.packageId)
          : body.packageId;

    if (!productRef || !body.idempotencyKey) {
      return Response.json(
        { error: 'packageId/productId/offerId and idempotencyKey required' },
        { status: 400, headers: corsHeaders },
      );
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: flag } = await admin
      .from('feature_flags')
      .select('enabled')
      .eq('key', 'stripe_enabled')
      .maybeSingle();
    if (!flag?.enabled) {
      return Response.json({ error: 'Stripe disabled' }, { status: 403, headers: corsHeaders });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });
    const successUrl =
      body.successUrl ??
      Deno.env.get('STRIPE_SUCCESS_URL') ??
      (catalog === 'ai_music'
        ? 'muta://ai-muzik?stripe=success'
        : catalog === 'agency_package'
          ? 'muta://messages?stripe=success'
          : 'muta://wallet?stripe=success');
    const cancelUrl =
      body.cancelUrl ??
      Deno.env.get('STRIPE_CANCEL_URL') ??
      (catalog === 'ai_music'
        ? 'muta://ai-muzik?stripe=cancel'
        : catalog === 'agency_package'
          ? 'muta://messages?stripe=cancel'
          : 'muta://wallet?stripe=cancel');

    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
    let amountUsd: number | null = null;
    let amountTry: number | null = null;
    let coinPackageId: string | null = null;
    let aiProductId: string | null = null;
    let agencyOfferId: string | null = null;
    let productLabel = '';

    if (catalog === 'agency_package') {
      const { data: offer, error: offerErr } = await admin
        .from('agency_package_offers')
        .select('*')
        .eq('id', productRef)
        .maybeSingle();
      if (offerErr || !offer) {
        return Response.json({ error: 'Offer not found' }, { status: 404, headers: corsHeaders });
      }
      if (offer.buyer_id !== user.id) {
        return Response.json({ error: 'Only buyer can pay' }, { status: 403, headers: corsHeaders });
      }
      if (offer.status !== 'pending') {
        return Response.json({ error: `Offer not payable (${offer.status})` }, { status: 400, headers: corsHeaders });
      }
      agencyOfferId = offer.id as string;
      amountTry = Number(offer.amount_try);
      productLabel = `${offer.title} — ${Number(offer.coins).toLocaleString('tr-TR')} coin (ajans)`;
      lineItems = [
        {
          price_data: {
            currency: 'try',
            unit_amount: Math.round(amountTry * 100),
            product_data: { name: productLabel },
          },
          quantity: 1,
        },
      ];
    } else if (catalog === 'ai_music') {
      let pkg: Record<string, unknown> | null = null;
      const byPid = await admin
        .from('ai_music_products')
        .select('*')
        .eq('product_id', productRef)
        .eq('is_active', true)
        .maybeSingle();
      if (byPid.data) pkg = byPid.data as Record<string, unknown>;
      if (!pkg) {
        const byId = await admin
          .from('ai_music_products')
          .select('*')
          .eq('id', productRef)
          .eq('is_active', true)
          .maybeSingle();
        if (byId.data) pkg = byId.data as Record<string, unknown>;
      }
      if (!pkg) {
        return Response.json({ error: 'AI music package not found' }, { status: 404, headers: corsHeaders });
      }
      aiProductId = String(pkg.product_id);
      amountUsd = pkg.price_usd != null ? Number(pkg.price_usd) : null;
      amountTry = pkg.price_try != null ? Number(pkg.price_try) : null;
      const seconds = Number(pkg.seconds_granted ?? 0) + Number(pkg.bonus_seconds ?? 0);
      const dk = Math.round(seconds / 60);
      productLabel = `${pkg.display_name} — ${dk} dk AI müzik`;
      lineItems = pkg.stripe_price_id
        ? [{ price: pkg.stripe_price_id as string, quantity: 1 }]
        : [
            {
              price_data: {
                currency: amountTry != null ? 'try' : 'usd',
                unit_amount: Math.round(
                  (amountTry != null ? amountTry : Number(amountUsd ?? 0)) * 100,
                ),
                product_data: {
                  name: productLabel,
                  description: (pkg.description as string) ?? undefined,
                },
              },
              quantity: 1,
            },
          ];
    } else {
      const { data: pkg, error: pkgErr } = await admin
        .from('coin_packages')
        .select('*')
        .eq('id', productRef)
        .eq('is_active', true)
        .maybeSingle();
      if (pkgErr || !pkg) {
        return Response.json({ error: 'Package not found' }, { status: 404, headers: corsHeaders });
      }
      coinPackageId = pkg.id as string;
      amountUsd = Number(pkg.price_usd);
      productLabel = `${pkg.title} — ${pkg.coins + (pkg.bonus_coins ?? 0)} coins`;
      lineItems = pkg.stripe_price_id
        ? [{ price: pkg.stripe_price_id as string, quantity: 1 }]
        : [
            {
              price_data: {
                currency: 'usd',
                unit_amount: Math.round(Number(pkg.price_usd) * 100),
                product_data: { name: productLabel },
              },
              quantity: 1,
            },
          ];
    }

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: lineItems,
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: user.id,
        metadata: {
          user_id: user.id,
          catalog,
          package_id: coinPackageId ?? '',
          ai_music_product_id: aiProductId ?? '',
          agency_package_offer_id: agencyOfferId ?? '',
          idempotency_key: body.idempotencyKey,
        },
      },
      { idempotencyKey: body.idempotencyKey },
    );

    await admin.from('payment_orders').upsert(
      {
        user_id: user.id,
        package_id: coinPackageId,
        catalog,
        ai_music_product_id: aiProductId,
        agency_package_offer_id: agencyOfferId,
        provider: 'stripe',
        provider_session_id: session.id,
        amount_usd: amountUsd,
        status: 'pending',
        idempotency_key: body.idempotencyKey,
        metadata: {
          checkout_url: session.url,
          amount_try: amountTry,
          product_label: productLabel,
          agency_package_offer_id: agencyOfferId,
        },
      },
      { onConflict: 'idempotency_key' },
    );

    return Response.json(
      { ok: true, url: session.url, sessionId: session.id },
      { headers: corsHeaders },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'checkout failed';
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
