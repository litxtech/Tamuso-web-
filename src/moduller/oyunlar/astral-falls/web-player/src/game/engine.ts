/**
 * Browser-only demo rules. Neither the random draw nor the balance in this
 * module may be used as the source of truth for a real-money game.
 */
export const ROWS = 5;
export const COLS = 6;
export const BET_OPTIONS = [10, 20, 50, 100, 250, 500] as const;

export type SymbolId =
  | 'sun'
  | 'moon'
  | 'star'
  | 'comet'
  | 'prism'
  | 'crown'
  | 'scatter'
  | 'multiplier';

export interface Cell {
  id: number;
  symbol: SymbolId;
  row: number;
  col: number;
  value?: number;
}

export type Grid = Cell[][];

export interface CascadeStep {
  removedIds: number[];
  nextGrid: Grid;
  baseWin: number;
  multiplier: number;
  win: number;
}

export interface SpinPlan {
  initialGrid: Grid;
  cascades: CascadeStep[];
  payout: number;
  scatterCount: number;
  freeSpinsAwarded: number;
  multiplierTotal: number;
}

let nextCellId = 0;

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
const TOTAL_WEIGHT = WEIGHTS.reduce((total, entry) => total + entry.weight, 0);
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
const MULTIPLIER_WEIGHT = MULTIPLIERS.reduce((total, entry) => total + entry.weight, 0);
const SYMBOL_VALUE: Record<Exclude<SymbolId, 'scatter' | 'multiplier'>, number> = {
  sun: 2.8,
  moon: 2.2,
  star: 1.8,
  comet: 1.5,
  prism: 1.3,
  crown: 1,
};

function weightedPick<T extends { weight: number }>(items: T[], total: number, random: () => number): T {
  let roll = random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}

function newCell(row: number, col: number, random: () => number): Cell {
  const symbol = weightedPick(WEIGHTS, TOTAL_WEIGHT, random).symbol;
  const value =
    symbol === 'multiplier'
      ? weightedPick(MULTIPLIERS, MULTIPLIER_WEIGHT, random).value
      : undefined;
  return { id: ++nextCellId, symbol, row, col, value };
}

export function createGrid(random: () => number = Math.random): Grid {
  return Array.from({ length: ROWS }, (_, row) =>
    Array.from({ length: COLS }, (_, col) => newCell(row, col, random)),
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
    removedIds.push(...cells.map((cell) => cell.id));
    const amount = cells.length >= 20 ? 7 : cells.length >= 15 ? 3 : cells.length >= 12 ? 1.5 : cells.length >= 10 ? 0.8 : 0.5;
    factor += amount * SYMBOL_VALUE[symbol as keyof typeof SYMBOL_VALUE];
  }
  return { removedIds, factor };
}

function collapse(grid: Grid, removedIds: number[], random: () => number): Grid {
  const removed = new Set(removedIds);
  const result: Grid = Array.from({ length: ROWS }, () => []);
  for (let col = 0; col < COLS; col++) {
    const survivors = grid.map((row) => row[col]).filter((cell) => !removed.has(cell.id));
    const missing = ROWS - survivors.length;
    const column = [
      ...Array.from({ length: missing }, (_, row) => newCell(row, col, random)),
      ...survivors,
    ];
    for (let row = 0; row < ROWS; row++) result[row][col] = { ...column[row], row, col };
  }
  return result;
}

export function createSpinPlan(
  bet: number,
  freeMode = false,
  random: () => number = Math.random,
): SpinPlan {
  if (!Number.isFinite(bet) || bet <= 0) throw new Error('Geçersiz demo bahis.');
  const initialGrid = createGrid(random);
  let grid = initialGrid;
  const cascades: CascadeStep[] = [];
  let payout = 0;
  let scatterCount = 0;
  let multiplierTotal = 0;
  let runningBonusMultiplier = 0;

  // Each generated frame is an explicit animation target. The cap prevents an
  // unusually lucky demo draw from locking the browser in an endless chain.
  for (let index = 0; index < 20; index++) {
    scatterCount = Math.max(
      scatterCount,
      grid.flat().filter((cell) => cell.symbol === 'scatter').length,
    );
    const { removedIds, factor } = matchGroups(grid);
    if (removedIds.length === 0) break;

    const drawnMultiplier = grid.flat().reduce(
      (sum, cell) => sum + (cell.symbol === 'multiplier' ? cell.value ?? 0 : 0),
      0,
    );
    if (freeMode) runningBonusMultiplier += drawnMultiplier;
    const multiplier = freeMode
      ? Math.max(1, runningBonusMultiplier)
      : Math.max(1, drawnMultiplier);
    const baseWin = Math.round(bet * factor * 100) / 100;
    const win = Math.round(baseWin * multiplier * 100) / 100;
    payout = Math.round((payout + win) * 100) / 100;
    multiplierTotal = Math.max(multiplierTotal, multiplier);
    const nextGrid = collapse(grid, removedIds, random);
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
  };
}