import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

/**
 * Ajans satış ödeme.
 * Supabase Edge HTML'i text/plain yapıyor → sayfa kaynak kodu görünüyordu.
 * Bu yüzden HTML yok: GET doğrudan Stripe Checkout'a 302.
 *
 * GET  ?c=KOD          → Stripe kart ödemesi
 * GET  ?c=KOD&app=1    → muta:// deep link
 * POST { code }        → { ok, url } JSON
 * verify_jwt = false
 */

function codeFromReq(req: Request, url: URL): string {
  const q = (
    url.searchParams.get('c') ??
    url.searchParams.get('code') ??
    url.searchParams.get('ajans_satis') ??
    ''
  )
    .trim()
    .toUpperCase();
  if (q) return q;
  const parts = url.pathname.split('/').filter(Boolean);
  const last = parts[parts.length - 1] ?? '';
  if (last && last.toLowerCase() !== 'ajans-pay') return last.trim().toUpperCase();
  return '';
}

async function stripeCheckoutUrl(input: {
  admin: ReturnType<typeof createClient>;
  stripeKey: string;
  supabaseUrl: string;
  anon: string | undefined;
  code: string;
  req: Request;
  body?: {
    buyerUserId?: string;
    successUrl?: string;
    cancelUrl?: string;
  };
}): Promise<{ url: string; sessionId: string }> {
  const { admin, stripeKey, supabaseUrl, anon, code, req, body } = input;

  const { data: flag } = await admin
    .from('feature_flags')
    .select('enabled')
    .eq('key', 'stripe_enabled')
    .maybeSingle();
  if (!flag?.enabled) throw new Error('Stripe disabled');

  const { data, error } = await admin.rpc('ajans_satis_linki_getir', { p_code: code });
  if (error) throw new Error(error.message);
  const link = (data as { link?: Record<string, unknown> })?.link;
  if (!link) throw new Error('Sale link not found');

  const amountTry = Number(link.liste_fiyat_try ?? 0);
  const coins = Number(link.coins ?? 0);
  if (!(amountTry > 0) || !(coins > 0)) {
    throw new Error('Invalid package price/coins');
  }

  let buyerUserId: string | null = body?.buyerUserId ?? null;
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ') && anon) {
    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (u.user?.id) buyerUserId = u.user.id;
  }

  const payBase = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/ajans-pay?c=${encodeURIComponent(code)}`;
  const successUrl =
    body?.successUrl ??
    Deno.env.get('STRIPE_SALE_SUCCESS_URL') ??
    `${payBase}&paid=1`;
  const cancelUrl =
    body?.cancelUrl ??
    Deno.env.get('STRIPE_SALE_CANCEL_URL') ??
    `${payBase}&cancel=1`;

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });
  const idem = `agency_sale_${code}_${buyerUserId ?? 'guest'}_${Math.floor(Date.now() / 60000)}`;
  const label = `${String(link.title ?? 'Ajans paketi')} — ${coins.toLocaleString('tr-TR')} coin`;

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'try',
            unit_amount: Math.round(amountTry * 100),
            product_data: {
              name: label,
              description: String(link.description ?? '') || undefined,
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: buyerUserId ?? undefined,
      billing_address_collection: 'auto',
      metadata: {
        catalog: 'agency_sale_link',
        sale_link_code: code,
        agency_id: String(link.agency_id ?? ''),
        package_id: String(link.package_id ?? ''),
        user_id: buyerUserId ?? '',
        coins: String(coins),
        amount_try: String(amountTry),
        idempotency_key: idem,
      },
    },
    { idempotencyKey: idem.slice(0, 255) },
  );

  if (!session.url) throw new Error('Stripe session URL missing');
  return { url: session.url, sessionId: session.id };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const appScheme = Deno.env.get('APP_SCHEME') ?? 'muta';
  if (!supabaseUrl || !serviceKey) {
    return new Response('Misconfigured', { status: 500, headers: corsHeaders });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const url = new URL(req.url);
  const ua = req.headers.get('user-agent') ?? '';

  const openApp = (pathQuery: string) => {
    // Android Chrome: Intent URL uygulamayı açar
    if (/Android/i.test(ua)) {
      return `intent://${pathQuery}#Intent;scheme=${appScheme};package=com.litxtech.muta;end`;
    }
    return `${appScheme}://${pathQuery}`;
  };

  const returnToAppPage = (opts: {
    deep: string;
    bridgeUrl: string;
    headline: string;
    detail: string;
  }) => {
    // Otomatik: deep link
    // Manuel: https bridge (text/plain'de tıklanabilir) → 302 deep link
    const body =
      `${opts.headline}\n\n` +
      `${opts.detail}\n\n` +
      `Uygulamaya donmek icin dokun:\n${opts.bridgeUrl}\n`;
    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
        // Once otomatik dene
        Refresh: `0;url=${opts.deep}`,
        Location: opts.deep,
        'Cache-Control': 'no-store',
      },
    });
  };

  try {
    const code = codeFromReq(req, url);

    // Manuel / otomatik köprü: https → app
    if (req.method === 'GET' && url.searchParams.get('return') === '1') {
      const saleQ = code ? `&c=${encodeURIComponent(code)}` : '';
      const status = url.searchParams.get('status') === 'cancel' ? 'cancel' : 'success';
      const deep =
        status === 'cancel'
          ? openApp(`odeme-basarili?ok=0${saleQ}`)
          : openApp(`odeme-basarili?ok=1${saleQ}`);
      return Response.redirect(deep, 302);
    }

    // Ödeme başarılı → yeşil onay ekranı
    if (req.method === 'GET' && url.searchParams.get('paid') === '1') {
      const saleQ = code ? `&c=${encodeURIComponent(code)}` : '';
      const deep = openApp(`odeme-basarili?ok=1${saleQ}`);
      const bridgeUrl =
        `${supabaseUrl.replace(/\/$/, '')}/functions/v1/ajans-pay?return=1&status=success${saleQ}`;
      return returnToAppPage({
        deep,
        bridgeUrl,
        headline: 'Odeme basariyla alindi.',
        detail: 'Tamuso uygulamasina yonlendiriliyorsun...',
      });
    }
    // İptal → uygulamaya dön
    if (req.method === 'GET' && url.searchParams.get('cancel') === '1') {
      const saleQ = code ? `&c=${encodeURIComponent(code)}` : '';
      const deep = openApp(`odeme-basarili?ok=0${saleQ}`);
      const bridgeUrl =
        `${supabaseUrl.replace(/\/$/, '')}/functions/v1/ajans-pay?return=1&status=cancel${saleQ}`;
      return returnToAppPage({
        deep,
        bridgeUrl,
        headline: 'Odeme iptal edildi.',
        detail: 'Tamuso uygulamasina donebilirsin.',
      });
    }

    // Uygulama deep link
    if (req.method === 'GET' && url.searchParams.get('app') === '1' && code) {
      const deep = openApp(`ajans/satis/${encodeURIComponent(code)}`);
      return Response.redirect(deep, 302);
    }

    if (req.method === 'GET') {
      if (!code) {
        return new Response('Kod gerekli', { status: 400, headers: corsHeaders });
      }
      if (!stripeKey) {
        return new Response('Stripe env missing', { status: 500, headers: corsHeaders });
      }
      const { url: checkoutUrl } = await stripeCheckoutUrl({
        admin,
        stripeKey,
        supabaseUrl,
        anon,
        code,
        req,
      });
      return Response.redirect(checkoutUrl, 302);
    }

    if (req.method === 'POST') {
      if (!stripeKey) {
        return Response.json({ error: 'Stripe env missing' }, { status: 500, headers: corsHeaders });
      }
      const body = (await req.json().catch(() => ({}))) as {
        code?: string;
        buyerUserId?: string;
        successUrl?: string;
        cancelUrl?: string;
      };
      const postCode = (body.code ?? code).trim().toUpperCase();
      if (!postCode) {
        return Response.json({ error: 'code required' }, { status: 400, headers: corsHeaders });
      }
      const session = await stripeCheckoutUrl({
        admin,
        stripeKey,
        supabaseUrl,
        anon,
        code: postCode,
        req,
        body,
      });
      return Response.json(
        { ok: true, url: session.url, sessionId: session.sessionId },
        { headers: corsHeaders },
      );
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'error';
    if (req.method === 'GET') {
      return new Response(message, {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
