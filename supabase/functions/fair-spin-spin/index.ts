/**
 * Fair Spin — spin Edge Function.
 * crypto seed → simulateFairSpin → atomik settle RPC.
 */

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  DEFAULT_CONFIG,
  mergeFairSpinMathConfig,
  publicSegments,
  simulateFairSpin,
  type FairSpinMathConfig,
} from '../_shared/fair-spin/math.ts';

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

type SpinContext = {
  isAdmin: boolean;
  coins: number;
};

function mapContext(raw: unknown): SpinContext | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.error) return null;
  return {
    isAdmin: o.isAdmin === true,
    coins: Number(o.coins ?? 0),
  };
}

async function loadContextFallback(
  admin: SupabaseClient,
  userId: string,
): Promise<SpinContext> {
  const [profileRow, wallet] = await Promise.all([
    admin.from('profiles').select('is_admin').eq('id', userId).maybeSingle(),
    admin.from('wallets').select('coins').eq('user_id', userId).maybeSingle(),
  ]);
  return {
    isAdmin: (profileRow.data as { is_admin?: boolean } | null)?.is_admin === true,
    coins: Number((wallet.data as { coins?: number } | null)?.coins ?? 0),
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
      configOnly?: boolean;
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

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const ctxRaw = await admin.rpc('fair_spin_spin_context', { p_user_id: userId });
    let ctx = mapContext(ctxRaw.data);
    if (!ctx) ctx = await loadContextFallback(admin, userId);

    let config: FairSpinMathConfig = { ...DEFAULT_CONFIG };
    let maintenance = false;
    let gamePaused = false;
    let maintenanceMessage = '';
    try {
      const aktif = await admin.rpc('game_aktif_config', { p_game_code: 'fair_spin' });
      if (aktif.data && typeof aktif.data === 'object') {
        const raw = aktif.data as Record<string, unknown>;
        const durum = (raw.durum ?? {}) as Record<string, unknown>;
        maintenance = durum.maintenance === true;
        gamePaused = durum.gamePaused === true;
        maintenanceMessage = String(durum.maintenanceMessage || '');
        config = mergeFairSpinMathConfig(raw);
      }
    } catch {
      config = { ...DEFAULT_CONFIG };
    }

    if (body.configOnly === true) {
      return jsonBody({
        segments: publicSegments(config),
        minBet: config.minBet,
        maxBet: config.maxBet,
        betPresets: config.betPresets,
        mathVersion: config.mathVersion,
        balance: ctx.coins,
        gamePaused,
        maintenance,
        maintenanceMessage,
      });
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

    const isAdminTest =
      ctx.isAdmin && body.adminTest === true && roomId == null;

    if (maintenance && !isAdminTest) {
      return businessError(
        maintenanceMessage || 'Fair Spin bakımda',
        'maintenance',
      );
    }
    if (gamePaused && !isAdminTest) {
      return businessError('Fair Spin geçici olarak durduruldu', 'paused');
    }

    if (betAmount < config.minBet || betAmount > config.maxBet) {
      return businessError('Bet out of range', 'bet_range');
    }
    if (config.betPresets.length > 0 && !config.betPresets.includes(betAmount)) {
      return businessError('Bet not allowed', 'bet_preset');
    }
    if (!isAdminTest && ctx.coins < betAmount) {
      return businessError('Insufficient coins', 'insufficient_balance');
    }

    const seed = cryptoSeed();
    const simulated = simulateFairSpin({
      config,
      seed,
      betAmount,
      balanceBefore: ctx.coins,
    });

    const { data: settle, error: settleErr } = await admin.rpc(
      'fair_spin_settle_spin',
      {
        p_user_id: userId,
        p_idempotency_key: idempotencyKey,
        p_bet_amount: betAmount,
        p_room_id: roomId,
        p_result: simulated,
        p_admin_test: isAdminTest,
      },
    );

    if (settleErr) {
      const recovered = await admin.rpc('fair_spin_round_by_idempotency_admin', {
        p_user_id: userId,
        p_key: idempotencyKey,
      });
      if (recovered.data && typeof recovered.data === 'object') {
        const r = recovered.data as Record<string, unknown>;
        return jsonBody({
          duplicate: true,
          result: r.result ?? r,
          balanceAfter: r.balanceAfter,
        });
      }
      const msg = settleErr.message ?? 'settle failed';
      const code = /insufficient/i.test(msg)
        ? 'insufficient_balance'
        : /disabled|kill/i.test(msg)
          ? 'feature_disabled'
          : 'settle';
      return businessError(msg, code);
    }

    const settleObj = (settle ?? {}) as Record<string, unknown>;
    return jsonBody({
      duplicate: settleObj.duplicate === true,
      roundId: settleObj.roundId,
      sessionId: settleObj.sessionId,
      balanceAfter: settleObj.balanceAfter,
      result: settleObj.result,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'internal';
    return jsonBody({ error: msg, code: 'internal' }, 500);
  }
});
