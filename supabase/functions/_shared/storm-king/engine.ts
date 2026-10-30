/**
 * Fırtına Kralı — sunucu oyun motoru.
 * İstemci bu dosyayı çalıştırmaz. Kazançlar tam sayı coin;
 * yarım ve üzeri yukarı yuvarlanır:
 *   floor((bahis * payNumer * katman + payDenom / 2) / payDenom)
 */

export const STORM_KING_COLS = 6;
export const STORM_KING_ROWS = 5;
export const STORM_KING_CELLS = STORM_KING_COLS * STORM_KING_ROWS;
export const STORM_KING_MIN_CLUSTER = 8;
export const STORM_KING_MAX_STEPS = 40;
export const STORM_KING_MAX_WIN_MULT = 5000;
export const STORM_KING_ORB_CHANCE_BPS = 350;
export const STORM_KING_BET_PRESETS = [10, 50, 100, 500, 1000] as const;

export const GEM_IDS = [
  'ruby',
  'sapphire',
  'emerald',
  'amethyst',
  'topaz',
  'aqua',
] as const;

export type GemId = (typeof GEM_IDS)[number];

export type Cell =
  | { type: 'gem'; id: GemId }
  | { type: 'multiplier'; value: number };

export interface SymbolData {
  uid: number;
  col: number;
  row: number;
  cell: Cell;
}

export interface WinGroup {
  id: GemId;
  count: number;
  amount: number;
  uids: number[];
}

export interface TumbleStep {
  wins: WinGroup[];
  removed: number[];
  moved: Array<{
    uid: number;
    row: number;
  }>;
  spawned: SymbolData[];
  stepWin: number;
}

export interface SpinResult {
  initial: SymbolData[];
  steps: TumbleStep[];
  baseWin: number;
  multipliers: Array<{
    uid: number;
    value: number;
  }>;
  multiplierSum: number;
  finalWin: number;
  capped: boolean;
  finalBoard: SymbolData[];
}

export const GEM_PAY: Record<GemId, { numer: number; denom: number }> = {
  ruby: { numer: 5, denom: 1 },
  sapphire: { numer: 4, denom: 1 },
  emerald: { numer: 5, denom: 2 },
  amethyst: { numer: 2, denom: 1 },
  topaz: { numer: 6, denom: 5 },
  aqua: { numer: 1, denom: 1 },
};

export const MULTIPLIER_WEIGHTS: ReadonlyArray<{ value: number; weight: number }> = [
  { value: 2, weight: 300 },
  { value: 3, weight: 220 },
  { value: 4, weight: 160 },
  { value: 5, weight: 120 },
  { value: 6, weight: 80 },
  { value: 8, weight: 50 },
  { value: 10, weight: 30 },
  { value: 15, weight: 20 },
  { value: 20, weight: 10 },
  { value: 25, weight: 7 },
  { value: 50, weight: 3 },
];

const MULTIPLIER_WEIGHT_SUM = MULTIPLIER_WEIGHTS.reduce((sum, row) => sum + row.weight, 0);

export interface StormRng {
  nextUint32(): number;
}

export function createCryptoRng(): StormRng {
  return {
    nextUint32(): number {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return buf[0] >>> 0;
    },
  };
}

export function createSeededRng(seed: number): StormRng {
  let state = seed >>> 0;
  return {
    nextUint32(): number {
      state = (state + 0x9e3779b9) >>> 0;
      let z = state;
      z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
      z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
      return (z ^ (z >>> 16)) >>> 0;
    },
  };
}

/** [0, max) — 2^32 modulo yanlılığı reddedilerek elenir. */
export function nextInt(rng: StormRng, max: number): number {
  if (!Number.isInteger(max) || max <= 0) {
    throw new Error('nextInt max');
  }
  if (max === 1) return 0;
  const range = 0x100000000;
  const limit = range - (range % max);
  let value = rng.nextUint32();
  while (value >= limit) value = rng.nextUint32();
  return value % max;
}

export function isGemId(value: string): value is GemId {
  return (GEM_IDS as readonly string[]).includes(value);
}

export function isBetPreset(bet: number): boolean {
  return (STORM_KING_BET_PRESETS as readonly number[]).includes(bet);
}

/** Pozitif coin için half-up. */
export function roundMulDiv(
  bet: number,
  numer: number,
  denom: number,
  tier: number,
): number {
  if (!Number.isInteger(bet) || bet <= 0) throw new Error('bet');
  if (!Number.isInteger(numer) || numer <= 0) throw new Error('numer');
  if (!Number.isInteger(denom) || denom <= 0) throw new Error('denom');
  if (!Number.isInteger(tier) || tier <= 0) throw new Error('tier');
  const product = BigInt(bet) * BigInt(numer) * BigInt(tier);
  const divisor = BigInt(denom);
  const rounded = (product + divisor / 2n) / divisor;
  if (rounded < 0n) throw new Error('negative pay');
  if (rounded > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('pay overflow');
  return Number(rounded);
}

export function tierForCount(count: number): number {
  if (count >= 12) return 10;
  if (count >= 10) return 3;
  if (count >= STORM_KING_MIN_CLUSTER) return 1;
  return 0;
}

export function clusterAmount(bet: number, id: GemId, count: number): number {
  const tier = tierForCount(count);
  if (tier === 0) return 0;
  const pay = GEM_PAY[id];
  return roundMulDiv(bet, pay.numer, pay.denom, tier);
}

export interface StormDropItem {
  value: number;
  weight: number;
  base: number;
  left: number | null;
  rule: string | null;
}

export interface StormDropUsage {
  queueUsed: number;
  rules: Record<string, number>;
}

export interface StormDropPlan {
  orbChanceBps: number;
  items: StormDropItem[];
  queue: number[];
  usage: StormDropUsage;
}

export function emptyDropUsage(): StormDropUsage {
  return { queueUsed: 0, rules: {} };
}

function pickPlannedMultiplier(rng: StormRng, items: StormDropItem[], usage: StormDropUsage): number {
  const choices = items
    .map((item) => {
      const boosted = item.left === null || item.left > 0;
      const weight = boosted ? item.weight : item.base;
      return { item, weight, boosted };
    })
    .filter((choice) => choice.weight > 0 && choice.item.value > 0);
  const total = choices.reduce((sum, choice) => sum + choice.weight, 0);
  if (total <= 0) return 2;
  const pick = nextInt(rng, total);
  let cursor = 0;
  for (const choice of choices) {
    cursor += choice.weight;
    if (pick < cursor) {
      if (choice.boosted && choice.item.left !== null && choice.item.left > 0) {
        choice.item.left -= 1;
        const rule = choice.item.rule;
        if (rule) usage.rules[rule] = (usage.rules[rule] ?? 0) + 1;
      }
      return choice.item.value;
    }
  }
  return choices[0]?.item.value ?? 2;
}

export function rollCell(rng: StormRng, plan?: StormDropPlan, queueIndex?: { n: number }): Cell {
  const bps = plan
    ? Math.max(0, Math.min(10_000, Math.floor(plan.orbChanceBps)))
    : STORM_KING_ORB_CHANCE_BPS;
  const ticket = nextInt(rng, 10_000);
  if (ticket < bps) {
    if (plan && queueIndex && queueIndex.n < plan.queue.length) {
      const value = plan.queue[queueIndex.n];
      queueIndex.n += 1;
      plan.usage.queueUsed += 1;
      if (Number.isInteger(value) && value > 0) return { type: 'multiplier', value };
    }
    if (plan && plan.items.length > 0) {
      return { type: 'multiplier', value: pickPlannedMultiplier(rng, plan.items, plan.usage) };
    }
    const pick = nextInt(rng, MULTIPLIER_WEIGHT_SUM);
    let cursor = 0;
    for (const row of MULTIPLIER_WEIGHTS) {
      cursor += row.weight;
      if (pick < cursor) return { type: 'multiplier', value: row.value };
    }
    return { type: 'multiplier', value: 2 };
  }
  const gem = GEM_IDS[nextInt(rng, GEM_IDS.length)];
  if (!gem) throw new Error('gem');
  return { type: 'gem', id: gem };
}

function assertFiniteWin(amount: number, label: string): void {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`${label} invalid`);
  }
}

export function findWins(board: readonly SymbolData[], bet: number): WinGroup[] {
  const buckets = new Map<GemId, number[]>();
  for (const symbol of board) {
    if (symbol.cell.type !== 'gem') continue;
    const list = buckets.get(symbol.cell.id) ?? [];
    list.push(symbol.uid);
    buckets.set(symbol.cell.id, list);
  }
  const wins: WinGroup[] = [];
  for (const id of GEM_IDS) {
    const uids = buckets.get(id);
    if (!uids || uids.length < STORM_KING_MIN_CLUSTER) continue;
    const amount = clusterAmount(bet, id, uids.length);
    assertFiniteWin(amount, 'cluster');
    wins.push({ id, count: uids.length, amount, uids: [...uids] });
  }
  return wins;
}

function assertBoard(board: readonly SymbolData[]): void {
  if (board.length !== STORM_KING_CELLS) throw new Error('cell count');
  const seenUid = new Set<number>();
  const seenPos = new Set<string>();
  for (const symbol of board) {
    if (!Number.isInteger(symbol.uid) || symbol.uid <= 0) throw new Error('uid');
    if (seenUid.has(symbol.uid)) throw new Error('duplicate uid');
    seenUid.add(symbol.uid);
    if (
      symbol.col < 0 ||
      symbol.col >= STORM_KING_COLS ||
      symbol.row < 0 ||
      symbol.row >= STORM_KING_ROWS
    ) {
      throw new Error('position');
    }
    const key = `${symbol.col}:${symbol.row}`;
    if (seenPos.has(key)) throw new Error('duplicate cell');
    seenPos.add(key);
    if (symbol.cell.type === 'gem') {
      if (!isGemId(symbol.cell.id)) throw new Error('gem id');
    } else if (
      symbol.cell.type !== 'multiplier' ||
      !Number.isInteger(symbol.cell.value) ||
      symbol.cell.value <= 0
    ) {
      throw new Error('multiplier');
    }
  }
}

export function applyTumble(
  board: readonly SymbolData[],
  removed: readonly number[],
  spawn: readonly Cell[],
  startUid: number,
): {
  board: SymbolData[];
  moved: Array<{ uid: number; row: number }>;
  spawned: SymbolData[];
  nextUid: number;
} {
  const removedSet = new Set(removed);
  const moved: Array<{ uid: number; row: number }> = [];
  const spawned: SymbolData[] = [];
  const next: SymbolData[] = [];
  let uid = startUid;
  let spawnIndex = 0;

  for (let col = 0; col < STORM_KING_COLS; col += 1) {
    const survivors = board
      .filter((symbol) => symbol.col === col && !removedSet.has(symbol.uid))
      .sort((a, b) => b.row - a.row);
    const packed: SymbolData[] = [];
    survivors.forEach((symbol, index) => {
      const row = STORM_KING_ROWS - 1 - index;
      if (symbol.row !== row) moved.push({ uid: symbol.uid, row });
      packed.push({ ...symbol, row });
    });
    const gaps = STORM_KING_ROWS - packed.length;
    for (let row = 0; row < gaps; row += 1) {
      const cell = spawn[spawnIndex];
      spawnIndex += 1;
      if (!cell) throw new Error('spawn exhausted');
      const symbol: SymbolData = { uid, col, row, cell };
      uid += 1;
      spawned.push(symbol);
      next.push(symbol);
    }
    next.push(...packed);
  }

  if (spawnIndex !== spawn.length) throw new Error('spawn unused');
  assertBoard(next);
  return { board: next, moved, spawned, nextUid: uid };
}

export interface PlaySpinInput {
  bet: number;
  rng?: StormRng;
  /** Verilirse hücreler bu sırayla tüketilir; bitince rng kullanılır. */
  cells?: readonly Cell[];
  /** Admin çıkış planı. Yoksa yerleşik çarpan tablosu kullanılır. */
  drop?: StormDropPlan;
  maxSteps?: number;
}

export function playStormKingSpin(input: PlaySpinInput): SpinResult {
  if (!Number.isInteger(input.bet) || input.bet <= 0) throw new Error('bet');
  const maxSteps = input.maxSteps ?? STORM_KING_MAX_STEPS;
  if (!Number.isInteger(maxSteps) || maxSteps < 0 || maxSteps > STORM_KING_MAX_STEPS) {
    throw new Error('maxSteps');
  }
  const rng = input.rng ?? createCryptoRng();
  let cellCursor = 0;
  const queueIndex = { n: 0 };
  const takeCell = (): Cell => {
    const scripted = input.cells?.[cellCursor];
    if (scripted) {
      cellCursor += 1;
      return scripted;
    }
    return rollCell(rng, input.drop, queueIndex);
  };

  let uid = 1;
  const initial: SymbolData[] = [];
  for (let col = 0; col < STORM_KING_COLS; col += 1) {
    for (let row = 0; row < STORM_KING_ROWS; row += 1) {
      initial.push({ uid, col, row, cell: takeCell() });
      uid += 1;
    }
  }
  assertBoard(initial);

  let board = initial;
  const steps: TumbleStep[] = [];
  while (steps.length < maxSteps) {
    const wins = findWins(board, input.bet);
    if (wins.length === 0) break;
    const removed = wins.flatMap((win) => win.uids);
    const stepWin = wins.reduce((sum, win) => sum + win.amount, 0);
    assertFiniteWin(stepWin, 'step');
    const gaps = removed.length;
    const spawn: Cell[] = [];
    for (let i = 0; i < gaps; i += 1) spawn.push(takeCell());
    const tumbled = applyTumble(board, removed, spawn, uid);
    uid = tumbled.nextUid;
    steps.push({
      wins,
      removed,
      moved: tumbled.moved,
      spawned: tumbled.spawned,
      stepWin,
    });
    board = tumbled.board;
  }

  const baseWin = steps.reduce((sum, step) => sum + step.stepWin, 0);
  assertFiniteWin(baseWin, 'base');
  const multipliers = board
    .filter((symbol) => symbol.cell.type === 'multiplier')
    .map((symbol) => {
      if (symbol.cell.type !== 'multiplier') return { uid: symbol.uid, value: 0 };
      return { uid: symbol.uid, value: symbol.cell.value };
    });
  const orbSum = multipliers.reduce((sum, orb) => sum + orb.value, 0);
  const multiplierSum = baseWin > 0 && orbSum > 0 ? orbSum : 1;
  if (!Number.isInteger(multiplierSum) || multiplierSum < 1) throw new Error('multiplier');

  const cap = BigInt(input.bet) * BigInt(STORM_KING_MAX_WIN_MULT);
  const product = BigInt(baseWin) * BigInt(multiplierSum);
  const capped = product > cap;
  const finalWin = Number(capped ? cap : product);
  assertFiniteWin(finalWin, 'final');
  if (finalWin > input.bet * STORM_KING_MAX_WIN_MULT) throw new Error('cap');

  return {
    initial,
    steps,
    baseWin,
    multipliers,
    multiplierSum,
    finalWin,
    capped,
    finalBoard: board,
  };
}

export function replaySpin(result: SpinResult): SymbolData[] {
  let board = result.initial.map((symbol) => ({ ...symbol, cell: symbol.cell }));
  assertBoard(board);
  for (const step of result.steps) {
    const spawn = step.spawned.map((symbol) => symbol.cell);
    const startUid = step.spawned.reduce(
      (min, symbol) => Math.min(min, symbol.uid),
      Number.MAX_SAFE_INTEGER,
    );
    const tumbled = applyTumble(
      board,
      step.removed,
      spawn,
      step.spawned.length > 0 ? startUid : 1,
    );
    const byUid = new Map(tumbled.board.map((symbol) => [symbol.uid, symbol]));
    for (const spawned of step.spawned) {
      const placed = byUid.get(spawned.uid);
      if (!placed || placed.col !== spawned.col || placed.row !== spawned.row) {
        throw new Error('spawn mismatch');
      }
    }
    board = tumbled.board;
  }
  return board;
}

export function boardsMatch(a: readonly SymbolData[], b: readonly SymbolData[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort((x, y) => x.uid - y.uid);
  const right = [...b].sort((x, y) => x.uid - y.uid);
  return left.every((symbol, index) => {
    const other = right[index];
    if (!other) return false;
    if (symbol.uid !== other.uid || symbol.col !== other.col || symbol.row !== other.row) {
      return false;
    }
    if (symbol.cell.type !== other.cell.type) return false;
    if (symbol.cell.type === 'gem' && other.cell.type === 'gem') {
      return symbol.cell.id === other.cell.id;
    }
    if (symbol.cell.type === 'multiplier' && other.cell.type === 'multiplier') {
      return symbol.cell.value === other.cell.value;
    }
    return false;
  });
}
