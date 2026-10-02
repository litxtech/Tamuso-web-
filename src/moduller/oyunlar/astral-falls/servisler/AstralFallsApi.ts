/**
 * Astral Falls API — Edge Function.
 */

import { supabase } from '../../../../lib/supabase';
import {
  oyunEdgeJsonCagir,
  oyunHataKullaniciMesaji,
  oyunRpcRetryIle,
} from '../../ortak/servisler/OyunAgIstek';
import type { AstralFallsSpinResult, SpinPlan } from '../tipler/AstralFallsTipleri';
import { MAX_BET, MIN_BET } from '../sabitler/AstralFallsSabitleri';

export type SpinApiError = {
  ok: false;
  hata: string;
  code?: string;
  retryable?: boolean;
};

export type SpinApiOk = { ok: true; data: AstralFallsSpinResult };

function mapPlan(raw: Record<string, unknown>): SpinPlan {
  return {
    initialGrid: (raw.initialGrid as SpinPlan['initialGrid']) ?? [],
    cascades: (raw.cascades as SpinPlan['cascades']) ?? [],
    payout: Number(raw.payout ?? 0),
    scatterCount: Number(raw.scatterCount ?? 0),
    freeSpinsAwarded: Number(raw.freeSpinsAwarded ?? 0),
    multiplierTotal: Number(raw.multiplierTotal ?? 0),
  };
}

function mapResult(raw: Record<string, unknown>): AstralFallsSpinResult {
  const plan = mapPlan(raw);
  return {
    ...plan,
    roundId: String(raw.roundId ?? ''),
    sessionId: String(raw.sessionId ?? ''),
    betAmount: Number(raw.betAmount ?? 0),
    balanceBefore: Number(raw.balanceBefore ?? 0),
    balanceAfter: Number(raw.balanceAfter ?? 0),
    remainingFreeSpins: Number(raw.remainingFreeSpins ?? 0),
    freeBet: Number(raw.freeBet ?? 0),
    rngSeed: String(raw.rngSeed ?? ''),
    mathVersion: String(raw.mathVersion ?? ''),
    configVersion: String(raw.configVersion ?? ''),
    paytableVersion: String(raw.paytableVersion ?? ''),
    adminTest: raw.adminTest === true,
  };
}

export async function requestAstralFallsSpin(req: {
  betAmount: number;
  idempotencyKey: string;
  roomId?: string | null;
  freeMode?: boolean;
  adminTest?: boolean;
}): Promise<SpinApiOk | SpinApiError> {
  const cagri = await oyunEdgeJsonCagir('astral-falls-spin', {
    betAmount: req.betAmount,
    idempotencyKey: req.idempotencyKey,
    roomId: req.roomId ?? null,
    freeMode: req.freeMode === true,
    adminTest: req.adminTest === true,
  });

  if (!('data' in cagri)) {
    return {
      ok: false,
      hata: cagri.hata,
      code: cagri.code,
      retryable: cagri.retryable,
    };
  }

  const body = cagri.data as Record<string, unknown>;
  if (body.error) {
    return {
      ok: false,
      hata: String(body.error),
      code: String(body.code ?? 'error'),
    };
  }

  const resultRaw =
    (body.result as Record<string, unknown> | undefined) ?? body;
  return { ok: true, data: mapResult(resultRaw) };
}

export async function fetchAstralFallsConfig(): Promise<{
  balance: number;
  freeSpins: number;
  freeBet: number;
  minBet: number;
  maxBet: number;
  maintenance: boolean;
  gamePaused: boolean;
  maintenanceMessage: string;
}> {
  const cagri = await oyunEdgeJsonCagir('astral-falls-spin', { configOnly: true });
  if (!('data' in cagri) || !cagri.data) {
    return {
      balance: 0,
      freeSpins: 0,
      freeBet: 0,
      minBet: MIN_BET,
      maxBet: MAX_BET,
      maintenance: false,
      gamePaused: false,
      maintenanceMessage: '',
    };
  }
  const d = cagri.data as Record<string, unknown>;
  return {
    balance: Number(d.balance ?? 0),
    freeSpins: Number(d.freeSpins ?? 0),
    freeBet: Number(d.freeBet ?? 0),
    minBet: Number(d.minBet ?? MIN_BET),
    maxBet: Number(d.maxBet ?? MAX_BET),
    maintenance: d.maintenance === true,
    gamePaused: d.gamePaused === true,
    maintenanceMessage: String(d.maintenanceMessage ?? ''),
  };
}

export async function markAstralFallsRoundPlayed(roundId: string): Promise<void> {
  if (!roundId) return;
  await oyunRpcRetryIle(() =>
    supabase.rpc('astral_falls_mark_played', { p_round_id: roundId }),
  );
}

export async function warmupAstralFalls(): Promise<void> {
  await oyunEdgeJsonCagir('astral-falls-spin', { ping: true }, {
    timeoutMs: 4000,
    deneme: 1,
  }).catch(() => null);
}

export function astralFallsHataMesaji(hata: string, code?: string): string {
  return oyunHataKullaniciMesaji(hata, code);
}
