/**
 * ZEUS API — Edge Function üzerinden server sonucu.
 * Client sonucu üretmez; ister, doğrular, oynatır.
 */

import { supabase } from '../../../../lib/supabase';
import type { ZeusSpinResult } from '../tipler/ZeusTipleri';
import {
  oyunEdgeJsonCagir,
  oyunHataKullaniciMesaji,
  oyunRpcRetryIle,
} from '../../ortak/servisler/OyunAgIstek';

export type SpinApiError = {
  ok: false;
  hata: string;
  code?: string;
  retryable?: boolean;
};

export type SpinApiOk = {
  ok: true;
  data: ZeusSpinResult;
};

export type UnfinishedZeusRound = {
  roundId: string;
  result: ZeusSpinResult;
  status: 'pending_playback' | 'settled';
};

function mapResult(raw: Record<string, unknown>): ZeusSpinResult {
  const r = raw as unknown as ZeusSpinResult;
  return {
    ...r,
    retriggered: r.retriggered === true,
    retriggerSpins: Number(r.retriggerSpins ?? 0),
    persistentMultiplierBefore: Number(r.persistentMultiplierBefore ?? 0),
    persistentMultiplierAfter: Number(r.persistentMultiplierAfter ?? 0),
    scatterCount: Number(r.scatterCount ?? 0),
    remainingFreeSpins: Number(r.remainingFreeSpins ?? 0),
    isFreeSpin: r.isFreeSpin === true,
    bonusTriggered: r.bonusTriggered === true,
  };
}

async function recoverSpinByKey(
  idempotencyKey: string,
): Promise<ZeusSpinResult | null> {
  const { data, error } = await oyunRpcRetryIle(() =>
    supabase.rpc('zeus_round_by_idempotency', { p_key: idempotencyKey }),
  );
  if (error || !data) {
    const unfinished = await restoreUnfinishedZeusRound();
    return unfinished?.result ?? null;
  }
  const row = data as {
    round_id?: string;
    result_snapshot?: Record<string, unknown>;
  };
  if (!row.result_snapshot) return null;
  return mapResult(row.result_snapshot);
}

export async function requestZeusSpin(req: {
  betAmount: number;
  idempotencyKey: string;
  roomId?: string | null;
  adminTest?: boolean;
}): Promise<SpinApiOk | SpinApiError> {
  const cagri = await oyunEdgeJsonCagir('zeus-spin', {
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
      hata: oyunHataKullaniciMesaji(cagri.hata, cagri.code),
      code: cagri.code,
      retryable: cagri.retryable,
    };
  }

  const payload = cagri.data as {
    error?: string;
    code?: string;
    result?: Record<string, unknown>;
  } | null;

  if (payload?.error || !payload?.result) {
    if (payload?.error) {
      const recovered = await recoverSpinByKey(req.idempotencyKey);
      if (recovered) return { ok: true, data: recovered };
    }
    return {
      ok: false,
      hata: oyunHataKullaniciMesaji(
        payload?.error ?? 'Sunucu sonucu boş',
        payload?.code,
      ),
      code: payload?.code,
      retryable: !payload?.code || payload.code === 'internal',
    };
  }

  return { ok: true, data: mapResult(payload.result) };
}

export async function warmupZeusSpin(): Promise<void> {
  try {
    await oyunEdgeJsonCagir(
      'zeus-spin',
      { ping: true },
      { deneme: 1, timeoutMs: 2_500 },
    );
  } catch {
    /* ısındırma oyunu kilitlemesin */
  }
}

export async function restoreUnfinishedZeusRound(): Promise<UnfinishedZeusRound | null> {
  const { data, error } = await oyunRpcRetryIle(() =>
    supabase.rpc('zeus_unfinished_round'),
  );
  if (error || !data) return null;
  const row = data as {
    round_id: string;
    result_snapshot: Record<string, unknown>;
    status: string;
  };
  if (!row.result_snapshot) return null;
  const result = mapResult(row.result_snapshot);
  if (!result.mathVersion?.startsWith('olympus')) return null;
  return {
    roundId: row.round_id,
    result,
    status: row.status === 'settled' ? 'settled' : 'pending_playback',
  };
}

export async function markZeusRoundPlayed(roundId: string): Promise<void> {
  if (!roundId) return;
  await oyunRpcRetryIle(() =>
    supabase.rpc('zeus_mark_played', { p_round_id: roundId }),
  );
}

export function newZeusIdempotencyKey(): string {
  const rastgele =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `zeus_${rastgele}`;
}
