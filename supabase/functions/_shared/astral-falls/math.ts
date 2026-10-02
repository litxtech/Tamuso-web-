/**
 * Astral Falls — sunucu matematik (referans engine.ts ile aynı kurallar).
 * Client sonucu üretmez; yalnızca sunucu bu planı döner.
 */

export const ROWS = 5;
export const COLS = 6;

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

const WEIGHTS: { symbol: SymbolId; weight: number }[] = [
  { symbol: 'sun', weight: 18 },
  { symbol: 'moon', weight: 18 },
  { symbol: 'star', weight: 18 },
  { symbol: 'comet', weight: 18 },
  { symbol: 'prism', weight: 16 },
  { symbol: 'crown', weight: 15 },
  { symbol: 'scatter', weight: 4 },
  { symbol: 'multiplier', weight: 5 },
];
const TOTAL_WEIGHT = WEIGHTS.reduce((t, e) => t + e.weight, 0);
const MULTIPLIERS = [
  { value: 2, weight: 30 },
  { value: 3, weight: 24 },
  { value: 5, weight: 18 },
  { value: 10, weight: 12 },
  { value: 15, weight: 6 },
  { value: 25, weight: 4 },
  { value: 50, weight: 3 },
  { value: 100, weight: 1.5 },
  { value: 250, weight: 1 },
  { value: 500, weight: 0.5 },
];
const MULTIPLIER_WEIGHT = MULTIPLIERS.reduce((t, e) => t + e.weight, 0);
const SYMBOL_VALUE: Record<Exclude<SymbolId, 'scatter' | 'multiplier'>, number> = {
  sun: 2.8,
  moon: 2.2,
  star: 1.8,
  comet: 1.5,
  prism: 1.3,
  crown: 1,
};

export const MATH_VERSION = 'astral-falls-demo-port-v1';
export const CONFIG_VERSION = 'astral-falls-cfg-v1';
export const PAYTABLE_VERSION = 'astral-falls-pay-v1';
export const MIN_BET = 1;
export const MAX_BET = 500;

function createSeededRng(seed: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedPick<T extends { weight: number }>(
  items: T[],
  total: number,
  random: () => number,
): T {
  let roll = random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll < 0) return item;
  }
  return items[items.length - 1]!;
}

function newCell(
  row: number,
  col: number,
  random: () => number,
  nextId: { n: number },
): Cell {
  const symbol = weightedPick(WEIGHTS, TOTAL_WEIGHT, random).symbol;
  const value =
    symbol === 'multiplier'
      ? weightedPick(MULTIPLIERS, MULTIPLIER_WEIGHT, random).value
      : undefined;
  nextId.n += 1;
  return { id: nextId.n, symbol, row, col, value };
}

function createGrid(random: () => number, nextId: { n: number }): Grid {
  return Array.from({ length: ROWS }, (_, row) =>
    Array.from({ length: COLS }, (_, col) => newCell(row, col, random, nextId)),
  );
}

function matchGroups(grid: Grid): { removedIds: number[]; factor: number } {
  const counts = new Map<SymbolId, Cell[]>();
  for (const row of grid) {
    for (const cell of row) {
      if (cell.symbol === 'scatter' || cell.symbol === 'multiplier') continue;
      counts.set(cell.symbol, [...(counts.get(cell.symbol) ?? []), cell]);
    }
  }
  const removedIds: number[] = [];
  let factor = 0;
  for (const [symbol, cells] of counts) {
    if (cells.length < 8) continue;
    removedIds.push(...cells.map((c) => c.id));
    const amount =
      cells.length >= 20
        ? 7
        : cells.length >= 15
          ? 3
          : cells.length >= 12
            ? 1.5
            : cells.length >= 10
              ? 0.8
              : 0.5;
    factor += amount * SYMBOL_VALUE[symbol as keyof typeof SYMBOL_VALUE];
  }
  return { removedIds, factor };
}

function collapse(
  grid: Grid,
  removedIds: number[],
  random: () => number,
  nextId: { n: number },
): Grid {
  const removed = new Set(removedIds);
  const result: Grid = Array.from({ length: ROWS }, () => []);
  for (let col = 0; col < COLS; col++) {
    const survivors = grid
      .map((row) => row[col]!)
      .filter((cell) => !removed.has(cell.id));
    const missing = ROWS - survivors.length;
    const column = [
      ...Array.from({ length: missing }, (_, row) =>
        newCell(row, col, random, nextId),
      ),
      ...survivors,
    ];
    for (let row = 0; row < ROWS; row++) {
      result[row]![col] = { ...column[row]!, row, col };
    }
  }
  return result;
}

export function simulateAstralFallsSpin(input: {
  seed: string;
  betAmount: number;
  freeMode: boolean;
}): SpinPlan & {
  rngSeed: string;
  mathVersion: string;
  configVersion: string;
  paytableVersion: string;
  betAmount: number;
} {
  const bet = Number(input.betAmount);
  if (!Number.isFinite(bet) || bet <= 0) throw new Error('Invalid bet');
  const random = createSeededRng(input.seed);
  const nextId = { n: 0 };
  const initialGrid = createGrid(random, nextId);
  let grid = initialGrid;
  const cascades: CascadeStep[] = [];
  let payout = 0;
  let scatterCount = 0;
  let multiplierTotal = 0;
  let runningBonusMultiplier = 0;

  for (let index = 0; index < 20; index++) {
    scatterCount = Math.max(
      scatterCount,
      grid.flat().filter((c) => c.symbol === 'scatter').length,
    );
    const { removedIds, factor } = matchGroups(grid);
    if (removedIds.length === 0) break;

    const drawnMultiplier = grid
      .flat()
      .reduce(
        (sum, cell) =>
          sum + (cell.symbol === 'multiplier' ? (cell.value ?? 0) : 0),
        0,
      );
    if (input.freeMode) runningBonusMultiplier += drawnMultiplier;
    const multiplier = input.freeMode
      ? Math.max(1, runningBonusMultiplier)
      : Math.max(1, drawnMultiplier);
    const baseWin = Math.round(bet * factor * 100) / 100;
    const win = Math.round(baseWin * multiplier * 100) / 100;
    payout = Math.round((payout + win) * 100) / 100;
    multiplierTotal = Math.max(multiplierTotal, multiplier);
    const nextGrid = collapse(grid, removedIds, random, nextId);
    cascades.push({ removedIds, nextGrid, baseWin, multiplier, win });
    grid = nextGrid;
  }

  return {
    initialGrid,
    cascades,
    payout,
    scatterCount,
    freeSpinsAwarded: scatterCount >= 4 ? 15 : 0,
    multiplierTotal,
    rngSeed: input.seed,
    mathVersion: MATH_VERSION,
    configVersion: CONFIG_VERSION,
    paytableVersion: PAYTABLE_VERSION,
    betAmount: bet,
  };
}
