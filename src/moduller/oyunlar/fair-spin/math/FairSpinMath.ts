/**
 * Fair Spin matematik — sunucu otoritesi (Edge Function).
 * Client bu dosyayı yalnızca tip/merge için kullanır; sonucu üretmez.
 */

import {
  DEFAULT_MATH_CONFIG,
  DEFAULT_SEGMENTS,
} from '../sabitler/FairSpinSabitleri';
import type { FairSpinMathConfig, FairSpinResult } from '../tipler/FairSpinTipleri';

export function mergeFairSpinMathConfig(
  raw: Record<string, unknown> | null | undefined,
): FairSpinMathConfig {
  const base: FairSpinMathConfig = {
    mathVersion: DEFAULT_MATH_CONFIG.mathVersion,
    configVersion: DEFAULT_MATH_CONFIG.configVersion,
    paytableVersion: DEFAULT_MATH_CONFIG.paytableVersion,
    segments: DEFAULT_SEGMENTS.map((s) => ({ ...s })),
    betPresets: [...DEFAULT_MATH_CONFIG.betPresets],
    minBet: DEFAULT_MATH_CONFIG.minBet,
    maxBet: DEFAULT_MATH_CONFIG.maxBet,
    highWinMult: DEFAULT_MATH_CONFIG.highWinMult,
    highWinPayoutMult: DEFAULT_MATH_CONFIG.highWinPayoutMult,
  };
  if (!raw || typeof raw !== 'object') return base;

  const cfg =
    (raw.config as Record<string, unknown> | undefined) ??
    (raw as Record<string, unknown>);

  if (typeof cfg.mathVersion === 'string') base.mathVersion = cfg.mathVersion;
  if (typeof raw.mathVersion === 'string' && !cfg.mathVersion) {
    base.mathVersion = String(raw.mathVersion);
  }
  if (typeof cfg.configVersion === 'string') {
    base.configVersion = cfg.configVersion;
  }
  if (typeof cfg.paytableVersion === 'string') {
    base.paytableVersion = cfg.paytableVersion;
  }
  if (typeof cfg.minBet === 'number' && cfg.minBet > 0) base.minBet = cfg.minBet;
  if (typeof cfg.maxBet === 'number' && cfg.maxBet > 0) base.maxBet = cfg.maxBet;
  if (Array.isArray(cfg.betPresets) && cfg.betPresets.length > 0) {
    base.betPresets = cfg.betPresets
      .map((n) => Math.floor(Number(n)))
      .filter((n) => n > 0);
  }
  if (typeof cfg.highWinMult === 'number') base.highWinMult = cfg.highWinMult;
  if (typeof cfg.highWinPayoutMult === 'number') {
    base.highWinPayoutMult = cfg.highWinPayoutMult;
  }

  const runtime = (raw.runtime ?? raw.overrides ?? {}) as Record<string, unknown>;
  if (typeof runtime.minBet === 'number' && runtime.minBet > 0) {
    base.minBet = Math.floor(runtime.minBet);
  }
  if (typeof runtime.maxBet === 'number' && runtime.maxBet > 0) {
    base.maxBet = Math.floor(runtime.maxBet);
  }
  if (Array.isArray(runtime.betPresets) && runtime.betPresets.length > 0) {
    base.betPresets = runtime.betPresets
      .map((n) => Math.floor(Number(n)))
      .filter((n) => n > 0);
  }

  if (Array.isArray(cfg.segments) && cfg.segments.length >= 2) {
    const segs = cfg.segments
      .map((s) => {
        if (!s || typeof s !== 'object') return null;
        const o = s as Record<string, unknown>;
        const id = String(o.id ?? '').trim();
        const multiplier = Number(o.multiplier ?? 0);
        const weight = Number(o.weight ?? 0);
        if (!id || !(weight > 0) || !Number.isFinite(multiplier) || multiplier < 0) {
          return null;
        }
        return {
          id,
          multiplier,
          weight,
          color: String(o.color ?? '#3a3a4a'),
          label: String(o.label ?? `${multiplier}x`),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
    if (segs.length >= 2) base.segments = segs;
  }

  return base;
}

function seedToUint32(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mulberry32 — deterministik [0,1) */
function seededUnit(seed: string): number {
  let t = (seedToUint32(seed) + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function pickSegmentBySeed(
  config: FairSpinMathConfig,
  seed: string,
): { id: string; multiplier: number } {
  const total = config.segments.reduce((a, s) => a + s.weight, 0);
  if (total <= 0) {
    const first = config.segments[0];
    return { id: first.id, multiplier: first.multiplier };
  }
  let r = seededUnit(seed) * total;
  for (const s of config.segments) {
    r -= s.weight;
    if (r < 0) return { id: s.id, multiplier: s.multiplier };
  }
  const last = config.segments[config.segments.length - 1];
  return { id: last.id, multiplier: last.multiplier };
}

export function simulateFairSpin(input: {
  config: FairSpinMathConfig;
  seed: string;
  betAmount: number;
  balanceBefore: number;
  roundId?: string;
  sessionId?: string;
}): Omit<FairSpinResult, 'roundId' | 'sessionId'> & {
  roundId: string;
  sessionId: string;
} {
  const picked = pickSegmentBySeed(input.config, input.seed);
  const payout = Math.floor(input.betAmount * picked.multiplier);
  return {
    roundId: input.roundId ?? 'pending',
    sessionId: input.sessionId ?? 'pending',
    betAmount: input.betAmount,
    segmentId: picked.id,
    multiplier: picked.multiplier,
    payout,
    balanceBefore: input.balanceBefore,
    balanceAfter: input.balanceBefore, // settle günceller
    rngSeed: input.seed,
    mathVersion: input.config.mathVersion,
    configVersion: input.config.configVersion,
    paytableVersion: input.config.paytableVersion,
  };
}

export function publicSegments(config: FairSpinMathConfig) {
  return config.segments.map(({ id, multiplier, color, label }) => ({
    id,
    multiplier,
    color,
    label,
  }));
}
