import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as jose from 'npm:jose@5';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-worker-secret',
};

type OutboxRow = {
  id: string;
  user_id: string | null;
  title: string;
  body: string | null;
  deep_link: string | null;
  payload: Record<string, unknown> | null;
};

type PushTokenRow = {
  user_id: string;
  push_token: string;
  push_provider: string;
};

type FirebaseSa = {
  project_id: string;
  client_email: string;
  private_key: string;
};

type PushOpts = {
  channelId?: string;
  sound?: string;
  badge?: number;
};

let cachedFcmToken: { token: string; exp: number } | null = null;

/** Outbox satırları — FCM/APNs'i bombalamadan sınırlı paralellik */
const OUTBOX_CONCURRENCY = 8;

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const runners = Array.from(
    { length: Math.min(concurrency, Math.max(items.length, 1)) },
    async () => {
      while (true) {
        const i = next++;
        if (i >= items.length) return;
        results[i] = await worker(items[i]!, i);
      }
    },
  );
  await Promise.all(runners);
  return results;
}

function dataStringMap(
  deepLink: string | null,
  outboxId: string,
  payload: Record<string, unknown> | null,
  badge?: number,
): Record<string, string> {
  const out: Record<string, string> = {
    outbox_id: outboxId,
  };
  if (deepLink) out.deep_link = deepLink;
  if (typeof badge === 'number' && Number.isFinite(badge)) {
    out.badge = String(Math.max(0, Math.floor(badge)));
  }
  for (const [k, v] of Object.entries(payload ?? {})) {
    if (v == null) continue;
    out[k] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  return out;
}

async function fcmAccessToken(sa: FirebaseSa): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedFcmToken && cachedFcmToken.exp > now + 60) {
    return cachedFcmToken.token;
  }

  const key = await jose.importPKCS8(
    sa.private_key.replace(/\\n/g, '\n'),
    'RS256',
  );
  const jwt = await new jose.SignJWT({
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error(`FCM auth: ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error('FCM access_token yok');
  cachedFcmToken = {
    token: json.access_token,
    exp: now + (json.expires_in ?? 3600),
  };
  return json.access_token;
}

async function fcmGonder(
  sa: FirebaseSa,
  deviceToken: string,
  title: string,
  body: string | null,
  data: Record<string, string>,
  opts?: PushOpts,
): Promise<{ ok: boolean; error?: string }> {
  const access = await fcmAccessToken(sa);
  const channelId = opts?.channelId ?? 'genel';
  const badge =
    typeof opts?.badge === 'number' && Number.isFinite(opts.badge)
      ? Math.max(0, Math.floor(opts.badge))
      : undefined;

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: deviceToken,
          notification: {
            title,
            ...(body ? { body } : {}),
          },
          data,
          android: {
            priority: 'HIGH',
            notification: {
              channel_id: channelId,
              ...(opts?.sound ? { sound: opts.sound } : {}),
              ...(badge !== undefined ? { notification_count: badge } : {}),
              default_vibrate_timings: true,
            },
          },
          apns: {
            payload: {
              aps: {
                sound: opts?.sound ?? 'default',
                ...(badge !== undefined ? { badge } : {}),
              },
            },
          },
        },
      }),
    },
  );
  if (!res.ok) {
    return { ok: false, error: (await res.text()).slice(0, 500) };
  }
  return { ok: true };
}

type ExpoTicket = {
  status?: string;
  id?: string;
  message?: string;
  details?: { error?: string };
};

type ExpoReceipt = {
  status?: string;
  message?: string;
  details?: {
    error?: string;
    apns?: { reason?: string; statusCode?: number };
  };
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Ticket ok ≠ teslim; APNs hatası receipt'te çıkar (InvalidProviderToken vb.). */
async function expoReceiptsAl(
  ticketIds: string[],
): Promise<Record<string, ExpoReceipt>> {
  if (ticketIds.length === 0) return {};
  // Expo receipt'ler genelde 1–few sn içinde hazır
  await sleep(4000);
  const res = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ids: ticketIds }),
  });
  if (!res.ok) return {};
  const json = (await res.json().catch(() => null)) as {
    data?: Record<string, ExpoReceipt>;
  } | null;
  return json?.data ?? {};
}

async function expoGonder(
  tokens: string[],
  title: string,
  body: string | null,
  data: Record<string, string>,
  opts?: PushOpts,
): Promise<{
  ok: boolean;
  error?: string;
  invalidTokens?: string[];
  ticketIds?: string[];
}> {
  const sound = opts?.sound ?? 'default';
  const channelId = opts?.channelId ?? 'genel';
  const badge =
    typeof opts?.badge === 'number' && Number.isFinite(opts.badge)
      ? Math.max(0, Math.floor(opts.badge))
      : undefined;

  const messages = tokens.map((to) => ({
    to,
    title,
    body: body ?? undefined,
    data,
    sound,
    channelId,
    priority: 'high' as const,
    ...(badge !== undefined ? { badge } : {}),
  }));

  const pushRes = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });
  if (!pushRes.ok) {
    return { ok: false, error: (await pushRes.text()).slice(0, 500) };
  }

  const json = (await pushRes.json().catch(() => null)) as {
    data?: ExpoTicket[];
  } | null;

  const invalidTokens: string[] = [];
  const ticketIds: string[] = [];
  const ticketByToken = new Map<string, string>();
  const errors: string[] = [];
  const rows = json?.data ?? [];

  if (rows.length === 0) {
    return { ok: false, error: 'expo_empty_tickets', invalidTokens, ticketIds };
  }

  for (let i = 0; i < tokens.length; i++) {
    const ticket = rows[i];
    if (!ticket) continue;
    if (ticket.status === 'ok' && ticket.id) {
      ticketIds.push(ticket.id);
      ticketByToken.set(ticket.id, tokens[i]);
      continue;
    }
    const errCode = ticket.details?.error ?? ticket.message ?? 'expo_error';
    errors.push(String(errCode));
    if (
      /DeviceNotRegistered|InvalidExpoToken/i.test(String(errCode))
    ) {
      invalidTokens.push(tokens[i]);
    }
  }

  // Asıl teslim doğrulaması — ticket ok iken APNs InvalidProviderToken olabilir
  const receipts = await expoReceiptsAl(ticketIds);
  let delivered = 0;
  for (const tid of ticketIds) {
    const receipt = receipts[tid];
    if (!receipt) {
      // Receipt henüz yok — ticket kabul edilmiş say; APNs gecikebilir
      delivered += 1;
      continue;
    }
    if (receipt.status === 'ok') {
      delivered += 1;
      continue;
    }
    const err =
      receipt.details?.error ??
      receipt.details?.apns?.reason ??
      receipt.message ??
      'expo_receipt_error';
    errors.push(String(err));
    // Token ölü → deaktif. InvalidCredentials proje APNs anahtarı; token'ı silme.
    if (/DeviceNotRegistered|InvalidExpoToken/i.test(String(err))) {
      const tok = ticketByToken.get(tid);
      if (tok) invalidTokens.push(tok);
    }
  }

  if (delivered > 0 && !errors.some((e) => /InvalidCredentials|InvalidProviderToken/i.test(e))) {
    return { ok: true, invalidTokens, ticketIds };
  }

  if (errors.some((e) => /InvalidCredentials|InvalidProviderToken/i.test(e))) {
    return {
      ok: false,
      error:
        'InvalidCredentials: Apple Push (APNs) anahtarı geçersiz — EAS iOS Push Notifications kur.',
      invalidTokens,
      ticketIds,
    };
  }

  if (delivered > 0) {
    return { ok: true, invalidTokens, ticketIds };
  }

  return {
    ok: false,
    error: errors.join(' | ').slice(0, 400) || 'expo_all_failed',
    invalidTokens,
    ticketIds,
  };
}

async function gecersizExpoTokenlariDeaktif(
  admin: ReturnType<typeof createClient>,
  tokens: string[],
): Promise<void> {
  if (tokens.length === 0) return;
  await admin
    .from('device_push_tokens')
    .update({
      active: false,
      notification_enabled: false,
      push_token: null,
    })
    .in('push_token', tokens);
}

function mesajBildirimiMi(
  deepLink: string | null,
  payload: Record<string, unknown> | null,
): boolean {
  const type = String(payload?.type ?? '');
  if (
    type === 'dm' ||
    type === 'direct_message' ||
    type === 'message' ||
    type === 'incoming_call'
  ) {
    return true;
  }
  if (deepLink?.includes('/mesaj/') || deepLink?.includes('/gorusme/')) {
    return true;
  }
  return false;
}

/** Kullanıcı başına okunmamış gelen kutu sayısı (ikon rozeti) */
async function okunmamisSayilariAl(
  admin: ReturnType<typeof createClient>,
  userIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const id of userIds) map.set(id, 0);
  if (userIds.length === 0) return map;

  const { data, error } = await admin
    .from('user_notifications')
    .select('user_id')
    .in('user_id', userIds)
    .is('read_at', null);

  if (error) {
    console.warn('[push] unread count', error.message);
    return map;
  }

  for (const row of data ?? []) {
    const uid = (row as { user_id?: string }).user_id;
    if (!uid) continue;
    map.set(uid, (map.get(uid) ?? 0) + 1);
  }
  return map;
}

/** Mesaj bildirimi — native ses dosyası (app.config sounds) */
const MESAJ_SESI = 'mesaj_uc_ton.wav';
const MESAJ_KANAL = 'mesaj';

function loadFirebaseSa(): FirebaseSa | null {
  const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw) as FirebaseSa;
    if (!sa.project_id || !sa.client_email || !sa.private_key) return null;
    return sa;
  } catch {
    return null;
  }
}

/**
 * notification_outbox → Android FCM (Firebase) + Expo Push.
 * iOS ikon rozeti: aps.badge / Expo badge = okunmamış user_notifications.
 * Auth: PUSH_WORKER_SECRET | push_worker_config.cron_secret | service_role | user JWT
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return Response.json(
        { error: 'Supabase env missing' },
        { status: 500, headers: corsHeaders },
      );
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const workerSecretEnv = Deno.env.get('PUSH_WORKER_SECRET');
    const gotSecret = req.headers.get('x-worker-secret');
    const authHeader = req.headers.get('Authorization');

    let authorized = false;

    // 1) Env worker secret
    if (workerSecretEnv && gotSecret === workerSecretEnv) {
      authorized = true;
    }

    // 2) DB cron_secret (pg_cron / outbox trigger)
    if (!authorized && gotSecret) {
      const { data: cfg } = await admin
        .from('push_worker_config')
        .select('value')
        .eq('key', 'cron_secret')
        .maybeSingle();
      if (cfg?.value && cfg.value === gotSecret) {
        authorized = true;
      }
    }

    // 3) Service role bearer
    if (!authorized && authHeader === `Bearer ${serviceKey}`) {
      authorized = true;
    }

    // 4) Giriş yapmış kullanıcı (mesaj/arama client kick)
    if (!authorized && authHeader?.startsWith('Bearer ')) {
      const userClient = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_ANON_KEY') ?? serviceKey,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: userData } = await userClient.auth.getUser();
      authorized = !!userData.user;
    }

    if (!authorized) {
      return Response.json(
        { error: 'Forbidden' },
        { status: 403, headers: corsHeaders },
      );
    }

    const firebaseSa = loadFirebaseSa();
    const body = req.method === 'POST'
      ? ((await req.json().catch(() => ({}))) as { limit?: number })
      : {};
    const limit = Math.min(Math.max(body.limit ?? 50, 1), 100);

    const { data: pending, error: pendErr } = await admin
      .from('notification_outbox')
      .select('id, user_id, title, body, deep_link, payload')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (pendErr) {
      return Response.json(
        { error: pendErr.message },
        { status: 500, headers: corsHeaders },
      );
    }

    const rows = (pending as OutboxRow[]) ?? [];
    if (rows.length === 0) {
      return Response.json(
        {
          processed: 0,
          sent: 0,
          failed: 0,
          fcm_configured: !!firebaseSa,
        },
        { headers: corsHeaders },
      );
    }

    const userIds = [
      ...new Set(rows.map((r) => r.user_id).filter(Boolean) as string[]),
    ];

    const { data: tokens } = await admin
      .from('device_push_tokens')
      .select('user_id, push_token, push_provider')
      .in('user_id', userIds)
      .eq('active', true)
      .eq('notification_enabled', true)
      .in('push_provider', ['fcm', 'expo'])
      .not('push_token', 'is', null);

    const unreadByUser = await okunmamisSayilariAl(admin, userIds);

    const fcmByUser = new Map<string, string[]>();
    const expoByUser = new Map<string, string[]>();
    for (const t of (tokens as PushTokenRow[]) ?? []) {
      if (!t.push_token) continue;
      if (t.push_provider === 'fcm') {
        const list = fcmByUser.get(t.user_id) ?? [];
        list.push(t.push_token);
        fcmByUser.set(t.user_id, list);
      } else if (t.push_provider === 'expo') {
        const list = expoByUser.get(t.user_id) ?? [];
        list.push(t.push_token);
        expoByUser.set(t.user_id, list);
      }
    }

    let sent = 0;
    let failed = 0;
    let fcmSent = 0;
    let expoSent = 0;

    type RowSonuc = { sent: boolean; fcm: number; expo: number };

    const rowSonuclari = await mapPool(
      rows,
      OUTBOX_CONCURRENCY,
      async (row): Promise<RowSonuc> => {
        const uid = row.user_id;
        const fcmTargets = uid ? fcmByUser.get(uid) ?? [] : [];
        const expoTargets = uid ? expoByUser.get(uid) ?? [] : [];
        const badge = uid ? unreadByUser.get(uid) ?? 1 : 1;
        const data = dataStringMap(row.deep_link, row.id, row.payload, badge);

        if (fcmTargets.length === 0 && expoTargets.length === 0) {
          await admin
            .from('notification_outbox')
            .update({
              status: 'failed',
              processed_at: new Date().toISOString(),
              payload: {
                ...(row.payload ?? {}),
                worker_error: 'no_push_token',
              },
            })
            .eq('id', row.id);
          return { sent: false, fcm: 0, expo: 0 };
        }

        const errors: string[] = [];
        let anyOk = false;
        let rowFcm = 0;
        let rowExpo = 0;
        const isMesaj = mesajBildirimiMi(row.deep_link, row.payload);
        const pushOpts: PushOpts = {
          ...(isMesaj
            ? { channelId: MESAJ_KANAL, sound: MESAJ_SESI }
            : { channelId: 'genel', sound: 'default' }),
          badge,
        };

        if (fcmTargets.length > 0) {
          if (!firebaseSa) {
            errors.push('fcm_no_service_account');
          } else {
            // Token'lar kullanıcı başına sınırlı — sıralı yeterli
            for (const tok of fcmTargets) {
              const r = await fcmGonder(
                firebaseSa,
                tok,
                row.title,
                row.body,
                data,
                pushOpts,
              );
              if (r.ok) {
                anyOk = true;
                rowFcm += 1;
              } else if (r.error) {
                errors.push(r.error);
              }
            }
          }
        }

        if (expoTargets.length > 0) {
          const r = await expoGonder(
            expoTargets,
            row.title,
            row.body,
            data,
            pushOpts,
          );
          if (r.invalidTokens?.length) {
            await gecersizExpoTokenlariDeaktif(admin, r.invalidTokens);
          }
          if (r.ok) {
            anyOk = true;
            rowExpo += 1;
          } else if (r.error) {
            errors.push(r.error);
          }
        }

        if (anyOk) {
          await admin
            .from('notification_outbox')
            .update({
              status: 'sent',
              processed_at: new Date().toISOString(),
            })
            .eq('id', row.id);
          return { sent: true, fcm: rowFcm, expo: rowExpo };
        }

        await admin
          .from('notification_outbox')
          .update({
            status: 'failed',
            processed_at: new Date().toISOString(),
            payload: {
              ...(row.payload ?? {}),
              worker_error: errors.join(' | ').slice(0, 500) || 'send_failed',
            },
          })
          .eq('id', row.id);
        return { sent: false, fcm: rowFcm, expo: rowExpo };
      },
    );

    for (const r of rowSonuclari) {
      if (r.sent) sent += 1;
      else failed += 1;
      fcmSent += r.fcm;
      expoSent += r.expo;
    }

    return Response.json(
      {
        processed: rows.length,
        sent,
        failed,
        fcm_sent: fcmSent,
        expo_sent: expoSent,
        fcm_configured: !!firebaseSa,
        concurrency: OUTBOX_CONCURRENCY,
      },
      { headers: corsHeaders },
    );
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500, headers: corsHeaders },
    );
  }
});
