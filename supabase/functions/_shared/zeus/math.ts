/**
 * ZEUS — Deno matematik otoritesi.
 * Client simulateZeusSpin ile aynı kurallar; production sonucu YALNIZCA burada.
 */

export type ZeusSymbolType =
  | 'blueDiamond'
  | 'greenEmerald'
  | 'purpleGem'
  | 'redRuby'
  | 'goldCrown'
  | 'goldRing'
  | 'goldGoblet'
  | 'lyre'
  | 'pegasus'
  | 'zeusScatter'
  | 'multiplierOrb';

export type GridCell = {
  id: string;
  type: ZeusSymbolType;
  column: number;
  row: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  state: 'idle' | 'dropping' | 'matched' | 'exploding' | 'dimmed';
  zIndex: number;
  instanceId: string;
  multiplierValue: number | null;
};

export type GridMatrix = GridCell[][];

export type ZeusWinTier =
  | 'NONE'
  | 'NORMAL'
  | 'NICE'
  | 'BIG'
  | 'MEGA'
  | 'SENSATIONAL';

export type ZeusMathConfig = {
  mathVersion: string;
  paytableVersion: string;
  configVersion: string;
  columns: number;
  rows: number;
  minMatchCount: number;
  paytable: Partial<Record<ZeusSymbolType, { 8: number; 10: number; 12: number }>>;
  symbolWeights: Partial<Record<ZeusSymbolType, number>>;
  multiplierWeights: Array<{ value: number; weight: number }>;
  multiplierSpawnChance: number;
  scatterSpawnChance: number;
  freeSpinTriggerCount: number;
  freeSpinReward: number;
  retriggerMinCount: number;
  retriggerReward: number;
  bonus: { persistentMultiplier: boolean; multiplierSpawnChance: number };
  maxCascades: number;
  maxEvents: number;
  maxPayoutMult: number;
  winTiers: { nice: number; big: number; mega: number; sensational: number };
  betPresets: number[];
  minBet: number;
  maxBet: number;
  autoplayEnabled: boolean;
  turboEnabled: boolean;
};

const ALL_PAY_SYMBOLS: readonly ZeusSymbolType[] = [
  'blueDiamond',
  'greenEmerald',
  'purpleGem',
  'redRuby',
  'goldCrown',
  'goldRing',
  'goldGoblet',
  'lyre',
  'pegasus',
];

export const DEFAULT_CONFIG: ZeusMathConfig = {
  mathVersion: 'olympus-balanced-v1',
  paytableVersion: 'zeus-pay-v1',
  configVersion: 'zeus-cfg-v1',
  columns: 6,
  rows: 5,
  minMatchCount: 8,
  paytable: {
    blueDiamond: { 8: 0.25, 10: 0.8, 12: 2.0 },
    greenEmerald: { 8: 0.25, 10: 0.8, 12: 2.0 },
    purpleGem: { 8: 0.4, 10: 1.0, 12: 2.5 },
    redRuby: { 8: 0.4, 10: 1.0, 12: 2.5 },
    goldCrown: { 8: 0.8, 10: 2.0, 12: 5.0 },
    goldRing: { 8: 1.2, 10: 3.0, 12: 8.0 },
    goldGoblet: { 8: 1.6, 10: 4.0, 12: 10.0 },
    lyre: { 8: 2.4, 10: 6.0, 12: 15.0 },
    pegasus: { 8: 4.0, 10: 10.0, 12: 25.0 },
  },
  symbolWeights: {
    blueDiamond: 18,
    greenEmerald: 18,
    purpleGem: 15,
    redRuby: 15,
    goldCrown: 9,
    goldRing: 7.5,
    goldGoblet: 6.5,
    lyre: 5,
    pegasus: 3.5,
  },
  multiplierWeights: [
    { value: 2, weight: 40 },
    { value: 3, weight: 24 },
    { value: 4, weight: 12 },
    { value: 5, weight: 10 },
    { value: 10, weight: 6 },
    { value: 15, weight: 3.2 },
    { value: 25, weight: 1.8 },
    { value: 50, weight: 0.7 },
    { value: 100, weight: 0.22 },
    { value: 250, weight: 0.06 },
    { value: 500, weight: 0.02 },
  ],
  multiplierSpawnChance: 0.028,
  scatterSpawnChance: 0.0118,
  freeSpinTriggerCount: 4,
  freeSpinReward: 15,
  retriggerMinCount: 4,
  retriggerReward: 15,
  bonus: { persistentMultiplier: true, multiplierSpawnChance: 0.05 },
  maxCascades: 32,
  maxEvents: 256,
  maxPayoutMult: 5000,
  winTiers: { nice: 5, big: 15, mega: 40, sensational: 80 },
  betPresets: [20, 50, 100, 150, 200],
  minBet: 20,
  maxBet: 200,
  autoplayEnabled: true,
  turboEnabled: true,
};

/** DB/admin JSON config → tam ZeusMathConfig (eksik alanlar DEFAULT'tan). */
export function mergeZeusMathConfig(
  partial: Record<string, unknown> | null | undefined,
): ZeusMathConfig {
  if (!partial || typeof partial !== 'object') {
    return { ...DEFAULT_CONFIG };
  }
  const base = { ...DEFAULT_CONFIG };
  const out: ZeusMathConfig = {
    ...base,
    ...partial,
    paytable: {
      ...base.paytable,
      ...((partial.paytable as ZeusMathConfig['paytable']) ?? {}),
    },
    symbolWeights: {
      ...base.symbolWeights,
      ...((partial.symbolWeights as ZeusMathConfig['symbolWeights']) ?? {}),
    },
    multiplierWeights:
      Array.isArray(partial.multiplierWeights) &&
      (partial.multiplierWeights as unknown[]).length > 0
        ? (partial.multiplierWeights as ZeusMathConfig['multiplierWeights'])
        : base.multiplierWeights,
    bonus: {
      ...base.bonus,
      ...((partial.bonus as ZeusMathConfig['bonus']) ?? {}),
    },
    winTiers: {
      ...base.winTiers,
      ...((partial.winTiers as ZeusMathConfig['winTiers']) ?? {}),
    },
    betPresets: Array.isArray(partial.betPresets)
      ? (partial.betPresets as number[]).map((n) => Math.floor(Number(n)))
      : base.betPresets,
    minBet: Number(partial.minBet ?? base.minBet),
    maxBet: Math.min(200, Number(partial.maxBet ?? base.maxBet)),
  };
  if (out.maxBet > 200) out.maxBet = 200;
  if (out.minBet < 1) out.minBet = base.minBet;
  out.betPresets = out.betPresets
    .filter((b) => b >= out.minBet && b <= out.maxBet)
    .sort((a, b) => a - b);
  if (out.betPresets.length === 0) {
    out.betPresets = [...DEFAULT_CONFIG.betPresets];
  }
  return out;
}

type SeededRng = {
  next(): number;
  nextInt(maxExclusive: number): number;
  pickWeighted<T>(items: ReadonlyArray<{ item: T; weight: number }>): T;
  chance(probability: number): boolean;
};

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function createSeededRng(seed: string | number): SeededRng {
  const seedStr = typeof seed === 'number' ? String(seed) : seed;
  const seedFn = xmur3(seedStr);
  let state = seedFn();
  const next = (): number => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    nextInt(maxExclusive: number) {
      if (maxExclusive <= 0) return 0;
      return Math.floor(next() * maxExclusive);
    },
    pickWeighted<T>(items: ReadonlyArray<{ item: T; weight: number }>) {
      if (items.length === 0) throw new Error('pickWeighted: empty');
      let total = 0;
      for (const entry of items) total += Math.max(0, entry.weight);
      if (total <= 0) return items[0]!.item;
      let r = next() * total;
      for (const entry of items) {
        r -= Math.max(0, entry.weight);
        if (r <= 0) return entry.item;
      }
      return items[items.length - 1]!.item;
    },
    chance(probability: number) {
      return next() < probability;
    },
  };
}

function emptyInstanceId(row: number, column: number): string {
  return `__empty_r${row}c${column}`;
}
function isEmptyInstanceId(id: string): boolean {
  return id === '__empty__' || id.startsWith('__empty_');
}
function isPaySymbol(type: ZeusSymbolType): boolean {
  return (ALL_PAY_SYMBOLS as readonly string[]).includes(type);
}
function isScatter(type: ZeusSymbolType): boolean {
  return type === 'zeusScatter';
}
function isMultiplier(type: ZeusSymbolType): boolean {
  return type === 'multiplierOrb';
}

let instanceCounter = 0;
function resetInstanceCounter(n = 0): void {
  instanceCounter = n;
}
function nextInstanceId(prefix = 'c'): string {
  instanceCounter += 1;
  return `${prefix}_${instanceCounter.toString(36)}`;
}

function makeCell(
  type: ZeusSymbolType,
  row: number,
  column: number,
  instanceId: string,
  multiplierValue: number | null,
): GridCell {
  return {
    id: `r${row}c${column}`,
    type,
    column,
    row,
    x: column,
    y: row,
    scale: 1,
    rotation: 0,
    opacity: 1,
    state: 'idle',
    zIndex: 1,
    instanceId,
    multiplierValue,
  };
}

function cloneGrid(grid: GridMatrix): GridMatrix {
  return grid.map((row) => row.map((cell) => ({ ...cell })));
}

function pickPaySymbol(config: ZeusMathConfig, rng: SeededRng): ZeusSymbolType {
  return rng.pickWeighted(
    ALL_PAY_SYMBOLS.map((sym) => ({
      item: sym,
      weight: config.symbolWeights[sym] ?? 1,
    })),
  );
}

function pickMultiplierValue(config: ZeusMathConfig, rng: SeededRng): number {
  return rng.pickWeighted(
    config.multiplierWeights.map((w) => ({ item: w.value, weight: w.weight })),
  );
}

type GenerateCellOptions = { allowSpecial?: boolean; bonusMode?: boolean };

function generateCell(
  config: ZeusMathConfig,
  rng: SeededRng,
  row: number,
  column: number,
  opts?: GenerateCellOptions,
): GridCell {
  const allowSpecial = opts?.allowSpecial !== false;
  const multiplierChance = opts?.bonusMode
    ? config.bonus.multiplierSpawnChance
    : config.multiplierSpawnChance;
  let type: ZeusSymbolType = pickPaySymbol(config, rng);
  let multiplierValue: number | null = null;
  if (allowSpecial) {
    if (rng.chance(config.scatterSpawnChance)) {
      type = 'zeusScatter';
    } else if (rng.chance(multiplierChance)) {
      type = 'multiplierOrb';
      multiplierValue = pickMultiplierValue(config, rng);
    }
  }
  return makeCell(type, row, column, nextInstanceId(), multiplierValue);
}

function generateInitialGrid(
  config: ZeusMathConfig,
  rng: SeededRng,
  opts?: GenerateCellOptions,
): GridMatrix {
  const grid: GridMatrix = [];
  for (let r = 0; r < config.rows; r += 1) {
    const row: GridCell[] = [];
    for (let c = 0; c < config.columns; c += 1) {
      row.push(generateCell(config, rng, r, c, opts));
    }
    grid.push(row);
  }
  return grid;
}

function removeCellsByInstanceIds(
  grid: GridMatrix,
  instanceIds: ReadonlySet<string>,
): GridMatrix {
  const next = cloneGrid(grid);
  for (let r = 0; r < next.length; r += 1) {
    for (let c = 0; c < (next[r]?.length ?? 0); c += 1) {
      const cell = next[r]![c]!;
      if (instanceIds.has(cell.instanceId)) {
        next[r]![c] = {
          ...cell,
          type: 'blueDiamond',
          instanceId: emptyInstanceId(r, c),
          multiplierValue: null,
          opacity: 0,
          state: 'exploding',
        };
      }
    }
  }
  return next;
}

function applyGravityAndFill(
  grid: GridMatrix,
  config: ZeusMathConfig,
  rng: SeededRng,
  opts?: GenerateCellOptions,
): { grid: GridMatrix; newSymbols: GridCell[] } {
  const cols = config.columns;
  const rows = config.rows;
  const newSymbols: GridCell[] = [];
  const result: GridMatrix = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null as unknown as GridCell),
  );
  for (let c = 0; c < cols; c += 1) {
    const stack: GridCell[] = [];
    for (let r = rows - 1; r >= 0; r -= 1) {
      const cell = grid[r]![c]!;
      if (!isEmptyInstanceId(cell.instanceId)) stack.push(cell);
    }
    let writeRow = rows - 1;
    for (const cell of stack) {
      result[writeRow]![c] = {
        ...cell,
        row: writeRow,
        column: c,
        y: writeRow,
        x: c,
        id: `r${writeRow}c${c}`,
        state: 'dropping',
      };
      writeRow -= 1;
    }
    while (writeRow >= 0) {
      const spawned = generateCell(config, rng, writeRow, c, opts);
      spawned.instanceId = nextInstanceId('n');
      spawned.state = 'dropping';
      result[writeRow]![c] = spawned;
      newSymbols.push(spawned);
      writeRow -= 1;
    }
  }
  return { grid: result, newSymbols };
}

function collectRemovedIds(
  before: GridMatrix,
  matchedIds: ReadonlySet<string>,
): string[] {
  const out: string[] = [];
  for (const row of before) {
    for (const cell of row) {
      if (matchedIds.has(cell.instanceId)) out.push(cell.instanceId);
    }
  }
  return out;
}

function resolvePayBand(count: number): 8 | 10 | 12 | null {
  if (count >= 12) return 12;
  if (count >= 10) return 10;
  if (count >= 8) return 8;
  return null;
}

function calcClusterWin(
  config: ZeusMathConfig,
  symbolType: ZeusSymbolType,
  count: number,
  betAmount: number,
): number {
  const table = config.paytable[symbolType];
  if (!table) return 0;
  const band = resolvePayBand(count);
  if (!band) return 0;
  const mult = table[band] ?? 0;
  if (mult <= 0) return 0;
  return Math.floor(betAmount * mult * 100) / 100;
}

function resolveWinTier(
  config: ZeusMathConfig,
  totalWin: number,
  betAmount: number,
): ZeusWinTier {
  if (betAmount <= 0 || totalWin <= 0) return 'NONE';
  const ratio = totalWin / betAmount;
  const t = config.winTiers;
  if (ratio >= t.sensational) return 'SENSATIONAL';
  if (ratio >= t.mega) return 'MEGA';
  if (ratio >= t.big) return 'BIG';
  if (ratio >= t.nice) return 'NICE';
  return 'NORMAL';
}

type MatchedCluster = {
  symbolType: ZeusSymbolType;
  cellIds: string[];
  count: number;
  payMult: number;
  winAmount: number;
};

function detectMatches(
  grid: GridMatrix,
  config: ZeusMathConfig,
  betAmount: number,
): MatchedCluster[] {
  const counts = new Map<ZeusSymbolType, string[]>();
  for (const row of grid) {
    for (const cell of row) {
      if (isEmptyInstanceId(cell.instanceId)) continue;
      if (!isPaySymbol(cell.type)) continue;
      const list = counts.get(cell.type) ?? [];
      list.push(cell.instanceId);
      counts.set(cell.type, list);
    }
  }
  const matches: MatchedCluster[] = [];
  for (const [symbolType, cellIds] of counts) {
    const count = cellIds.length;
    if (count < config.minMatchCount) continue;
    const winAmount = calcClusterWin(config, symbolType, count, betAmount);
    matches.push({
      symbolType,
      cellIds: [...cellIds],
      count,
      payMult: winAmount / Math.max(1, betAmount),
      winAmount,
    });
  }
  return matches;
}

function extractOrbValues(grid: GridMatrix): number[] {
  const values: number[] = [];
  for (const row of grid) {
    for (const cell of row) {
      if (isEmptyInstanceId(cell.instanceId)) continue;
      if (!isMultiplier(cell.type)) continue;
      const v = cell.multiplierValue ?? 0;
      if (v > 0) values.push(v);
    }
  }
  return values.sort((a, b) => a - b);
}

function applySequenceMultiplier(input: {
  sequenceBaseWin: number;
  orbValues: readonly number[];
  isFreeSpin: boolean;
  persistentBefore: number;
  persistentEnabled: boolean;
}): { totalWin: number; appliedMultiplier: number; persistentAfter: number } {
  const { sequenceBaseWin, orbValues, isFreeSpin, persistentBefore, persistentEnabled } =
    input;
  const orbSum = orbValues.reduce((a, b) => a + b, 0);
  if (sequenceBaseWin <= 0) {
    return {
      totalWin: 0,
      appliedMultiplier: 1,
      persistentAfter: isFreeSpin && persistentEnabled ? persistentBefore : 0,
    };
  }
  if (isFreeSpin && persistentEnabled) {
    if (orbSum > 0) {
      const persistentAfter = persistentBefore + orbSum;
      const applied = Math.max(1, persistentAfter);
      return {
        totalWin: Math.floor(sequenceBaseWin * applied * 100) / 100,
        appliedMultiplier: applied,
        persistentAfter,
      };
    }
    return {
      totalWin: sequenceBaseWin,
      appliedMultiplier: 1,
      persistentAfter: persistentBefore,
    };
  }
  const applied = orbSum > 0 ? Math.max(1, orbSum) : 1;
  return {
    totalWin: Math.floor(sequenceBaseWin * applied * 100) / 100,
    appliedMultiplier: applied,
    persistentAfter: 0,
  };
}

function countScatters(grid: GridMatrix): number {
  let n = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (isEmptyInstanceId(cell.instanceId)) continue;
      if (isScatter(cell.type)) n += 1;
    }
  }
  return n;
}

export type SimulateSpinInput = {
  config: ZeusMathConfig;
  seed: string;
  betAmount: number;
  roundId: string;
  sessionId: string;
  balanceBefore: number;
  remainingFreeSpins?: number;
  isFreeSpin?: boolean;
  persistentMultiplier?: number;
};

export type ZeusSpinResult = {
  roundId: string;
  sessionId: string;
  mathVersion: string;
  configVersion: string;
  paytableVersion: string;
  rngSeed: string;
  betAmount: number;
  initialGrid: GridMatrix;
  cascades: Array<{
    cascadeIndex: number;
    gridBefore: GridMatrix;
    matched: MatchedCluster[];
    removedIds: string[];
    winAmount: number;
    multipliersOnBoard: number[];
    newSymbols: GridCell[];
    gridAfter: GridMatrix;
  }>;
  sequenceBaseWin: number;
  appliedMultiplier: number;
  orbValues: number[];
  totalWin: number;
  winTier: ZeusWinTier;
  bonusTriggered: boolean;
  bonus: { scatterCount: number; freeSpins: number } | null;
  retriggered: boolean;
  retriggerSpins: number;
  persistentMultiplierBefore: number;
  persistentMultiplierAfter: number;
  scatterCount: number;
  balanceBefore: number;
  balanceAfter: number;
  remainingFreeSpins: number;
  isFreeSpin: boolean;
};

export function simulateZeusSpin(input: SimulateSpinInput): ZeusSpinResult {
  const {
    config,
    seed,
    betAmount,
    roundId,
    sessionId,
    balanceBefore,
    remainingFreeSpins = 0,
    isFreeSpin = false,
    persistentMultiplier = 0,
  } = input;

  resetInstanceCounter(0);
  const rng = createSeededRng(seed);
  const genOpts = { bonusMode: isFreeSpin };
  const initialGrid = generateInitialGrid(config, rng, genOpts);
  const cascades: ZeusSpinResult['cascades'] = [];
  let grid = cloneGrid(initialGrid);
  let sequenceBaseWin = 0;
  let eventCount = 0;

  for (let cascadeIndex = 0; cascadeIndex < config.maxCascades; cascadeIndex += 1) {
    eventCount += 1;
    if (eventCount > config.maxEvents) break;
    const matched = detectMatches(grid, config, betAmount);
    if (matched.length === 0) break;
    const removedSet = new Set(matched.flatMap((m) => m.cellIds));
    const stepBase = matched.reduce((sum, m) => sum + m.winAmount, 0);
    sequenceBaseWin += stepBase;
    const orbsHere = extractOrbValues(grid);
    const gridBefore = cloneGrid(grid);
    const removedIds = collectRemovedIds(gridBefore, removedSet);
    const afterRemove = removeCellsByInstanceIds(grid, removedSet);
    const { grid: filled, newSymbols } = applyGravityAndFill(
      afterRemove,
      config,
      rng,
      genOpts,
    );
    cascades.push({
      cascadeIndex,
      gridBefore,
      matched,
      removedIds,
      winAmount: stepBase,
      multipliersOnBoard: orbsHere,
      newSymbols,
      gridAfter: cloneGrid(filled),
    });
    grid = filled;
  }

  const orbValues = extractOrbValues(grid);
  const mult = applySequenceMultiplier({
    sequenceBaseWin,
    orbValues,
    isFreeSpin,
    persistentBefore: isFreeSpin ? persistentMultiplier : 0,
    persistentEnabled: config.bonus.persistentMultiplier,
  });

  let totalWin = mult.totalWin;
  const maxWin = betAmount * config.maxPayoutMult;
  if (totalWin > maxWin) totalWin = maxWin;

  const scatterCount = countScatters(grid);
  let bonusTriggered = false;
  let bonus: ZeusSpinResult['bonus'] = null;
  let retriggered = false;
  let retriggerSpins = 0;
  if (isFreeSpin) {
    retriggerSpins =
      scatterCount >= config.retriggerMinCount ? config.retriggerReward : 0;
    retriggered = retriggerSpins > 0;
  } else if (scatterCount >= config.freeSpinTriggerCount) {
    bonus = { scatterCount, freeSpins: config.freeSpinReward };
    bonusTriggered = true;
  }

  const debit = isFreeSpin ? 0 : betAmount;
  const balanceAfter = Math.max(0, balanceBefore - debit + totalWin);
  const remainingAfter = isFreeSpin
    ? Math.max(0, remainingFreeSpins - 1) + retriggerSpins
    : remainingFreeSpins + (bonus?.freeSpins ?? 0);

  return {
    roundId,
    sessionId,
    mathVersion: config.mathVersion,
    configVersion: config.configVersion,
    paytableVersion: config.paytableVersion,
    rngSeed: seed,
    betAmount,
    initialGrid,
    cascades,
    sequenceBaseWin,
    appliedMultiplier: mult.appliedMultiplier,
    orbValues,
    totalWin,
    winTier: resolveWinTier(config, totalWin, betAmount),
    bonusTriggered,
    bonus,
    retriggered,
    retriggerSpins,
    persistentMultiplierBefore: isFreeSpin ? persistentMultiplier : 0,
    persistentMultiplierAfter: isFreeSpin ? mult.persistentAfter : 0,
    scatterCount,
    balanceBefore,
    balanceAfter,
    remainingFreeSpins: remainingAfter,
    isFreeSpin,
  };
}
