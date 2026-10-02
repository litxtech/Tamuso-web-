/** Astral Falls — istemci tipleri (sonuç sunucudan gelir). */

export type SymbolId =
  | 'sun'
  | 'moon'
  | 'star'
  | 'comet'
  | 'prism'
  | 'crown'
  | 'scatter'
  | 'multiplier';

export type Cell = {
  id: number;
  symbol: SymbolId;
  row: number;
  col: number;
  value?: number;
};

export type Grid = Cell[][];

export type CascadeStep = {
  removedIds: number[];
  nextGrid: Grid;
  baseWin: number;
  multiplier: number;
  win: number;
};

export type SpinPlan = {
  initialGrid: Grid;
  cascades: CascadeStep[];
  payout: number;
  scatterCount: number;
  freeSpinsAwarded: number;
  multiplierTotal: number;
};

export type AstralFallsSpinResult = SpinPlan & {
  roundId: string;
  sessionId: string;
  betAmount: number;
  balanceBefore: number;
  balanceAfter: number;
  remainingFreeSpins: number;
  freeBet: number;
  rngSeed: string;
  mathVersion: string;
  configVersion: string;
  paytableVersion: string;
  adminTest?: boolean;
};
