import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17';
import {
  AjansDekontPdfBytes,
  DEKONT_PDF_VERSION,
} from '../_shared/ajansDekontPdf.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, stripe-signature',
};

type OnaySonuc = {
  ok?: boolean;
  sale_id?: string;
  agency_id?: string;
  buyer_id?: string | null;
  coins?: number;
  amount_try?: number;
  package_title?: string;
  buyer_name?: string | null;
  buyer_email?: string | null;
  sale_link_code?: string;
  agency_name?: string | null;
  stripe_pi?: string | null;
  receipt_url?: string | null;
  pdf_path?: string | null;
  idempotent?: boolean;
};

async function ajansDekontPdfKaydet(
  admin: ReturnType<typeof createClient>,
  sonuc: OnaySonuc,
  txId: string,
) {
  const saleId = sonuc.sale_id;
  const agencyId = sonuc.agency_id;
  if (!saleId || !agencyId) return;
  if (sonuc.pdf_path && sonuc.receipt_url) return;

  let agencyName = sonuc.agency_name ?? '';
  let agencyPublicId = '';
  {
    const { data: ag } = await admin
      .from('agencies')
      .select('name, agency_public_id')
      .eq('id', agencyId)
      .maybeSingle();
    agencyName = agencyName || (ag?.name as string) || 'Ajans';
    agencyPublicId = (ag?.agency_public_id as string) || '';
  }

  let buyerUsername = '';
  let buyerPublicId = '';
  if (sonuc.buyer_id) {
    const { data: pr } = await admin
      .from('profiles')
      .select('username, public_user_id')
      .eq('id', sonuc.buyer_id)
      .maybeSingle();
    buyerUsername = (pr?.username as string) || '';
    buyerPublicId = (pr?.public_user_id as string) || '';
  }

  const bytes = await AjansDekontPdfBytes({
    agencyName,
    agencyPublicId,
    agencyId,
    packageTitle: sonuc.package_title ?? 'Ajans paketi',
    amountTry: Number(sonuc.amount_try ?? 0),
    coins: Number(sonuc.coins ?? 0),
    buyerName: sonuc.buyer_name || sonuc.buyer_email || 'Alici',
    buyerEmail: sonuc.buyer_email || undefined,
    buyerUsername: buyerUsername || undefined,
    buyerPublicId: buyerPublicId || undefined,
    buyerId: sonuc.buyer_id || undefined,
    saleId,
    saleCode: sonuc.sale_link_code || undefined,
    stripePi: sonuc.stripe_pi || txId,
    paidAtIso: new Date().toISOString(),
  });

  const path = `${agencyId}/${saleId}.pdf`;
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const { error: upErr } = await admin.storage.from('agency-receipts').upload(path, blob, {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (upErr) {
    console.error('agency receipt upload', upErr.message);
    return;
  }

  const { data: signed, error: signErr } = await admin.storage
    .from('agency-receipts')
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signErr) {
    console.error('agency receipt sign', signErr.message);
  }

  const { error: saveErr } = await admin.rpc('ajans_satis_dekont_url_kaydet', {
    p_sale_id: saleId,
    p_receipt_url: signed?.signedUrl ?? null,
    p_receipt_path: path,
  });
  if (saveErr) console.error('agency receipt url save', saveErr.message);

  const { data: row } = await admin
    .from('agency_tracked_sales')
    .select('receipt_payload')
    .eq('id', saleId)
    .maybeSingle();
  const prev =
    row?.receipt_payload && typeof row.receipt_payload === 'object'
      ? (row.receipt_payload as Record<string, unknown>)
      : {};
  await admin
    .from('agency_tracked_sales')
    .update({
      receipt_payload: {
        ...prev,
        pdf_path: path,
        pdf_url: signed?.signedUrl ?? null,
        pdf_version: DEKONT_PDF_VERSION,
        pdf_at: new Date().toISOString(),
      },
    })
    .eq('id', saleId);
}

async function odemeyiIsle(
  admin: ReturnType<typeof createClient>,
  input: {
    userId: string | null;
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

  if (catalog === 'agency_sale_link') {
    const saleCode =
      (receipt.sale_link_code as string | undefined) ||
      null;
    if (!saleCode) throw new Error('sale_link_code missing');
    const { data, error } = await admin.rpc('ajans_satis_stripe_onayla', {
      p_sale_link_code: saleCode,
      p_idempotency_key: idem,
      p_provider_tx_id: txId,
      p_stripe_session_id: (receipt.stripe_session as string) ?? null,
      p_amount_try: currency === 'try' ? amountTotal : null,
      p_buyer_user_id: userId || null,
      p_buyer_email: (receipt.customer_email as string) ?? null,
      p_buyer_name: (receipt.customer_name as string) ?? null,
      p_receipt: receipt,
    });
    if (error) throw new Error(error.message);
    const sonuc = (data ?? {}) as OnaySonuc;
    // PDF'i mutlaka bekle — waitUntil isolate kapanınca iş yarıda kalıyordu
    try {
      await ajansDekontPdfKaydet(admin, sonuc, txId);
    } catch (e) {
      console.error('agency receipt pdf', e instanceof Error ? e.message : e);
    }
    return;
  }

  if (!userId) throw new Error('user_id required');

  if (catalog === 'agency_package' && agencyOfferId) {
    const { error } = await admin.rpc('ajans_paket_teklif_stripe_onayla', {
      p_user_id: userId,
      p_offer_id: agencyOfferId,
      p_idempotency_key: idem,
      p_provider_tx_id: txId,
      p_amount_try: currency === 'try' ? amountTotal : null,
      p_receipt: receipt,
    });
    if (error) throw new Error(error.message);
    return;
  }

  if (catalog === 'ai_music' && aiProductId) {
    const { error } = await admin.rpc('ai_music_stripe_satin_al_onayla', {
      p_user_id: userId,
      p_product_id: aiProductId,
      p_idempotency_key: idem,
      p_provider_tx_id: txId,
      p_amount_try: currency === 'try' ? amountTotal : null,
      p_amount_usd: currency === 'usd' ? amountTotal : null,
      p_receipt: receipt,
    });
    if (error) throw new Error(error.message);
    return;
  }

  if (packageId) {
    const { error } = await admin.rpc('coin_satin_al_onayla_servis', {
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
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!stripeKey || !webhookSecret || !supabaseUrl || !serviceKey) {
    return Response.json({ error: 'env missing' }, { status: 500, headers: corsHeaders });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return Response.json({ error: 'No signature' }, { status: 400, headers: corsHeaders });
  }

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    // Deno Edge: sync constructEvent çoğu zaman 400 verir → Web Crypto async
    event = await stripe.webhooks.constructEventAsync(raw, signature, webhookSecret);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'bad signature';
    console.error('stripe webhook signature', message);
    return Response.json({ error: message }, { status: 400, headers: corsHeaders });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId =
        (session.metadata?.user_id && session.metadata.user_id.length > 0
          ? session.metadata.user_id
          : null) ??
        session.client_reference_id ??
        null;
      const catalog = session.metadata?.catalog ?? 'coin';
      const packageId = session.metadata?.package_id || null;
      const aiProductId = session.metadata?.ai_music_product_id || null;
      const agencyOfferId = session.metadata?.agency_package_offer_id || null;
      const saleLinkCode = session.metadata?.sale_link_code || null;
      const idem = session.metadata?.idempotency_key ?? session.id;
      const paid = session.payment_status === 'paid';
      const txId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id ?? session.id;
      const amountTotal = session.amount_total != null ? session.amount_total / 100 : null;
      const currency = (session.currency ?? '').toLowerCase();
      const customerDetails = session.customer_details;

      if (paid && (catalog === 'agency_sale_link' || userId)) {
        await odemeyiIsle(admin, {
          userId,
          catalog,
          packageId,
          aiProductId,
          agencyOfferId,
          idem,
          txId,
          amountTotal,
          currency,
          receipt: {
            stripe_session: session.id,
            currency,
            sale_link_code: saleLinkCode,
            customer_email: customerDetails?.email ?? session.customer_email ?? null,
            customer_name: customerDetails?.name ?? null,
            customer_phone: customerDetails?.phone ?? null,
            customer_address: customerDetails?.address ?? null,
            metadata: session.metadata ?? {},
          },
        });
      }
    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      const userId = pi.metadata?.user_id || null;
      const catalog = pi.metadata?.catalog ?? 'coin';
      const packageId = pi.metadata?.package_id || null;
      const aiProductId = pi.metadata?.ai_music_product_id || null;
      const agencyOfferId = pi.metadata?.agency_package_offer_id || null;
      const saleLinkCode = pi.metadata?.sale_link_code || null;
      const idem = pi.metadata?.idempotency_key ?? pi.id;
      const amountTotal = pi.amount_received != null ? pi.amount_received / 100 : pi.amount / 100;
      const currency = (pi.currency ?? '').toLowerCase();

      if (catalog === 'agency_sale_link' || userId) {
        await odemeyiIsle(admin, {
          userId,
          catalog,
          packageId,
          aiProductId,
          agencyOfferId,
          idem,
          txId: pi.id,
          amountTotal,
          currency,
          receipt: {
            payment_intent: pi.id,
            currency,
            mode: 'payment_sheet',
            sale_link_code: saleLinkCode,
            metadata: pi.metadata ?? {},
          },
        });
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'fulfillment failed';
    console.error('stripe webhook fulfill', message);
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }

  return Response.json({ received: true }, { headers: corsHeaders });
});
