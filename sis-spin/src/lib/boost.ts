import { useGameStore } from '../store/gameStore';

let boostTimer: ReturnType<typeof setTimeout> | undefined;

export function boostZamanlayicisiniKapat(): void {
  if (boostTimer) clearTimeout(boostTimer);
  boostTimer = undefined;
}

export function boostAktifEt(multiplier: number, sureMs = 5 * 60 * 1000): void {
  useGameStore.getState().setMultiplier(multiplier);
  boostZamanlayicisiniKapat();
  boostTimer = setTimeout(() => {
    if (useGameStore.getState().player.multiplier === multiplier) {
      useGameStore.getState().resetMultiplier();
    }
  }, sureMs);
}

export function carpaniTuket(): void {
  boostZamanlayicisiniKapat();
  useGameStore.getState().resetMultiplier();
}
