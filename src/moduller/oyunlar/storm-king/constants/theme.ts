export const STORM_THEME = {
  ink: '#12081C',
  night: '#1A0B2E',
  gold: '#E6C36A',
  goldDeep: '#8A6A2F',
  violet: '#7C3AED',
  mist: 'rgba(18,8,28,0.55)',
  text: '#F7F1E4',
  muted: '#C4B6D4',
  neon: '#C084FC',
} as const;

export const BET_PRESETS = [10, 50, 100, 500, 1000] as const;
export const BIG_WIN_BET_MULT = 20;
export const AUTO_GAP_MS = 800;

export function dropDuration(
  fallenRows: number,
  turbo: boolean,
  reduceMotion: boolean,
): number {
  if (reduceMotion) return 0;
  const rows = Math.max(0, fallenRows);
  return Math.round((260 + 85 * rows) * (turbo ? 0.55 : 1));
}

export function columnDelay(col: number, turbo: boolean, reduceMotion: boolean): number {
  if (reduceMotion) return 0;
  return Math.round(col * 42 * (turbo ? 0.55 : 1));
}
