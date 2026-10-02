import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type ShareLink = {
  code: string;
  title: string;
  platform: string;
  url: string;
  is_active: boolean;
  sort_order: number;
};

function platformFromUa(ua: string): 'ios' | 'android' | 'web' {
  const u = ua.toLowerCase();
  if (/iphone|ipad|ipod|ios/.test(u)) return 'ios';
  if (/android/.test(u)) return 'android';
  return 'web';
}

function pickUrl(links: ShareLink[], platform: 'ios' | 'android' | 'web'): string | null {
  const byCode = (code: string) =>
    links.find((l) => l.code === code && l.is_active)?.url ?? null;
  const byPlatform = (p: string) =>
    links.find((l) => l.platform === p && l.is_active)?.url ?? null;

  if (platform === 'ios') {
    return byCode('ios') ?? byPlatform('ios') ?? byCode('universal') ?? byCode('web') ?? byPlatform('web');
  }
  if (platform === 'android') {
    return (
      byCode('android') ??
      byPlatform('android') ??
      byCode('universal') ??
      byCode('web') ??
      byPlatform('web')
    );
  }
  return byCode('web') ?? byPlatform('web') ?? byCode('universal') ?? byPlatform('universal');
}

function htmlLanding(opts: {
  appName: string;
  shareCode: string | null;
  iosUrl: string | null;
  androidUrl: string | null;
  webUrl: string | null;
}): string {
  const buttons = [
    opts.iosUrl
      ? `<a class="btn ios" href="${opts.iosUrl}">App Store</a>`
      : '',
    opts.androidUrl
      ? `<a class="btn and" href="${opts.androidUrl}">Google Play</a>`
      : '',
    opts.webUrl
      ? `<a class="btn web" href="${opts.webUrl}">Web</a>`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${opts.appName} indir</title>
  <style>
    body{margin:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#12040C;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{max-width:420px;width:100%;background:linear-gradient(160deg,#2A1C34,#16101F);border:1px solid #3d2a48;border-radius:20px;padding:28px}
    h1{margin:0 0 8px;font-size:26px}
    p{color:#b9a8c4;line-height:1.5}
    .code{display:inline-block;margin:12px 0 20px;padding:8px 12px;border-radius:999px;background:#E8409122;color:#E84091;font-weight:700;letter-spacing:1px}
    .btns{display:flex;flex-direction:column;gap:10px}
    .btn{display:block;text-align:center;text-decoration:none;padding:14px 16px;border-radius:14px;font-weight:700;color:#12040C}
    .ios{background:#E84091}.and{background:#34D399}.web{background:#C4B5FD}
  </style>
</head>
<body>
  <div class="card">
    <h1>${opts.appName}</h1>
    <p>Uygulamayı indir, odalara katıl ve sahnede yerini al.</p>
    ${opts.shareCode ? `<div class="code">Davet: ${opts.shareCode}</div>` : ''}
    <div class="btns">${buttons || '<p>İndirme linkleri henüz yapılandırılmadı.</p>'}</div>
  </div>
</body>
</html>`;
}

/**
 * Public share / install redirect.
 * GET /share-redirect?c=DAVETKODU&landing=1
 * GET /share-redirect?ajans_satis=KOD → ajans-pay
 * NOT: verify_jwt = false
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return new Response('Misconfigured', { status: 500, headers: corsHeaders });
    }

    const url = new URL(req.url);
    const shareCode = (url.searchParams.get('c') ?? url.searchParams.get('code') ?? '')
      .trim()
      .toUpperCase() || null;
    const ajansSatis = (url.searchParams.get('ajans_satis') ?? '').trim().toUpperCase() || null;
    const forceLanding = url.searchParams.get('landing') === '1';
    const ua = req.headers.get('user-agent') ?? '';
    const platform = platformFromUa(ua);
    const appName = Deno.env.get('APP_DISPLAY_NAME') ?? 'Tamuso';

    // Eski satış linkleri bozulmasın → yeni ödeme sayfasına
    if (ajansSatis) {
      const pay =
        `${supabaseUrl.replace(/\/$/, '')}/functions/v1/ajans-pay?c=${encodeURIComponent(ajansSatis)}`;
      return Response.redirect(pay, 302);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: links } = await admin
      .from('app_share_links')
      .select('code, title, platform, url, is_active, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    const rows = (links ?? []) as ShareLink[];

    await admin.rpc('paylasim_tiklama_kaydet', {
      p_share_code: shareCode,
      p_link_code: platform,
      p_platform_hint: platform,
      p_user_agent: ua,
    });

    const iosUrl = pickUrl(rows, 'ios');
    const androidUrl = pickUrl(rows, 'android');
    const webUrl = pickUrl(rows, 'web');
    const target = pickUrl(rows, platform);

    const wantsHtml =
      forceLanding ||
      platform === 'web' ||
      url.searchParams.get('format') === 'html';

    if (wantsHtml || !target) {
      return new Response(
        htmlLanding({
          appName,
          shareCode,
          iosUrl,
          androidUrl,
          webUrl: webUrl ?? target,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
          },
        },
      );
    }

    return Response.redirect(target, 302);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
