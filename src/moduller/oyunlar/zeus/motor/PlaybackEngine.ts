/**
 * Client round playback — server sonucunu faz faz oynatır. Sonuç üretmez.
 */

import {
  ANTICIPATION_MS,
  DESTROY_MS,
  MATCH_GLOW_MS,
  MULTIPLIER_COLLECT_MS,
  SCATTER_SILENCE_MS,
  ROUND_END_HOLD_MS,
  winCelebrationMs,
} from '../config/ZeusSabitleri';
import {
  dropDistancesBetween,
  dropDistancesFromAbove,
  dusmeToplamMs,
  maxDusmeMesafesi,
} from '../../ortak/grid/DusmeMesafeleri';
import { isEmptyInstanceId } from '../symbols/SymbolRules';
import type { GridMatrix, ZeusPhase, ZeusSpinResult } from '../tipler/ZeusTipleri';

export type PlaybackListener = (
  phase: ZeusPhase,
  meta?: Record<string, unknown>,
) => void;

export type PlaybackController = {
  play(result: ZeusSpinResult): Promise<void>;
  cancel(): void;
  skip(): void;
  getPhase(): ZeusPhase;
};

type Signal = {
  cancelled: boolean;
  skipped: boolean;
  wake?: () => void;
};

const SKIP_FACTOR = 0.12;
/** Patlama kısa; düşüş hemen */
const DESTROY_THEN_DROP_MS = Math.round(DESTROY_MS * 0.28);
/** Giriş: 1 hücre — slot anında görünür */
const MAX_ENTRY_DROP_CELLS = 1;

function capDropDistances(
  dropping: Record<string, number>,
  maxCells = MAX_ENTRY_DROP_CELLS,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, d] of Object.entries(dropping)) {
    out[id] = Math.min(Math.max(0, d), maxCells);
  }
  return out;
}

function delay(ms: number, signal: Signal): Promise<void> {
  return new Promise((resolve) => {
    const effective = signal.skipped ? Math.max(16, ms * SKIP_FACTOR) : ms;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(t);
      signal.wake = undefined;
      resolve();
    };
    const t = setTimeout(finish, effective);
    signal.wake = finish;
  });
}

export function createPlaybackController(opts: {
  onPhase: PlaybackListener;
  speedFactor?: number;
}): PlaybackController {
  let phase: ZeusPhase = 'READY';
  const signal: Signal = { cancelled: false, skipped: false };
  const factor = opts.speedFactor ?? 1;

  const setPhase = (p: ZeusPhase, meta?: Record<string, unknown>) => {
    phase = p;
    opts.onPhase(p, meta);
  };

  return {
    getPhase: () => phase,
    cancel() {
      signal.cancelled = true;
      signal.wake?.();
      setPhase('READY');
    },
    skip() {
      signal.skipped = true;
      signal.wake?.();
    },
    async play(result: ZeusSpinResult) {
      signal.cancelled = false;
      signal.skipped = false;

      setPhase('SPINNING', { roundId: result.roundId });
      await delay(48 * factor, signal);
      if (signal.cancelled) return;

      const initialDrop = capDropDistances(
        dropDistancesFromAbove(result.initialGrid, isEmptyInstanceId),
      );
      setPhase('LANDING', {
        grid: result.initialGrid,
        dropping: initialDrop,
      });
      await delay(
        dusmeToplamMs(maxDusmeMesafesi(initialDrop) || MAX_ENTRY_DROP_CELLS, factor),
        signal,
      );
      if (signal.cancelled) return;

      let prevGrid: GridMatrix = result.initialGrid;

      for (const step of result.cascades) {
        setPhase('EVALUATE', {
          cascadeIndex: step.cascadeIndex,
          matched: step.matched,
        });
        await delay((MATCH_GLOW_MS / 2) * factor, signal);
        if (signal.cancelled) return;

        setPhase('WIN_HIGHLIGHT', {
          matched: step.matched,
          win: step.winAmount,
        });
        await delay(MATCH_GLOW_MS * factor, signal);
        if (signal.cancelled) return;

        setPhase('EXPLOSION', { removedIds: step.removedIds });
        await delay(DESTROY_THEN_DROP_MS * factor, signal);
        if (signal.cancelled) return;

        const dropping = capDropDistances(
          dropDistancesBetween(prevGrid, step.gridAfter, isEmptyInstanceId),
        );
        setPhase('CASCADE', {
          grid: step.gridAfter,
          newSymbols: step.newSymbols,
          cascadeIndex: step.cascadeIndex,
          dropping,
        });
        await delay(
          dusmeToplamMs(maxDusmeMesafesi(dropping) || 1, factor),
          signal,
        );
        if (signal.cancelled) return;
        prevGrid = step.gridAfter;
      }

      if (result.appliedMultiplier > 1) {
        setPhase('MULTIPLIER', {
          orbs: result.orbValues,
          applied: result.appliedMultiplier,
          base: result.sequenceBaseWin,
          total: result.totalWin,
        });
        await delay(MULTIPLIER_COLLECT_MS * factor, signal);
        if (signal.cancelled) return;
      }

      setPhase('SCATTER_CHECK', { scatterCount: result.scatterCount });
      await delay(90 * factor, signal);
      if (signal.cancelled) return;

      if (result.bonusTriggered && result.bonus) {
        setPhase('FREE_SPIN_TRIGGER', {
          scatterCount: result.bonus.scatterCount,
          freeSpins: result.bonus.freeSpins,
        });
        await delay(SCATTER_SILENCE_MS + ANTICIPATION_MS * factor, signal);
        if (signal.cancelled) return;
      }

      if (result.retriggered) {
        setPhase('RETRIGGER', { extra: result.retriggerSpins });
        await delay(520 * factor, signal);
        if (signal.cancelled) return;
      }

      if (
        result.winTier === 'BIG' ||
        result.winTier === 'MEGA' ||
        result.winTier === 'SENSATIONAL'
      ) {
        setPhase('BIG_WIN', {
          tier: result.winTier,
          amount: result.totalWin,
        });
        await delay(winCelebrationMs(result.winTier) * factor, signal);
        if (signal.cancelled) return;
      }

      if (result.isFreeSpin || result.remainingFreeSpins > 0) {
        setPhase('FREE_SPIN', { remaining: result.remainingFreeSpins });
        await delay(280 * factor, signal);
        if (signal.cancelled) return;
      }

      setPhase('ROUND_END', { result });
      await delay(ROUND_END_HOLD_MS * factor, signal);
      if (signal.cancelled) return;
      setPhase('READY');
    },
  };
}
