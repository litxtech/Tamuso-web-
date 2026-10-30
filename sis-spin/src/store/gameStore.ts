import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameStore, PlayerState } from '../types';
import { calculateLevel } from '../lib/constants';

const initialPlayer: PlayerState = {
  id: '',
  username: 'Oyuncu',
  coins: 8400,
  gems: 0,
  energy: 10,
  spins: 22,
  multiplier: 1,
  level: 1,
  xp: 0,
  lastSpinTime: 0,
  dailySpinsUsed: 0,
  lastDailyBonus: '',
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      player: initialPlayer,
      isSpinning: false,
      currentRotation: 0,
      selectedReward: null,
      soundEnabled: true,
      musicEnabled: true,

      setPlayer: (player) => set({ player }),

      updateCoins: (amount) =>
        set((state) => {
          const newCoins = Math.max(0, state.player.coins + amount);
          const newXp = state.player.xp + Math.abs(amount) / 100;
          const newLevel = calculateLevel(newXp);
          return {
            player: { ...state.player, coins: newCoins, xp: newXp, level: newLevel },
          };
        }),

      updateGems: (amount) =>
        set((state) => ({
          player: { ...state.player, gems: Math.max(0, state.player.gems + amount) },
        })),

      updateEnergy: (amount) =>
        set((state) => ({
          player: { ...state.player, energy: Math.max(0, state.player.energy + amount) },
        })),

      useSpin: () => {
        const state = get();
        if (state.player.spins <= 0 || state.isSpinning) return false;
        set({
          isSpinning: true,
          player: {
            ...state.player,
            spins: state.player.spins - 1,
            lastSpinTime: Date.now(),
            dailySpinsUsed: state.player.dailySpinsUsed + 1,
          },
        });
        return true;
      },

      addSpins: (count) =>
        set((state) => ({
          player: { ...state.player, spins: state.player.spins + count },
        })),

      setSpinning: (spinning) => set({ isSpinning: spinning }),
      setRotation: (rotation) => set({ currentRotation: rotation }),
      setSelectedReward: (reward) => set({ selectedReward: reward }),

      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      toggleMusic: () => set((state) => ({ musicEnabled: !state.musicEnabled })),

      setMultiplier: (multiplier) =>
        set((state) => ({ player: { ...state.player, multiplier } })),

      resetMultiplier: () =>
        set((state) => ({ player: { ...state.player, multiplier: 1 } })),

      claimDailyBonus: () => {
        const state = get();
        const today = new Date().toDateString();
        if (state.player.lastDailyBonus === today) return false;
        set({
          player: {
            ...state.player,
            coins: state.player.coins + 5000,
            spins: state.player.spins + 10,
            lastDailyBonus: today,
          },
        });
        return true;
      },
    }),
    {
      name: 'sis-spin-storage',
      partialize: (state) => ({
        player: state.player,
        soundEnabled: state.soundEnabled,
        musicEnabled: state.musicEnabled,
      }),
    },
  ),
);
