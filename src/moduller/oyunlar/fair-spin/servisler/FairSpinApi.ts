/**
 * Fair Spin API — Edge Function + RPC.
 * Client sonucu üretmez.
 */

import { supabase } from '../../../../lib/supabase';
import type {
  FairSpinConfigPayload,
  FairSpinResult,
  FairSpinSegment,
} from '../tipler/FairSpinTipleri';
import {
  oyunEdgeJsonCagir,
  oyunHataKullaniciMesaji,
  oyunRpcRetryIle,
} from '../../ortak/servisler/OyunAgIstek';
import {
  DEFAULT_BET_PRESETS,
  DEFAULT_MAX_BET,
  DEFAULT_MIN_BET,
  DEFAULT_SEGMENTS,
} from '../sabitler/FairSpinSabitleri';

export type SpinApiError = {
  ok: false;
  hata: string;
  code?: string;
  retryable?: boolean;
};

export type SpinApiOk = { ok: true; data: FairSpinResult };

function mapResult(raw: Record<string, unknown>): FairSpinResult {
  return {
    roundId: String(raw.roundId ?? ''),
    sessionId: String(raw.sessionId ?? ''),
    betAmount: Number(raw.betAmount ?? 0),
    segmentId: String(raw.segmentId ?? ''),
    multiplier: Number(raw.multiplier ?? 0),
    payout: Number(raw.payout ?? 0),
    balanceBefore: Number(raw.balanceBefore ?? 0),
    balanceAfter: Number(raw.balanceAfter ?? 0),
    rngSeed: String(raw.rngSeed ?? ''),
    mathVersion: String(raw.mathVersion ?? ''),
    configVersion: String(raw.configVersion ?? ''),
    paytableVersion: String(raw.paytableVersion ?? ''),
    adminTest: raw.adminTest === true,
  };
}

async function recoverSpinByKey(
  idempotencyKey: string,
): Promise<FairSpinResult | null> {
  const { data, error } = await oyunRpcRetryIle(() =>
    supabase.rpc('fair_spin_round_by_idempotency', { p_key: idempotencyKey }),
  );
  if (error || !data) {
    const unfinished = await restoreUnfinishedFairSpinRound();
    return unfinished?.result ?? null;
  }
  const row = data as { result_snapshot?: Record<string, unknown> };
  if (!row.result_snapshot) return null;
  return mapResult(row.result_snapshot);
}

export async function requestFairSpin(req: {
  betAmount: number;
  idempotencyKey: string;
  roomId?: string | null;
  adminTest?: boolean;
}): Promise<SpinApiOk | SpinApiError> {
  const cagri = await oyunEdgeJsonCagir('fair-spin-spin', {
    betAmount: req.betAmount,
    idempotencyKey: req.idempotencyKey,
    roomId: req.roomId ?? null,
    adminTest: req.adminTest === true,
  });

  if (!('data' in cagri)) {
    if (cagri.retryable || cagri.code === 'network' || cagri.code === 'internal') {
      const recovered = await recoverSpinByKey(req.idempotencyKey);
      if (recovered) return { ok: true, data: recovered };
    }
    return {
      ok: false,
      hata: cagri.hata,
      code: cagri.code,
      retryable: cagri.retryable,
    };
  }

  const body = cagri.data;
  if (!body) {
    return { ok: false, hata: 'Boş yanıt', code: 'empty', retryable: true };
  }

  const resultRaw =
    (body.result as Record<string, unknown> | undefined) ??
    (body as Record<string, unknown>);
  return { ok: true, data: mapResult(resultRaw) };
}

export async function warmupFairSpin(): Promise<void> {
  await oyunEdgeJsonCagir('fair-spin-spin', { ping: true }, {
    timeoutMs: 4000,
    deneme: 1,
  }).catch(() => null);
}

export type UnfinishedFairSpinRound = {
  roundId: string;
  result: FairSpinResult;
  status: 'pending_playback' | 'settled';
};

export async function restoreUnfinishedFairSpinRound(): Promise<UnfinishedFairSpinRound | null> {
  const { data, error } = await oyunRpcRetryIle(() =>
    supabase.rpc('fair_spin_unfinished_round'),
  );
  if (error || !data) return null;
  const row = data as {
    round_id?: string;
    status?: string;
    result_snapshot?: Record<string, unknown>;
  };
  if (!row.result_snapshot || !row.round_id) return null;
  return {
    roundId: String(row.round_id),
    status: row.status === 'settled' ? 'settled' : 'pending_playback',
    result: mapResult(row.result_snapshot),
  };
}

export async function markFairSpinRoundPlayed(roundId: string): Promise<void> {
  await oyunRpcRetryIle(() =>
    supabase.rpc('fair_spin_mark_played', { p_round_id: roundId }),
  );
}

export function newFairSpinIdempotencyKey(): string {
  return `fs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function fetchFairSpinConfig(): Promise<FairSpinConfigPayload> {
  const { data, error } = await oyunRpcRetryIle(() =>
    supabase.rpc('fair_spin_public_config'),
  );

  if (error || !data) {
    const { data: wallet } = await supabase
      .from('wallets')
      .select('coins')
      .maybeSingle();
    return {
      segments: DEFAULT_SEGMENTS.map(({ id, multiplier, color, label }) => ({
        id,
        multiplier,
        color,
        label,
      })),
      minBet: DEFAULT_MIN_BET,
      maxBet: DEFAULT_MAX_BET,
      betPresets: [...DEFAULT_BET_PRESETS],
      mathVersion: 'fair-spin-balanced-v1',
      balance: Number((wallet as { coins?: number } | null)?.coins ?? 0),
      gamePaused: false,
      maintenance: false,
      maintenanceMessage: '',
    };
  }

  const raw = data as Record<string, unknown>;
  const segs = Array.isArray(raw.segments)
    ? (raw.segments as FairSpinSegment[])
    : DEFAULT_SEGMENTS.map(({ id, multiplier, color, label }) => ({
        id,
        multiplier,
        color,
        label,
      }));

  return {
    segments: segs,
    minBet: Number(raw.minBet ?? DEFAULT_MIN_BET),
    maxBet: Number(raw.maxBet ?? DEFAULT_MAX_BET),
    betPresets: Array.isArray(raw.betPresets)
      ? (raw.betPresets as number[]).map((n) => Math.floor(Number(n)))
      : [...DEFAULT_BET_PRESETS],
    mathVersion: String(raw.mathVersion ?? 'fair-spin-balanced-v1'),
    balance: Number(raw.balance ?? 0),
    gamePaused: raw.gamePaused === true,
    maintenance: raw.maintenance === true,
    maintenanceMessage: String(raw.maintenanceMessage ?? ''),
  };
}

export function fairSpinHataMesaji(
  mesaj?: string | null,
  code?: string,
): string {
  return oyunHataKullaniciMesaji(mesaj, code);
}
