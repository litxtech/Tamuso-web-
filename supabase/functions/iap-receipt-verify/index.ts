import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  appleIslemDogrula,
  googleIslemDogrula,
  MagazaDogrulamaHatasi,
  type DogrulanmisIslem,
} from '../_shared/iap/magazaDogrulama.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type Body = {
  packageId?: string;
  store?: 'apple' | 'google';
  productId?: string;
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
      return Response.json({ error: 'Missing Supabase env' }, { status: 500, headers: corsHeaders });
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
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) {
      return Response.json({ error: 'Invalid session' }, { status: 401, headers: corsHeaders });
    }

    const body = (await req.json()) as Body;
    if (!body.store || !body.productId || !body.idempotencyKey) {
      return Response.json({ error: 'Invalid payload' }, { status: 400, headers: corsHeaders });
    }
    if (body.store === 'apple' && !body.transactionId) {
      return Response.json({ error: 'Missing transaction proof' }, { status: 400, headers: corsHeaders });
    }
    if (body.store === 'google' && !body.purchaseToken) {
      return Response.json({ error: 'Missing transaction proof' }, { status: 400, headers: corsHeaders });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Paket yalnızca mağaza ürün kimliğiyle eşlenir; istemcinin gönderdiği packageId'ye güvenilmez.
    const productCol = body.store === 'apple' ? 'apple_product_id' : 'google_product_id';
    const { data: pkgRow, error: pkgErr } = await admin
      .from('coin_packages')
      .select('id, sku, price_usd, apple_product_id, google_product_id, is_active')
      .eq(productCol, body.productId)
      .maybeSingle();
    if (pkgErr || !pkgRow) {
      return Response.json({ error: 'Package not found' }, { status: 404, headers: corsHeaders });
    }
    const pkg = pkgRow as { id: string; price_usd: number | null };
    if (body.packageId && String(pkg.id) !== String(body.packageId)) {
      return Response.json({ error: 'Package/product mismatch' }, { status: 400, headers: corsHeaders });
    }

    let tx: DogrulanmisIslem;
    try {
      tx = body.store === 'apple'
        ? await appleIslemDogrula(String(body.transactionId), body.productId)
        : await googleIslemDogrula(String(body.purchaseToken), body.productId);
    } catch (e) {
      if (e instanceof MagazaDogrulamaHatasi) {
        return Response.json({ error: e.message }, { status: e.status, headers: corsHeaders });
      }
      throw e;
    }

    // Aynı mağaza işlemi ikinci kez coin oluşturmaz; başka hesaba ait işlem reddedilir.
    const { data: existing } = await admin
      .from('coin_purchases')
      .select('id, user_id, coins_added')
      .eq('provider', tx.store)
      .eq('provider_tx_id', tx.providerTxId)
      .maybeSingle();
    if (existing) {
      const row = existing as { user_id: string; coins_added: number };
      if (row.user_id !== user.id) {
        return Response.json({ error: 'Transaction already used' }, { status: 409, headers: corsHeaders });
      }
      return Response.json(
        { ok: true, duplicate: true, coinsAdded: 0, purchase: existing },
        { headers: corsHeaders },
      );
    }

    const { data, error } = await admin.rpc('coin_satin_al_onayla_servis', {
      p_user_id: user.id,
      p_package_id: pkg.id,
      p_idempotency_key: body.idempotencyKey,
      p_provider: tx.store,
      p_provider_tx_id: tx.providerTxId,
      p_store: tx.store,
      p_amount_usd: pkg.price_usd,
      p_receipt: {
        store: tx.store,
        productId: tx.productId,
        transactionId: tx.providerTxId,
        originalTransactionId: tx.originalTxId,
        environment: tx.environment,
        purchasedAt: tx.purchasedAt,
        verified: tx.store === 'apple' ? 'apple_server_api' : 'google_play_api',
      },
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
    }

    return Response.json(
      {
        ok: true,
        coinsAdded: (data as { coins_added?: number })?.coins_added ?? 0,
        purchase: data,
      },
      { headers: corsHeaders },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'verify failed';
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
