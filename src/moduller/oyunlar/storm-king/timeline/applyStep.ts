import type { SymbolData, TumbleStep } from '../types';

export function applyRecordedStep(
  board: readonly SymbolData[],
  step: TumbleStep,
): SymbolData[] {
  const removed = new Set(step.removed);
  const moved = new Map(step.moved.map((move) => [move.uid, move.row]));
  const kept = board
    .filter((symbol) => !removed.has(symbol.uid))
    .map((symbol) => {
      const row = moved.get(symbol.uid);
      return row === undefined ? symbol : { ...symbol, row };
    });
  return [...kept, ...step.spawned];
}
