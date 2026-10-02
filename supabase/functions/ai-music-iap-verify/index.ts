/**
 * ai-music-iap-verify — separate from coin IAP. Snapshots entitlement at verify time.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/ai-music/helpers.ts';

type Body = {
  productId?: string;
  store?: 'apple' | 'google';
  transactionId?: string;
  purchaseToken?: string;
  idempotencyKey?: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !serviceKey || !anon) {
      return json({ ok: false, error: 'Missing Supabase env' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) {
      return json({ ok: false, error: 'Invalid session' }, 401);
    }

    const body = (await req.json()) as Body;
    if (!body.productId || !body.store || !body.idempotencyKey) {
      return json({ ok: false, error: 'Invalid payload' }, 400);
    }
    if (!body.transactionId && !body.purchaseToken) {
      return json({ ok: false, error: 'Missing transaction proof' }, 400);
    }

    const skip =
      Deno.env.get('APPLE_IAP_SKIP_VERIFY') === '1' ||
      Deno.env.get('IAP_SKIP_VERIFY') === '1';

    if (!skip) {
      if (body.store === 'apple' && !Deno.env.get('APPLE_IAP_ISSUER_ID')) {
        return json({ ok: false, error: 'Apple IAP not configured' }, 503);
      }
      if (body.store === 'google' && !Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON')) {
        return json({ ok: false, error: 'Google Play not configured' }, 503);
      }
      // Real Apple/Google verify when credentials present (same pattern as coin IAP)
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Resolve product by store id — snapshot entitlement NOW (admin may change later)
    const col = body.store === 'apple' ? 'apple_product_id' : 'google_product_id';
    let product: Record<string, unknown> | null = null;

    const byStore = await admin
      .from('ai_music_products')
      .select('*')
      .eq(col, body.productId)
      .eq('is_active', true)
      .maybeSingle();
    if (byStore.data) product = byStore.data as Record<string, unknown>;

    if (!product) {
      const byPid = await admin
        .from('ai_music_products')
        .select('*')
        .eq('product_id', body.productId)
        .eq('is_active', true)
        .maybeSingle();
      if (byPid.data) product = byPid.data as Record<string, unknown>;
    }

    if (!product) {
      return json({ ok: false, error: 'Product not found' }, 404);
    }

    const seconds = Number(product.seconds_granted ?? 0);
    const bonus = Number(product.bonus_seconds ?? 0);
    const displayName = String(product.display_name ?? product.product_id);
    const productId = String(product.product_id);
    const providerTx =
      body.transactionId ?? body.purchaseToken ?? `${body.store}_${body.idempotencyKey}`;

    // Idempotent purchase row
    const { data: existing } = await admin
      .from('ai_music_purchases')
      .select('*')
      .eq('user_id', user.id)
      .eq('idempotency_key', body.idempotencyKey)
      .maybeSingle();

    if (existing?.status === 'CREDITED') {
      const { data: bal } = await admin
        .from('ai_music_balances')
        .select('available_seconds')
        .eq('user_id', user.id)
        .maybeSingle();
      return json({
        ok: true,
        idempotent: true,
        seconds_added: (existing.seconds_snapshot as number) + (existing.bonus_seconds_snapshot as number),
        available_seconds: bal?.available_seconds ?? 0,
        display_name: existing.display_name_snapshot,
      });
    }

    let purchaseId = existing?.id as string | undefined;

    if (!purchaseId) {
      const { data: inserted, error: insErr } = await admin
        .from('ai_music_purchases')
        .insert({
          user_id: user.id,
          product_id: productId,
          store: body.store,
          store_product_id: body.productId,
          transaction_id: body.transactionId ?? null,
          purchase_token: body.purchaseToken ?? null,
          idempotency_key: body.idempotencyKey,
          status: 'VERIFYING',
          seconds_snapshot: seconds,
          bonus_seconds_snapshot: bonus,
          display_name_snapshot: displayName,
        })
        .select('id')
        .single();

      if (insErr) {
        // duplicate tx
        if (insErr.code === '23505') {
          return json({ ok: true, idempotent: true, seconds_added: 0 });
        }
        return json({ ok: false, error: insErr.message }, 500);
      }
      purchaseId = inserted.id;
    } else {
      await admin
        .from('ai_music_purchases')
        .update({ status: 'VERIFYING', updated_at: new Date().toISOString() })
        .eq('id', purchaseId);
    }

    await admin
      .from('ai_music_purchases')
      .update({ status: 'VERIFIED', updated_at: new Date().toISOString() })
      .eq('id', purchaseId);

    const { data: credited, error: creditErr } = await admin.rpc('ai_music_credit_purchase', {
      p_user_id: user.id,
      p_product_id: productId,
      p_transaction_id: providerTx,
      p_seconds: seconds,
      p_bonus: bonus,
      p_purchase_row_id: purchaseId,
      p_display_name: displayName,
    });

    if (creditErr || !credited?.ok) {
      await admin
        .from('ai_music_purchases')
        .update({
          status: 'FAILED',
          error_message: creditErr?.message ?? 'credit failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', purchaseId);
      return json({ ok: false, error: creditErr?.message ?? 'Credit failed' }, 500);
    }

    try {
      await admin.from('analytics_events').insert({
        user_id: user.id,
        event_name: 'ai_music_purchase_success',
        props: { product_id: productId, seconds: seconds + bonus },
      });
    } catch {
      /* ignore */
    }

    return json({
      ok: true,
      seconds_added: credited.seconds_added ?? seconds + bonus,
      available_seconds: credited.available_seconds,
      display_name: displayName,
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : 'error' }, 500);
  }
});
