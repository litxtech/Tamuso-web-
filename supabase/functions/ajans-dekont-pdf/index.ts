import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  AjansDekontPdfBytes,
  DEKONT_PDF_VERSION,
} from '../_shared/ajansDekontPdf.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

/**
 * Ajans dekont PDF üret / imzalı URL döndür.
 * POST { sale_id, force?: boolean }
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !serviceKey || !anon) {
    return Response.json({ error: 'env missing' }, { status: 500, headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const body = (await req.json().catch(() => ({}))) as {
      sale_id?: string;
      force?: boolean;
    };
    const saleId = (body.sale_id ?? '').trim();
    const force = !!body.force;
    if (!saleId) {
      return Response.json({ error: 'sale_id required' }, { status: 400, headers: corsHeaders });
    }

    const token = authHeader.slice(7);
    const isService = token === serviceKey;

    if (!isService) {
      const userClient = createClient(supabaseUrl, anon, {
        global: { headers: { Authorization: authHeader } },
      });
      const { error: yolErr } = await userClient.rpc('ajans_satis_dekont_pdf_yol', {
        p_sale_id: saleId,
      });
      if (yolErr) {
        return Response.json({ error: yolErr.message }, { status: 403, headers: corsHeaders });
      }
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: sale, error: saleErr } = await admin
      .from('agency_tracked_sales')
      .select(
        'id, agency_id, buyer_id, package_title, amount_try, coins, buyer_display_name, buyer_label, buyer_email, selling_platform, receipt_url, receipt_payload, payment_status, stripe_payment_intent_id, stripe_session_id, sale_link_id, created_at',
      )
      .eq('id', saleId)
      .maybeSingle();
    if (saleErr || !sale) {
      return Response.json({ error: 'Sale not found' }, { status: 404, headers: corsHeaders });
    }

    const payload = (sale.receipt_payload ?? {}) as Record<string, unknown>;
    const existingPath =
      (typeof payload.pdf_path === 'string' && payload.pdf_path) ||
      `${sale.agency_id}/${sale.id}.pdf`;
    const pdfVer = Number(payload.pdf_version ?? 0);
    const canCache =
      !force &&
      pdfVer >= DEKONT_PDF_VERSION &&
      typeof payload.pdf_path === 'string' &&
      !!payload.pdf_path;

    if (canCache) {
      const { data: existing } = await admin.storage
        .from('agency-receipts')
        .createSignedUrl(existingPath, 60 * 60);
      if (existing?.signedUrl) {
        return Response.json(
          { ok: true, url: existing.signedUrl, path: existingPath, cached: true },
          { headers: corsHeaders },
        );
      }
    }

    const { data: ag } = await admin
      .from('agencies')
      .select('name, agency_public_id')
      .eq('id', sale.agency_id)
      .maybeSingle();

    let buyerUsername: string | null = null;
    let buyerPublicId: string | null = null;
    if (sale.buyer_id) {
      const { data: pr } = await admin
        .from('profiles')
        .select('username, public_user_id, display_name')
        .eq('id', sale.buyer_id)
        .maybeSingle();
      buyerUsername = (pr?.username as string) || null;
      buyerPublicId = (pr?.public_user_id as string) || null;
    }

    let saleCode =
      (typeof payload.sale_link_code === 'string' && payload.sale_link_code) ||
      '';
    if (!saleCode && sale.sale_link_id) {
      const { data: link } = await admin
        .from('agency_sale_links')
        .select('code')
        .eq('id', sale.sale_link_id)
        .maybeSingle();
      saleCode = (link?.code as string) || '';
    }

    const buyerName =
      sale.buyer_display_name ||
      sale.buyer_label ||
      sale.buyer_email ||
      'Alici';
    const buyerPhone =
      (typeof payload.customer_phone === 'string' && payload.customer_phone) ||
      '';
    const buyerEmail =
      sale.buyer_email ||
      (typeof payload.buyer_email === 'string' ? payload.buyer_email : '') ||
      (typeof payload.customer_email === 'string' ? payload.customer_email : '');

    const bytes = await AjansDekontPdfBytes({
      agencyName: (ag?.name as string) || 'Ajans',
      agencyPublicId: (ag?.agency_public_id as string) || '',
      agencyId: sale.agency_id,
      packageTitle: sale.package_title || 'Ajans paketi',
      amountTry: Number(sale.amount_try ?? 0),
      coins: Number(sale.coins ?? 0),
      buyerName,
      buyerEmail: buyerEmail || undefined,
      buyerPhone: buyerPhone || undefined,
      buyerUsername: buyerUsername || undefined,
      buyerPublicId: buyerPublicId || undefined,
      buyerId: sale.buyer_id || undefined,
      saleId: sale.id,
      saleCode: saleCode || undefined,
      stripePi: sale.stripe_payment_intent_id || undefined,
      stripeSession: sale.stripe_session_id || undefined,
      sellingPlatform: sale.selling_platform || undefined,
      paidAtIso: sale.created_at || new Date().toISOString(),
    });

    const path = `${sale.agency_id}/${sale.id}.pdf`;
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const { error: upErr } = await admin.storage.from('agency-receipts').upload(path, blob, {
      contentType: 'application/pdf',
      upsert: true,
    });
    if (upErr) {
      return Response.json({ error: upErr.message }, { status: 500, headers: corsHeaders });
    }

    const { data: signed, error: signErr } = await admin.storage
      .from('agency-receipts')
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signErr || !signed?.signedUrl) {
      return Response.json(
        { error: signErr?.message ?? 'sign failed' },
        { status: 500, headers: corsHeaders },
      );
    }

    await admin.rpc('ajans_satis_dekont_url_kaydet', {
      p_sale_id: sale.id,
      p_receipt_url: signed.signedUrl,
      p_receipt_path: path,
    });

    // Versiyon damgası (eski kısa PDF'leri yenilemek için)
    await admin
      .from('agency_tracked_sales')
      .update({
        receipt_note: `${buyerName} · ${Number(sale.amount_try ?? 0).toFixed(2)} ₺ · ${Number(sale.coins ?? 0)} coin`,
        receipt_payload: {
          ...payload,
          pdf_path: path,
          pdf_url: signed.signedUrl,
          pdf_version: DEKONT_PDF_VERSION,
          pdf_at: new Date().toISOString(),
        },
      })
      .eq('id', sale.id);

    return Response.json(
      { ok: true, url: signed.signedUrl, path, cached: false },
      { headers: corsHeaders },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'error';
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
