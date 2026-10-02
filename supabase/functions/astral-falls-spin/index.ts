/**
 * Astral Falls — spin Edge Function.
 */

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { MAX_BET, MIN_BET, simulateAstralFallsSpin } from '../_shared/astral-falls/math.ts';

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
    const payload = JSON.parse(atob(b64 + pad)) as { sub?: string; exp?: number };
    if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now() - 8_000) {
      return null;
    }
    return typeof payload.sub === 'string' && payload.sub.length > 0 ? payload.sub : null;
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
  freeSpins: number;
  freeBet: number;
};

function mapContext(raw: unknown): SpinContext | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.error) return null;
  return {
    isAdmin: o.isAdmin === true,
    coins: Number(o.coins ?? 0),
    freeSpins: Number(o.freeSpins ?? 0),
    freeBet: Number(o.freeBet ?? 0),
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
    freeSpins: 0,
    freeBet: 0,
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
      freeMode?: boolean;
      ping?: boolean;
      configOnly?: boolean;
    } = {};
    try {
      body = (await req.json()) as typeof body;
    } catch {
      body = {};
    }

    if (body.ping === true) return jsonBody({ pong: true, ts: Date.now() });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonBody({ error: 'Unauthorized', code: 'auth' }, 401);
    }
    const userId = jwtSub(authHeader);
    if (!userId) return jsonBody({ error: 'Unauthorized', code: 'auth' }, 401);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const ctxRaw = await admin.rpc('astral_falls_spin_context', { p_user_id: userId });
    let ctx = mapContext(ctxRaw.data);
    if (!ctx) ctx = await loadContextFallback(admin, userId);

    let maintenance = false;
    let gamePaused = false;
    let maintenanceMessage = '';
    try {
      const aktif = await admin.rpc('game_aktif_config', { p_game_code: 'astral_falls' });
      if (aktif.data && typeof aktif.data === 'object') {
        const raw = aktif.data as Record<string, unknown>;
        const durum = (raw.durum ?? {}) as Record<string, unknown>;
        maintenance = durum.maintenance === true;
        gamePaused = durum.gamePaused === true;
        maintenanceMessage = String(durum.maintenanceMessage || '');
      }
    } catch {
      /* default open */
    }

    if (body.configOnly === true) {
      return jsonBody({
        minBet: MIN_BET,
        maxBet: MAX_BET,
        balance: ctx.coins,
        freeSpins: ctx.freeSpins,
        freeBet: ctx.freeBet,
        gamePaused,
        maintenance,
        maintenanceMessage,
      });
    }

    const betAmount = Math.round(Number(body.betAmount ?? 0) * 100) / 100;
    const idempotencyKey = String(body.idempotencyKey ?? '').trim();
    const roomId = normalizeRoomId(body.roomId);
    const freeMode = body.freeMode === true;
    if (!idempotencyKey) return businessError('idempotencyKey required', 'idempotency');
    if (!Number.isFinite(betAmount) || betAmount <= 0) {
      return businessError('Invalid bet', 'bet');
    }

    const isAdminTest = ctx.isAdmin && body.adminTest === true && roomId == null;

    if (maintenance && !isAdminTest) {
      return businessError(maintenanceMessage || 'Astral Falls bakımda', 'maintenance');
    }
    if (gamePaused && !isAdminTest) {
      return businessError('Astral Falls geçici olarak durduruldu', 'paused');
    }

    const stake = freeMode && ctx.freeBet > 0 ? ctx.freeBet : betAmount;
    if (stake < MIN_BET || stake > MAX_BET) {
      return businessError('Bet out of range', 'bet_range');
    }
    if (!freeMode && !isAdminTest && ctx.coins < Math.ceil(stake)) {
      return businessError('Insufficient coins', 'insufficient_balance');
    }
    if (freeMode && ctx.freeSpins <= 0 && !isAdminTest) {
      return businessError('No free spins', 'no_free');
    }

    const seed = cryptoSeed();
    const simulated = simulateAstralFallsSpin({
      seed,
      betAmount: stake,
      freeMode: freeMode || ctx.freeSpins > 0,
    });

    const { data: settle, error: settleErr } = await admin.rpc('astral_falls_settle_spin', {
      p_user_id: userId,
      p_idempotency_key: idempotencyKey,
      p_bet_amount: stake,
      p_room_id: roomId,
      p_result: simulated,
      p_free_mode: freeMode,
      p_admin_test: isAdminTest,
    });

    if (settleErr) {
      const recovered = await admin.rpc('astral_falls_round_by_idempotency_admin', {
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

    return jsonBody(settle);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'internal';
    return jsonBody({ error: msg, code: 'internal' }, 500);
  }
});
