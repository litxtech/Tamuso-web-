import { useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { useSound } from './useSound';
import { REWARDS } from '../lib/constants';
import { boostAktifEt, carpaniTuket } from '../lib/boost';
import { getRandomReward, getRewardAngle, calculateFinalRotation } from '../lib/random';
import { spinGecmisiniKaydet } from '../lib/supabase';
import type { Reward } from '../types';

const SPIN_MS = 4000;

function oduluUygula(reward: Reward, multiplier: number): number {
  const finalValue = reward.value * multiplier;
  const store = useGameStore.getState();
  switch (reward.type) {
    case 'coin':
      store.updateCoins(finalValue);
      carpaniTuket();
      break;
    case 'gem':
      store.updateGems(finalValue);
      carpaniTuket();
      break;
    case 'energy':
      store.updateEnergy(finalValue);
      carpaniTuket();
      break;
    case 'boost':
    case 'multiplier':
      boostAktifEt(finalValue);
      break;
    default:
      break;
  }
  return finalValue;
}

export const useWheel = () => {
  const isSpinning = useGameStore((s) => s.isSpinning);
  const currentRotation = useGameStore((s) => s.currentRotation);
  const selectedReward = useGameStore((s) => s.selectedReward);
  const { play, stop, playRewardSound } = useSound();

  const spin = useCallback(() => {
    const state = useGameStore.getState();
    if (state.isSpinning) return { success: false as const, error: 'Zaten dönüyor' };
    if (state.player.spins <= 0) {
      play('error');
      return { success: false as const, error: 'Çevirme hakkınız bitti!' };
    }

    const canSpin = state.useSpin();
    if (!canSpin) return { success: false as const, error: 'Yetersiz hak' };

    const multiplier = useGameStore.getState().player.multiplier;
    const reward = getRandomReward(REWARDS);
    const targetAngle = getRewardAngle(reward.id, REWARDS.length);
    const fullTurns = 5 + Math.floor(Math.random() * 3);
    const finalRotation = calculateFinalRotation(
      useGameStore.getState().currentRotation,
      targetAngle,
      fullTurns,
    );

    state.setSpinning(true);
    state.setRotation(finalRotation);
    play('spinStart');
    window.setTimeout(() => play('spinLoop'), 500);

    window.setTimeout(() => {
      stop('spinLoop');
      play('spinStop');
      const finalValue = oduluUygula(reward, multiplier);
      window.setTimeout(() => playRewardSound(reward.type, reward.value), 300);
      useGameStore.getState().setSelectedReward(reward);
      useGameStore.getState().setSpinning(false);
      void spinGecmisiniKaydet({
        player_id: state.player.id,
        reward_type: reward.type,
        reward_value: reward.value,
        multiplier,
        final_value: finalValue,
      });
    }, SPIN_MS);

    return { success: true as const, reward };
  }, [play, stop, playRewardSound]);

  return { spin, isSpinning, currentRotation, selectedReward };
};
