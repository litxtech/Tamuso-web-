import { useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { useSound } from './useSound';

export const useCoins = () => {
  const player = useGameStore((s) => s.player);
  const updateCoins = useGameStore((s) => s.updateCoins);
  const updateGems = useGameStore((s) => s.updateGems);
  const updateEnergy = useGameStore((s) => s.updateEnergy);
  const addSpins = useGameStore((s) => s.addSpins);
  const claimDailyBonus = useGameStore((s) => s.claimDailyBonus);
  const { play } = useSound();
  const levelRef = useRef(player.level);

  const checkDailyBonus = useCallback(() => {
    return player.lastDailyBonus !== new Date().toDateString();
  }, [player.lastDailyBonus]);

  const handleClaimDailyBonus = useCallback(() => {
    const success = claimDailyBonus();
    if (success) play('coinWin');
    return success;
  }, [claimDailyBonus, play]);

  const watchAdForCoins = useCallback(async () => {
    return new Promise<{ success: true; coins: number; spins: number }>((resolve) => {
      window.setTimeout(() => {
        updateCoins(2500);
        addSpins(5);
        play('coinWin');
        resolve({ success: true, coins: 2500, spins: 5 });
      }, 1500);
    });
  }, [updateCoins, addSpins, play]);

  const watchAdForEnergy = useCallback(async () => {
    return new Promise<{ success: true; energy: number }>((resolve) => {
      window.setTimeout(() => {
        updateEnergy(5);
        play('coinWin');
        resolve({ success: true, energy: 5 });
      }, 1500);
    });
  }, [updateEnergy, play]);

  const spendCoins = useCallback(
    (amount: number): boolean => {
      if (player.coins < amount) {
        play('error');
        return false;
      }
      updateCoins(-amount);
      play('click');
      return true;
    },
    [player.coins, updateCoins, play],
  );

  const spendGems = useCallback(
    (amount: number): boolean => {
      if (player.gems < amount) {
        play('error');
        return false;
      }
      updateGems(-amount);
      play('click');
      return true;
    },
    [player.gems, updateGems, play],
  );

  useEffect(() => {
    if (player.level > levelRef.current) play('levelUp');
    levelRef.current = player.level;
  }, [player.level, play]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const state = useGameStore.getState();
      if (state.player.energy < 10) updateEnergy(1);
    }, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [updateEnergy]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const state = useGameStore.getState();
      if (state.player.spins < 50) addSpins(1);
    }, 10 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [addSpins]);

  return {
    coins: player.coins,
    gems: player.gems,
    energy: player.energy,
    spins: player.spins,
    checkDailyBonus,
    claimDailyBonus: handleClaimDailyBonus,
    watchAdForCoins,
    watchAdForEnergy,
    spendCoins,
    spendGems,
  };
};
