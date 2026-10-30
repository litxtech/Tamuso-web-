import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../../lib/supabase';
import {
  oyunEdgeJsonCagir,
  oyunHataKullaniciMesaji,
  oyunRpcRetryIle,
} from '../../ortak/servisler/OyunAgIstek';
import type { Cell, GemId, SpinResult, SymbolData, TumbleStep } from '../types';

const PENDING_KEY = 'storm_king_pending_v1';

export type PendingSpin = {
  requestId: string;
  bet: number;
  roomId: string | null;
};

export type SpinCall =
  | { ok: true; cancelled: true; balance: number }
  | {
      ok: true;
      cancelled: false;
      balance: number;
      gameBalance: number | null;
      win: number;
      duplicate: boolean;
      result: SpinResult;
    }
  | { ok: false; message: string; code: string; retryable: boolean };

export type AbortCall = {
  balance: number;
  refunded: number;
};

const GEMS: readonly GemId[] = ['ruby', 'sapphire', 'emerald', 'amethyst', 'topaz', 'aqua'];

function isGem(value: string): value is GemId {
  return (GEMS as readonly string[]).includes(value);
}

function readCell(raw: unknown): Cell | null {
  if (!raw || typeof raw !== 'object') return null;
  const cell = raw as { type?: unknown; id?: unknown; value?: unknown };
  if (cell.type === 'gem' && typeof cell.id === 'string' && isGem(cell.id)) {
    return { type: 'gem', id: cell.id };
  }
  if (cell.type === 'multiplier' && typeof cell.value === 'number' && Number.isFinite(cell.value)) {
    return { type: 'multiplier', value: Math.floor(cell.value) };
  }
  return null;
}

function readSymbol(raw: unknown): SymbolData | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as { uid?: unknown; col?: unknown; row?: unknown; cell?: unknown };
  const cell = readCell(row.cell);
  if (
    !cell ||
    typeof row.uid !== 'number' ||
    typeof row.col !== 'number' ||
    typeof row.row !== 'number'
  ) {
    return null;
  }
  return { uid: row.uid, col: row.col, row: row.row, cell };
}

function readSymbols(raw: unknown): SymbolData[] | null {
  if (!Array.isArray(raw)) return null;
  const symbols: SymbolData[] = [];
  for (const item of raw) {
    const symbol = readSymbol(item);
    if (!symbol) return null;
    symbols.push(symbol);
  }
  return symbols;
}

function readResult(raw: unknown): SpinResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const initial = readSymbols(row.initial);
  const finalBoard = readSymbols(row.finalBoard);
  if (!initial || !finalBoard || !Array.isArray(row.steps)) return null;
  const steps: TumbleStep[] = [];
  for (const stepRaw of row.steps) {
    if (!stepRaw || typeof stepRaw !== 'object') return null;
    const step = stepRaw as Record<string, unknown>;
    const spawned = readSymbols(step.spawned);
    if (!spawned || !Array.isArray(step.wins) || !Array.isArray(step.removed)) return null;
    const wins = step.wins.flatMap((win) => {
      if (!win || typeof win !== 'object') return [];
      const group = win as { id?: unknown; count?: unknown; amount?: unknown; uids?: unknown };
      if (typeof group.id !== 'string' || !isGem(group.id)) return [];
      if (typeof group.count !== 'number' || typeof group.amount !== 'number') return [];
      if (!Array.isArray(group.uids)) return [];
      const uids = group.uids.filter((uid): uid is number => typeof uid === 'number');
      return [{ id: group.id, count: group.count, amount: group.amount, uids }];
    });
    const removed = step.removed.filter((uid): uid is number => typeof uid === 'number');
    const moved = Array.isArray(step.moved)
      ? step.moved.flatMap((move) => {
          if (!move || typeof move !== 'object') return [];
          const row = move as { uid?: unknown; row?: unknown };
          if (typeof row.uid !== 'number' || typeof row.row !== 'number') return [];
          return [{ uid: row.uid, row: row.row }];
        })
      : [];
    steps.push({
      wins,
      removed,
      moved,
      spawned,
      stepWin: typeof step.stepWin === 'number' ? step.stepWin : 0,
    });
  }
  const multipliers = Array.isArray(row.multipliers)
    ? row.multipliers.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const orb = item as { uid?: unknown; value?: unknown };
        if (typeof orb.uid !== 'number' || typeof orb.value !== 'number') return [];
        return [{ uid: orb.uid, value: orb.value }];
      })
    : [];
  return {
    initial,
    steps,
    baseWin: typeof row.baseWin === 'number' ? row.baseWin : 0,
    multipliers,
    multiplierSum: typeof row.multiplierSum === 'number' ? row.multiplierSum : 1,
    finalWin: typeof row.finalWin === 'number' ? row.finalWin : 0,
    capped: row.capped === true,
    finalBoard,
  };
}

export function newStormKingRequestId(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') return cryptoObj.randomUUID();
  const bytes = new Uint8Array(16);
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') cryptoObj.getRandomValues(bytes);
  else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function savePendingSpin(pending: PendingSpin | null): Promise<void> {
  if (!pending) {
    await AsyncStorage.removeItem(PENDING_KEY);
    return;
  }
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}

export async function loadPendingSpin(): Promise<PendingSpin | null> {
  const raw = await AsyncStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingSpin>;
    if (typeof parsed.requestId !== 'string' || typeof parsed.bet !== 'number') return null;
    return {
      requestId: parsed.requestId,
      bet: parsed.bet,
      roomId: typeof parsed.roomId === 'string' ? parsed.roomId : null,
    };
  } catch {
    return null;
  }
}

async function recover(requestId: string): Promise<SpinCall | null> {
  const { data, error } = await oyunRpcRetryIle(() =>
    supabase.rpc('storm_king_round_by_request', { p_request_id: requestId }),
  );
  if (error || !data || typeof data !== 'object') return null;
  const row = data as {
    balance?: unknown;
    win?: unknown;
    result?: unknown;
    duplicate?: unknown;
    cancelled?: unknown;
  };
  if (row.cancelled === true) {
    return {
      ok: true,
      cancelled: true,
      balance: typeof row.balance === 'number' ? row.balance : 0,
    };
  }
  const result = readResult(row.result);
  if (!result) return null;
  return {
    ok: true,
    cancelled: false,
    balance: typeof row.balance === 'number' ? row.balance : 0,
    gameBalance: null,
    win: typeof row.win === 'number' ? row.win : result.finalWin,
    duplicate: true,
    result,
  };
}

export async function spinStormKing(input: PendingSpin): Promise<SpinCall> {
  const call = await oyunEdgeJsonCagir('storm-king-spin', {
    bet: input.bet,
    requestId: input.requestId,
    roomId: input.roomId,
  });

  if (!('data' in call)) {
    if (call.retryable || call.code === 'network' || call.code === 'internal') {
      const recovered = await recover(input.requestId);
      if (recovered) return recovered;
    }
    return {
      ok: false,
      message: oyunHataKullaniciMesaji(call.hata, call.code),
      code: call.code,
      retryable: call.retryable,
    };
  }

  const payload = call.data;
  if (!payload) {
    const recovered = await recover(input.requestId);
    if (recovered) return recovered;
    return { ok: false, message: 'Bağlantı yenileniyor', code: 'network', retryable: true };
  }

  if (typeof payload.error === 'string') {
    const code = typeof payload.code === 'string' ? payload.code : 'error';
    if (code === 'internal' || code === 'settle' || code === 'network') {
      const recovered = await recover(input.requestId);
      if (recovered) return recovered;
    }
    return {
      ok: false,
      message: oyunHataKullaniciMesaji(payload.error, code),
      code,
      retryable: code === 'internal' || code === 'network',
    };
  }

  if (payload.cancelled === true) {
    return {
      ok: true,
      cancelled: true,
      balance: typeof payload.balance === 'number' ? payload.balance : 0,
    };
  }

  const result = readResult(payload.result);
  if (!result) {
    const recovered = await recover(input.requestId);
    if (recovered) return recovered;
    return { ok: false, message: 'Sonuç okunamadı', code: 'result', retryable: true };
  }

  return {
    ok: true,
    cancelled: false,
    balance: typeof payload.balance === 'number' ? payload.balance : 0,
    gameBalance: typeof payload.game_balance === 'number' ? payload.game_balance : null,
    win: typeof payload.win === 'number' ? payload.win : result.finalWin,
    duplicate: payload.duplicate === true,
    result,
  };
}

export async function abortStormKing(requestId: string): Promise<AbortCall | null> {
  const { data, error } = await oyunRpcRetryIle(() =>
    supabase.rpc('storm_king_abort', { p_request_id: requestId }),
  );
  if (error || !data || typeof data !== 'object') return null;
  const row = data as { balance?: unknown; refunded?: unknown };
  if (typeof row.balance !== 'number') return null;
  return {
    balance: row.balance,
    refunded: typeof row.refunded === 'number' ? row.refunded : 0,
  };
}

export async function fetchStormKingGameBalance(): Promise<number | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return null;
  const { data, error } = await supabase
    .from('wallets')
    .select('game_coins')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  const v = (data as { game_coins?: unknown }).game_coins;
  return typeof v === 'number' ? v : null;
}

export async function fetchStormKingBalance(): Promise<number | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return null;
  const { data, error } = await supabase
    .from('wallets')
    .select('coins')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  const coins = (data as { coins?: unknown }).coins;
  return typeof coins === 'number' ? coins : null;
}
