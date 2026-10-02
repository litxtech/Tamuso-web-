/**
 * Fair Spin — Deno matematik otoritesi.
 */

export type FairSpinSegment = {
  id: string;
  multiplier: number;
  weight: number;
  color: string;
  label: string;
};

export type FairSpinMathConfig = {
  mathVersion: string;
  configVersion: string;
  paytableVersion: string;
  segments: FairSpinSegment[];
  betPresets: number[];
  minBet: number;
  maxBet: number;
  highWinMult: number;
  highWinPayoutMult: number;
};

export const DEFAULT_SEGMENTS: FairSpinSegment[] = [
  { id: 'fs-0', multiplier: 0, weight: 480, color: '#3a3a4a', label: '0x' },
  { id: 'fs-05', multiplier: 0.5, weight: 220, color: '#1e3a5f', label: '0.5x' },
  { id: 'fs-1', multiplier: 1, weight: 120, color: '#0e4d5c', label: '1x' },
  { id: 'fs-2', multiplier: 2, weight: 80, color: '#2d4a3e', label: '2x' },
  { id: 'fs-3', multiplier: 3, weight: 50, color: '#3d2d5c', label: '3x' },
  { id: 'fs-5', multiplier: 5, weight: 30, color: '#5c4a1e', label: '5x' },
  { id: 'fs-10', multiplier: 10, weight: 15, color: '#5c2d1e', label: '10x' },
  { id: 'fs-25', multiplier: 25, weight: 5, color: '#5c1e3a', label: '25x' },
];

export const DEFAULT_CONFIG: FairSpinMathConfig = {
  mathVersion: 'fair-spin-balanced-v1',
  configVersion: 'fair-spin-cfg-v1',
  paytableVersion: 'fair-spin-pay-v1',
  segments: DEFAULT_SEGMENTS.map((s) => ({ ...s })),
  betPresets: [10, 50, 100, 500, 1000],
  minBet: 10,
  maxBet: 10_000,
  highWinMult: 15,
  highWinPayoutMult: 5,
};

export function mergeFairSpinMathConfig(
  raw: Record<string, unknown> | null | undefined,
): FairSpinMathConfig {
  const base: FairSpinMathConfig = {
    ...DEFAULT_CONFIG,
    segments: DEFAULT_SEGMENTS.map((s) => ({ ...s })),
    betPresets: [...DEFAULT_CONFIG.betPresets],
  };
  if (!raw || typeof raw !== 'object') return base;

  const cfg =
    (raw.config as Record<string, unknown> | undefined) ??
    (raw as Record<string, unknown>);

  if (typeof cfg.mathVersion === 'string') base.mathVersion = cfg.mathVersion;
  if (typeof raw.mathVersion === 'string' && !cfg.mathVersion) {
    base.mathVersion = String(raw.mathVersion);
  }
  if (typeof cfg.configVersion === 'string') base.configVersion = cfg.configVersion;
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

  const durum = (raw.durum ?? {}) as Record<string, unknown>;
  void durum;
  const runtime = (raw.runtime ?? {}) as Record<string, unknown>;
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
    const segs: FairSpinSegment[] = [];
    for (const s of cfg.segments) {
      if (!s || typeof s !== 'object') continue;
      const o = s as Record<string, unknown>;
      const id = String(o.id ?? '').trim();
      const multiplier = Number(o.multiplier ?? 0);
      const weight = Number(o.weight ?? 0);
      if (!id || !(weight > 0) || !Number.isFinite(multiplier) || multiplier < 0) {
        continue;
      }
      segs.push({
        id,
        multiplier,
        weight,
        color: String(o.color ?? '#3a3a4a'),
        label: String(o.label ?? `${multiplier}x`),
      });
    }
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
}): Record<string, unknown> {
  const picked = pickSegmentBySeed(input.config, input.seed);
  const payout = Math.floor(input.betAmount * picked.multiplier);
  return {
    betAmount: input.betAmount,
    segmentId: picked.id,
    multiplier: picked.multiplier,
    payout,
    balanceBefore: input.balanceBefore,
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
