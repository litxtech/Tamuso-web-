/**
 * Cüzdan context — Auth'tan ayrı tutulur ki coin/diamond realtime
 * tüm useAuth() tüketicilerini re-render etmesin.
 */
import { createContext } from 'react';
import type { Wallet } from '../types/models';

export type WalletContextValue = {
  wallet: Wallet | null;
  refreshWallet: () => Promise<void>;
  patchWallet: (patch: Partial<Pick<Wallet, 'coins' | 'game_coins' | 'bonus_coins' | 'diamonds'>>) => void;
  adjustWallet: (delta: Partial<Pick<Wallet, 'coins' | 'game_coins' | 'bonus_coins' | 'diamonds'>>) => void;
};

export const WalletContext = createContext<WalletContextValue | null>(null);
