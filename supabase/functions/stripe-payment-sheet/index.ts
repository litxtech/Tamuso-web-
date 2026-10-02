/**
 * stripe-payment-sheet — PaymentIntent + ephemeral key for in-app PaymentSheet.
 * Secret key never leaves Edge. Client gets client_secret only.
 * catalog: coin | ai_music | agency_package
 */
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
    const publishableKey =
      Deno.env.get('STRIPE_PUBLISHABLE_KEY') ??
      Deno.env.get('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY');
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

    let amountCents = 0;
    let currency: 'try' | 'usd' = 'try';
    let coinPackageId: string | null = null;
    let aiProductId: string | null = null;
    let agencyOfferId: string | null = null;
    let productLabel = 'Tamuso';

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
      if (offer.expires_at && new Date(offer.expires_at).getTime() < Date.now()) {
        return Response.json({ error: 'Offer expired' }, { status: 400, headers: corsHeaders });
      }
      agencyOfferId = offer.id as string;
      currency = 'try';
      amountCents = Math.round(Number(offer.amount_try) * 100);
      productLabel = `${offer.title} — ${Number(offer.coins).toLocaleString('tr-TR')} coin (ajans)`;
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
      const tryAmt = pkg.price_try != null ? Number(pkg.price_try) : null;
      const usdAmt = pkg.price_usd != null ? Number(pkg.price_usd) : null;
      if (tryAmt != null && tryAmt > 0) {
        currency = 'try';
        amountCents = Math.round(tryAmt * 100);
      } else if (usdAmt != null && usdAmt > 0) {
        currency = 'usd';
        amountCents = Math.round(usdAmt * 100);
      } else {
        return Response.json({ error: 'Package price missing' }, { status: 400, headers: corsHeaders });
      }
      const seconds = Number(pkg.seconds_granted ?? 0) + Number(pkg.bonus_seconds ?? 0);
      productLabel = `${pkg.display_name} — ${Math.round(seconds / 60)} dk AI müzik`;
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
      currency = 'usd';
      amountCents = Math.round(Number(pkg.price_usd) * 100);
      productLabel = `${pkg.title} — ${pkg.coins + (pkg.bonus_coins ?? 0)} coins`;
    }

    if (amountCents < 1) {
      return Response.json({ error: 'Invalid amount' }, { status: 400, headers: corsHeaders });
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('id, stripe_customer_id, display_name')
      .eq('id', user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id as string | null | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: profile?.display_name ?? undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await admin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: '2024-11-20.acacia' },
    );

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency,
        customer: customerId,
        automatic_payment_methods: { enabled: true },
        description: productLabel,
        metadata: {
          user_id: user.id,
          catalog,
          package_id: coinPackageId ?? '',
          ai_music_product_id: aiProductId ?? '',
          agency_package_offer_id: agencyOfferId ?? '',
          idempotency_key: body.idempotencyKey,
        },
      },
      { idempotencyKey: `pi_${body.idempotencyKey}` },
    );

    await admin.from('payment_orders').upsert(
      {
        user_id: user.id,
        package_id: coinPackageId,
        catalog,
        ai_music_product_id: aiProductId,
        agency_package_offer_id: agencyOfferId,
        provider: 'stripe',
        provider_session_id: paymentIntent.id,
        amount_usd: currency === 'usd' ? amountCents / 100 : null,
        status: 'pending',
        idempotency_key: body.idempotencyKey,
        metadata: {
          payment_intent: paymentIntent.id,
          currency,
          amount_cents: amountCents,
          product_label: productLabel,
          mode: 'payment_sheet',
          agency_package_offer_id: agencyOfferId,
        },
      },
      { onConflict: 'idempotency_key' },
    );

    return Response.json(
      {
        ok: true,
        paymentIntentClientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        ephemeralKey: ephemeralKey.secret,
        customerId,
        publishableKey: publishableKey ?? null,
        productLabel,
        amountCents,
        currency,
      },
      { headers: corsHeaders },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'payment sheet failed';
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
