export type RewardType = 'coin' | 'gem' | 'energy' | 'boost' | 'multiplier';

export interface Reward {
  id: number;
  type: RewardType;
  label: string;
  value: number;
  color: string;
  icon: string;
  weight: number;
}

export interface PlayerState {
  id: string;
  username: string;
  coins: number;
  gems: number;
  energy: number;
  spins: number;
  multiplier: number;
  level: number;
  xp: number;
  lastSpinTime: number;
  dailySpinsUsed: number;
  lastDailyBonus: string;
}

export interface GameStore {
  player: PlayerState;
  isSpinning: boolean;
  currentRotation: number;
  selectedReward: Reward | null;
  soundEnabled: boolean;
  musicEnabled: boolean;
  setPlayer: (p: PlayerState) => void;
  updateCoins: (n: number) => void;
  updateGems: (n: number) => void;
  updateEnergy: (n: number) => void;
  useSpin: () => boolean;
  addSpins: (n: number) => void;
  setSpinning: (s: boolean) => void;
  setRotation: (r: number) => void;
  setSelectedReward: (r: Reward | null) => void;
  toggleSound: () => void;
  toggleMusic: () => void;
  setMultiplier: (n: number) => void;
  resetMultiplier: () => void;
  claimDailyBonus: () => boolean;
}
