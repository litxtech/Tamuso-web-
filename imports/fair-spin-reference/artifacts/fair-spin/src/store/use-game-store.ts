import { create, type StateCreator } from 'zustand';
import { generateClientSeed } from '@/lib/utils';
import { audioManager } from '@/lib/audio';

interface GameState {
  balance: number;
  clientSeed: string;
  soundEnabled: boolean;
  hasInteracted: boolean;
  updateBalance: (amount: number) => void;
  regenerateClientSeed: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  registerInteraction: () => void;
}

const storeCreator: StateCreator<GameState> = (set, get) => ({
  balance: 10000,
  clientSeed: generateClientSeed(),
  soundEnabled: false,
  hasInteracted: false,
  
  updateBalance: (amount: number) => set((state) => ({ balance: state.balance + amount })),
  
  regenerateClientSeed: () => set({ clientSeed: generateClientSeed() }),
  
  setSoundEnabled: (enabled: boolean) => {
    audioManager.setEnabled(enabled);
    set({ soundEnabled: enabled });
  },

  registerInteraction: () => {
    const { hasInteracted, setSoundEnabled } = get();
    if (!hasInteracted) {
      set({ hasInteracted: true });
      setSoundEnabled(true);
    }
  }
});

export const useGameStore = create<GameState>(storeCreator);
