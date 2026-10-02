/**
 * ZEUS — spin Edge Function.
 * crypto seed → simulateZeusSpin → atomik settle RPC.
 * Client sonucu üretmez.
 */

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  simulateZeusSpin,
  DEFAULT_CONFIG,
  mergeZeusMathConfig,
  type ZeusMathConfig,
} from '../_shared/zeus/math.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function cryptoSeed(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function jsonBody(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: corsHeaders });
}

function businessError(message: string, code: string): Response {
  return jsonBody({ error: message, code }, 200);
}

function jwtSub(authHeader: string): string | null {
  const token = authHeader.slice(7).trim();
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(b64 + pad)) as {
      sub?: string;
      exp?: number;
    };
    if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now() - 8_000) {
      return null;
    }
    return typeof payload.sub === 'string' && payload.sub.length > 0
      ? payload.sub
      : null;
  } catch {
    return null;
  }
}

function normalizeRoomId(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s || s === 'admin-test') return null;
  return s;
}

function settleCode(message: string): string {
  const t = message.toLowerCase();
  if (t.includes('insufficient')) return 'insufficient_balance';
  if (t.includes('disabled') || t.includes('kill_games')) return 'feature_disabled';
  if (t.includes('zeus disabled')) return 'feature_disabled';
  return 'settle';
}

type SpinContext = {
  isAdmin: boolean;
  coins: number;
  sessionId: string | null;
  bonusSpinsRemaining: number;
  persistentMultiplier: number;
};

function mapContext(raw: unknown): SpinContext | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.error) return null;
  return {
    isAdmin: o.isAdmin === true,
    coins: Number(o.coins ?? 0),
    sessionId: o.sessionId ? String(o.sessionId) : null,
    bonusSpinsRemaining: Number(o.bonusSpinsRemaining ?? 0),
    persistentMultiplier: Number(o.persistentMultiplier ?? 0),
  };
}

async function loadContextFallback(
  admin: SupabaseClient,
  userId: string,
): Promise<SpinContext> {
  const [profileRow, wallet, session] = await Promise.all([
    admin.from('profiles').select('is_admin').eq('id', userId).maybeSingle(),
    admin.from('wallets').select('coins').eq('user_id', userId).maybeSingle(),
    admin
      .from('zeus_sessions')
      .select('id, bonus_spins_remaining, bonus_persistent_multiplier')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const sess = session.data as {
    id?: string;
    bonus_spins_remaining?: number;
    bonus_persistent_multiplier?: number;
  } | null;
  return {
    isAdmin: (profileRow.data as { is_admin?: boolean } | null)?.is_admin === true,
    coins: Number((wallet.data as { coins?: number } | null)?.coins ?? 0),
    sessionId: sess?.id ? String(sess.id) : null,
    bonusSpinsRemaining: Number(sess?.bonus_spins_remaining ?? 0),
    persistentMultiplier: Number(sess?.bonus_persistent_multiplier ?? 0),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return jsonBody({ error: 'Supabase env missing', code: 'env' }, 500);
    }

    let body: {
      betAmount?: number;
      idempotencyKey?: string;
      roomId?: string | null;
      adminTest?: boolean;
      ping?: boolean;
    } = {};
    try {
      body = (await req.json()) as typeof body;
    } catch {
      body = {};
    }

    if (body.ping === true) {
      return jsonBody({ pong: true, ts: Date.now() });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonBody({ error: 'Unauthorized', code: 'auth' }, 401);
    }

    const userId = jwtSub(authHeader);
    if (!userId) {
      return jsonBody({ error: 'Unauthorized', code: 'auth' }, 401);
    }

    const betAmount = Math.floor(Number(body.betAmount ?? 0));
    const idempotencyKey = String(body.idempotencyKey ?? '').trim();
    const roomId = normalizeRoomId(body.roomId);
    if (!idempotencyKey) {
      return businessError('idempotencyKey required', 'idempotency');
    }
    if (!Number.isFinite(betAmount) || betAmount <= 0) {
      return businessError('Invalid bet', 'bet');
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const ctxRaw = await admin.rpc('zeus_spin_context', { p_user_id: userId });
    let ctx = mapContext(ctxRaw.data);
    if (!ctx) {
      ctx = await loadContextFallback(admin, userId);
    }

    let config: ZeusMathConfig = { ...DEFAULT_CONFIG };
    try {
      const aktif = await admin.rpc('game_aktif_config', { p_game_code: 'zeus' });
      if (aktif.data && typeof aktif.data === 'object') {
        const raw = aktif.data as Record<string, unknown>;
        const durum = (raw.durum ?? {}) as Record<string, unknown>;
        if (durum.maintenance === true && !(ctx.isAdmin && body.adminTest === true && roomId == null)) {
          return businessError(
            String(durum.maintenanceMessage || 'Zeus bakımda'),
            'maintenance',
          );
        }
        if (durum.gamePaused === true && !(ctx.isAdmin && body.adminTest === true && roomId == null)) {
          return businessError('Zeus geçici olarak durduruldu', 'paused');
        }
        config = mergeZeusMathConfig(raw);
      }
    } catch {
      config = { ...DEFAULT_CONFIG };
    }

    const isAdmin = ctx.isAdmin;
    const isAdminTest = isAdmin && body.adminTest === true && roomId == null;
    const bonusLeft = ctx.bonusSpinsRemaining;
    const isBonusSpin = bonusLeft > 0;
    const persistentMultiplier = ctx.persistentMultiplier;
    const balanceBefore = ctx.coins;

    if (betAmount < config.minBet || betAmount > config.maxBet) {
      return businessError('Bet out of range', 'bet_range');
    }
    if (config.betPresets.length > 0 && !config.betPresets.includes(betAmount)) {
      return businessError('Bet not allowed', 'bet_preset');
    }

    if (!isAdminTest && !isBonusSpin && balanceBefore < betAmount) {
      return businessError('Insufficient coins', 'insufficient_balance');
    }

    const seed = cryptoSeed();
    const simulated = simulateZeusSpin({
      config,
      seed,
      betAmount,
      roundId: 'pending',
      sessionId: ctx.sessionId ?? 'pending',
      balanceBefore,
      remainingFreeSpins: bonusLeft,
      isFreeSpin: isBonusSpin,
      persistentMultiplier,
    });

    const { data: settle, error: settleErr } = await admin.rpc('zeus_settle_spin', {
      p_user_id: userId,
      p_idempotency_key: idempotencyKey,
      p_bet_amount: betAmount,
      p_room_id: roomId,
      p_result: simulated,
      p_is_bonus_spin: isBonusSpin,
      p_admin_test: isAdminTest,
    });

    if (settleErr) {
      const recovered = await admin.rpc('zeus_round_by_idempotency_admin', {
        p_user_id: userId,
        p_key: idempotencyKey,
      });
      const dup = recovered.data as {
        result?: Record<string, unknown>;
        duplicate?: boolean;
      } | null;
      if (dup?.result) {
        return jsonBody({ result: dup.result, duplicate: true });
      }
      return businessError(settleErr.message, settleCode(settleErr.message));
    }

    const payload = settle as {
      duplicate?: boolean;
      result?: Record<string, unknown>;
      balanceAfter?: number;
      roundId?: string;
      sessionId?: string;
    };

    if (payload.duplicate) {
      return jsonBody({ result: payload.result, duplicate: true });
    }

    const result = {
      ...simulated,
      roundId: String(payload.roundId ?? simulated.roundId),
      sessionId: String(payload.sessionId ?? simulated.sessionId),
      balanceAfter: Number(payload.balanceAfter ?? simulated.balanceAfter),
    };

    return jsonBody({ result });
  } catch (e) {
    return jsonBody(
      {
        error: e instanceof Error ? e.message : 'Unknown error',
        code: 'internal',
      },
      500,
    );
  }
});
