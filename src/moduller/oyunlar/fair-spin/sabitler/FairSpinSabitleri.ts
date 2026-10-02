/**
 * Fair Spin — sabitler ve varsayılan matematik (sunucu otoritesi).
 */

export const GAME_CODE = 'fair_spin' as const;
export const GAME_DISPLAY_NAME = 'Fair Spin';
export const GAME_VERSION = '1.0.0';

export const SPIN_DURATION_MS = 3800;
/** Tek tur geri sayım adımı (3-2-1) — kısa tut */
export const COUNTDOWN_STEP_MS = 350;
/** Oto turlar arası kısa nefes */
export const AUTOPLAY_GAP_MS = 520;
export const AUTOPLAY_OPTIONS = [5, 15, 35, 50] as const;
export const HIGH_WIN_MULT = 15;
export const HIGH_WIN_PAYOUT_MULT = 5;

/** Demo değil — sunucu config ile override edilir */
export const DEFAULT_BET_PRESETS = [10, 50, 100, 500, 1000] as const;
export const DEFAULT_MIN_BET = 10;
export const DEFAULT_MAX_BET = 10_000;

export type FairSpinSegmentDef = {
  id: string;
  multiplier: number;
  weight: number;
  color: string;
  label: string;
};

/**
 * 8 dilim — tahmini RTP ~96.5% (ağırlıklı EV).
 * Ağırlıklar yalnızca sunucu math'te kullanılır; client sonucu üretmez.
 */
export const DEFAULT_SEGMENTS: readonly FairSpinSegmentDef[] = [
  { id: 'fs-0', multiplier: 0, weight: 480, color: '#3a3a4a', label: '0x' },
  { id: 'fs-05', multiplier: 0.5, weight: 220, color: '#1e3a5f', label: '0.5x' },
  { id: 'fs-1', multiplier: 1, weight: 120, color: '#0e4d5c', label: '1x' },
  { id: 'fs-2', multiplier: 2, weight: 80, color: '#2d4a3e', label: '2x' },
  { id: 'fs-3', multiplier: 3, weight: 50, color: '#3d2d5c', label: '3x' },
  { id: 'fs-5', multiplier: 5, weight: 30, color: '#5c4a1e', label: '5x' },
  { id: 'fs-10', multiplier: 10, weight: 15, color: '#5c2d1e', label: '10x' },
  { id: 'fs-25', multiplier: 25, weight: 5, color: '#5c1e3a', label: '25x' },
] as const;

export const DEFAULT_MATH_CONFIG = {
  mathVersion: 'fair-spin-balanced-v1',
  configVersion: 'fair-spin-cfg-v1',
  paytableVersion: 'fair-spin-pay-v1',
  segments: DEFAULT_SEGMENTS.map((s) => ({
    id: s.id,
    multiplier: s.multiplier,
    weight: s.weight,
    color: s.color,
    label: s.label,
  })),
  betPresets: [...DEFAULT_BET_PRESETS],
  minBet: DEFAULT_MIN_BET,
  maxBet: DEFAULT_MAX_BET,
  highWinMult: HIGH_WIN_MULT,
  highWinPayoutMult: HIGH_WIN_PAYOUT_MULT,
} as const;
