import { useSyncExternalStore } from 'react';
import { BET_PRESETS } from '../constants/theme';
import type { StormKingState } from '../types';

const initial: StormKingState = {
  bet: 100,
  balance: 0,
  gameBalance: null,
  lastWin: 0,
  multiplier: 1,
  status: 'idle',
  turbo: false,
  auto: false,
  error: null,
};

let state: StormKingState = initial;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function stormKingSnapshot(): StormKingState {
  return state;
}

export function patchStormKing(partial: Partial<StormKingState>): void {
  state = { ...state, ...partial };
  emit();
}

export function cycleStormKingBet(direction: -1 | 1): void {
  const index = BET_PRESETS.findIndex((preset) => preset === state.bet);
  const current = index < 0 ? 2 : index;
  const next = Math.min(BET_PRESETS.length - 1, Math.max(0, current + direction));
  const bet = BET_PRESETS[next] ?? state.bet;
  patchStormKing({ bet });
}

export function useStormKingStore(): StormKingState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    stormKingSnapshot,
    stormKingSnapshot,
  );
}
