import type { SharedValue } from 'react-native-reanimated';
import { Easing, withSequence, withTiming } from 'react-native-reanimated';
import { dropDuration } from '../constants/theme';
import { playStormKingCue } from '../ses/StormKingSes';
import type { SpinResult, SymbolData } from '../types';
import { applyRecordedStep } from './applyStep';

export type SymbolMotion = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  scale: SharedValue<number>;
  opacity: SharedValue<number>;
  glow: SharedValue<number>;
};

const motions = new Map<number, SymbolMotion>();
let presentationGen = 2;

function tagUid(uid: number, gen: number): number {
  return gen * 1_000_000 + uid;
}

function presentSymbol(symbol: SymbolData, gen: number): SymbolData {
  return { ...symbol, uid: tagUid(symbol.uid, gen) };
}

function presentResult(result: SpinResult, gen: number): SpinResult {
  const presentList = (symbols: readonly SymbolData[]) =>
    symbols.map((symbol) => presentSymbol(symbol, gen));
  return {
    ...result,
    initial: presentList(result.initial),
    finalBoard: presentList(result.finalBoard),
    multipliers: result.multipliers.map((orb) => ({ ...orb, uid: tagUid(orb.uid, gen) })),
    steps: result.steps.map((step) => ({
      ...step,
      removed: step.removed.map((uid) => tagUid(uid, gen)),
      moved: step.moved.map((move) => ({ ...move, uid: tagUid(move.uid, gen) })),
      spawned: presentList(step.spawned),
      wins: step.wins.map((win) => ({
        ...win,
        uids: win.uids.map((uid) => tagUid(uid, gen)),
      })),
    })),
  };
}

export function registerSymbolMotion(uid: number, motion: SymbolMotion): void {
  motions.set(uid, motion);
}

export function unregisterSymbolMotion(uid: number): void {
  motions.delete(uid);
}

export function clearSymbolMotions(): void {
  motions.clear();
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function motionOf(uid: number): SymbolMotion | undefined {
  return motions.get(uid);
}

async function glide(value: SharedValue<number>, to: number, duration: number): Promise<void> {
  if (duration <= 0) {
    value.value = to;
    return;
  }
  value.value = withTiming(to, { duration, easing: Easing.out(Easing.cubic) });
  await sleep(duration);
}

export interface PlaySpinOptions {
  result: SpinResult;
  previous: readonly SymbolData[];
  cell: number;
  turbo: boolean;
  reduceMotion: boolean;
  cancelled: () => boolean;
  onBoard: (symbols: SymbolData[]) => void;
  onWinPop: (amounts: Record<number, number>) => void;
  onRunningWin: (amount: number) => void;
  onMultiplier: (value: number) => void;
  target: { x: number; y: number } | null;
}

function snapSymbols(symbols: readonly SymbolData[], cell: number): void {
  for (const symbol of symbols) {
    const motion = motionOf(symbol.uid);
    if (!motion) continue;
    motion.x.value = symbol.col * cell;
    motion.y.value = symbol.row * cell;
    motion.opacity.value = 1;
    motion.scale.value = 1;
    motion.glow.value = 0;
  }
}

async function dropIn(
  symbols: readonly SymbolData[],
  cell: number,
): Promise<void> {
  snapSymbols(symbols, cell);
  playStormKingCue('land');
  await sleep(32);
  snapSymbols(symbols, cell);
}

export async function playSpin(options: PlaySpinOptions): Promise<void> {
  const { cell, turbo, reduceMotion, cancelled } = options;
  const speed = turbo ? 0.55 : 1;
  presentationGen += 1;
  const result = presentResult(options.result, presentationGen);

  if (cancelled()) return;
  options.onBoard(result.initial);
  await dropIn(result.initial, cell);
  if (cancelled()) return;

  let board = result.initial;
  let running = 0;
  for (const step of result.steps) {
    if (cancelled()) return;
    const pops: Record<number, number> = {};
    for (const win of step.wins) {
      const share = win.uids.length > 0 ? Math.floor(win.amount / win.uids.length) : 0;
      for (const uid of win.uids) pops[uid] = share;
    }
    options.onWinPop(pops);
    if (step.removed.length > 0) playStormKingCue('explode');
    await Promise.all(
      step.removed.map(async (uid) => {
        const motion = motionOf(uid);
        if (!motion) return;
        motion.glow.value = 1;
        motion.scale.value = withSequence(
          withTiming(1.12, { duration: reduceMotion ? 0 : Math.round(140 * speed) }),
          withTiming(1.04, { duration: reduceMotion ? 0 : Math.round(90 * speed) }),
          withTiming(1.12, { duration: reduceMotion ? 0 : Math.round(90 * speed) }),
        );
      }),
    );
    await sleep(reduceMotion ? 0 : Math.round(280 * speed));
    running += step.stepWin;
    options.onRunningWin(running);
    await Promise.all(
      step.removed.map(async (uid) => {
        const motion = motionOf(uid);
        if (!motion) return;
        motion.opacity.value = withTiming(0, {
          duration: reduceMotion ? 0 : Math.round(160 * speed),
        });
        motion.scale.value = withTiming(1.28, {
          duration: reduceMotion ? 0 : Math.round(160 * speed),
        });
      }),
    );
    await sleep(reduceMotion ? 0 : Math.round(170 * speed));
    options.onWinPop({});

    const moved = new Map(step.moved.map((move) => [move.uid, move.row]));
    await Promise.all(
      board
        .filter((symbol) => !step.removed.includes(symbol.uid))
        .map(async (symbol) => {
          const nextRow = moved.get(symbol.uid) ?? symbol.row;
          const motion = motionOf(symbol.uid);
          if (!motion || nextRow === symbol.row) return;
          const duration = dropDuration(nextRow - symbol.row, turbo, reduceMotion);
          await glide(motion.y, nextRow * cell, duration);
          if (reduceMotion) return;
          motion.y.value = withSequence(
            withTiming(nextRow * cell - 6, { duration: Math.round(60 * speed) }),
            withTiming(nextRow * cell, { duration: Math.round(80 * speed) }),
          );
          await sleep(Math.round(140 * speed));
        }),
    );

    board = applyRecordedStep(board, step);
    options.onBoard(board);
    await dropIn(step.spawned, cell);
  }

  if (cancelled()) return;
  options.onBoard(result.finalBoard);
  snapSymbols(result.finalBoard, cell);
  await sleep(32);
  snapSymbols(result.finalBoard, cell);
  if (result.baseWin <= 0 || result.multipliers.length === 0) {
    options.onMultiplier(1);
    return;
  }

  let shown = 0;
  for (const orb of result.multipliers) {
    if (cancelled()) return;
    const motion = motionOf(orb.uid);
    const symbol = result.finalBoard.find((item) => item.uid === orb.uid);
    if (motion && symbol) {
      motion.x.value = symbol.col * cell;
      motion.y.value = symbol.row * cell;
      motion.opacity.value = 1;
      motion.glow.value = 1;
      motion.scale.value = withSequence(
        withTiming(1.16, { duration: reduceMotion ? 0 : 140 }),
        withTiming(1, { duration: reduceMotion ? 0 : 180 }),
      );
    }
    shown += orb.value;
    options.onMultiplier(shown);
    playStormKingCue('multiplier');
    await sleep(reduceMotion ? 0 : Math.round(220 * speed));
  }
  snapSymbols(result.finalBoard, cell);
}
