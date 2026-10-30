/**
 * Fırtına Kralı spin.
 * Sonuç burada, yalnızca yayımlanan oyun matematiği ve kriptografik RNG ile üretilir.
 * İstemcinin gönderdiği kazanç veya tahta yok sayılır; yönetici sonuç planı kullanılmaz.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  createCryptoRng,
  isBetPreset,
  playStormKingSpin,
} from '../_shared/storm-king/engine.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const REQUEST_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!REQUEST_UUID.test(value)) return null;
  return value;
}

function settleCode(message: string): string {
  const text = message.toLowerCase();
  if (text.includes('insufficient')) return 'insufficient_balance';
  if (text.includes('bet')) return 'bet';
  if (text.includes('disabled') || text.includes('kill_games')) return 'feature_disabled';
  if (text.includes('wallet')) return 'wallet';
  return 'settle';
}

type SettlePayload = {
  cancelled?: boolean;
  duplicate?: boolean;
  balance?: number;
  game_balance?: number;
  win?: number;
  result?: Record<string, unknown> | null;
};

function asSettle(raw: unknown): SettlePayload | null {
  if (!raw || typeof raw !== 'object') return null;
  return raw as SettlePayload;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return jsonBody({ error: 'Supabase env missing', code: 'env' }, 500);
    }

    let body: {
      bet?: unknown;
      requestId?: unknown;
      roomId?: unknown;
      ping?: unknown;
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

    const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : '';
    if (!REQUEST_UUID.test(requestId)) {
      return businessError('requestId required', 'request_id');
    }

    const bet = Math.floor(Number(body.bet));
    if (!Number.isFinite(bet) || !isBetPreset(bet)) {
      return businessError('Invalid bet', 'bet');
    }

    const roomId = normalizeRoomId(body.roomId);
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const existing = asSettle(
      (await admin.rpc('storm_king_round_by_request_admin', {
        p_user_id: userId,
        p_request_id: requestId,
      })).data,
    );
    if (existing?.result) {
      return jsonBody({
        balance: Number(existing.balance ?? 0),
        win: Number(existing.win ?? 0),
        duplicate: true,
        result: existing.result,
      });
    }

    const simulated = playStormKingSpin({ bet, rng: createCryptoRng() });
    const { data, error } = await admin.rpc('storm_king_settle', {
      p_user_id: userId,
      p_request_id: requestId,
      p_bet: bet,
      p_room_id: roomId,
      p_result: simulated,
    });

    if (error) {
      const recovered = asSettle(
        (await admin.rpc('storm_king_round_by_request_admin', {
          p_user_id: userId,
          p_request_id: requestId,
        })).data,
      );
      if (recovered?.cancelled === true) {
        return jsonBody({
          cancelled: true,
          balance: Number(recovered.balance ?? 0),
          win: 0,
          duplicate: true,
          result: null,
        });
      }
      if (recovered?.result) {
        return jsonBody({
          balance: Number(recovered.balance ?? 0),
          win: Number(recovered.win ?? 0),
          duplicate: true,
          result: recovered.result,
        });
      }
      return businessError(error.message, settleCode(error.message));
    }

    const payload = asSettle(data);
    if (payload?.cancelled === true) {
      return jsonBody({
        cancelled: true,
        balance: Number(payload.balance ?? 0),
        game_balance: payload.game_balance == null ? undefined : Number(payload.game_balance),
        win: 0,
        duplicate: payload.duplicate === true,
        result: null,
      });
    }
    if (!payload?.result) return businessError('Empty settle', 'settle');

    return jsonBody({
      balance: Number(payload.balance ?? 0),
      game_balance: payload.game_balance == null ? undefined : Number(payload.game_balance),
      win: Number(payload.win ?? 0),
      duplicate: payload.duplicate === true,
      result: payload.result,
    });
  } catch (error) {
    return jsonBody(
      { error: error instanceof Error ? error.message : 'Unknown error', code: 'internal' },
      500,
    );
  }
});
