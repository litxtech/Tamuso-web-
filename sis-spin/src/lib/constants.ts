import type { Reward } from '../types';

export const COLORS = {
  primary: '#8a2be2',
  primaryDark: '#4b0082',
  primaryLight: '#da70d6',
  gold: '#ffd700',
  goldDark: '#ff8c00',
  bgDark: '#1a0033',
  bgMid: '#2e0854',
  success: '#34C759',
  danger: '#FF3B30',
  warning: '#FF9500',
};

export const REWARDS: Reward[] = [
  { id: 0, type: 'coin', label: '5K', value: 5000, color: '#ff6b6b', icon: '🪙', weight: 25 },
  { id: 1, type: 'coin', label: '10K', value: 10000, color: '#4ecdc4', icon: '🪙', weight: 20 },
  { id: 2, type: 'gem', label: '25💎', value: 25, color: '#ffe66d', icon: '💎', weight: 15 },
  { id: 3, type: 'energy', label: '5⚡', value: 5, color: '#ff9f43', icon: '⚡', weight: 15 },
  { id: 4, type: 'coin', label: '50K', value: 50000, color: '#a29bfe', icon: '🪙', weight: 10 },
  { id: 5, type: 'boost', label: '2x', value: 2, color: '#fd79a8', icon: '🚀', weight: 8 },
  { id: 6, type: 'gem', label: '100💎', value: 100, color: '#55efc4', icon: '💎', weight: 5 },
  { id: 7, type: 'coin', label: '100K', value: 100000, color: '#fdcb6e', icon: '🪙', weight: 2 },
];

export const SOUNDS = {
  spinStart: '/sounds/spin-start.mp3',
  spinLoop: '/sounds/spin-loop.mp3',
  spinStop: '/sounds/spin-stop.mp3',
  coinWin: '/sounds/coin-win.mp3',
  gemWin: '/sounds/gem-win.mp3',
  jackpot: '/sounds/jackpot.mp3',
  click: '/sounds/click.mp3',
  error: '/sounds/error.mp3',
  levelUp: '/sounds/level-up.mp3',
  backgroundMusic: '/sounds/background-music.mp3',
};

export const calculateLevel = (xp: number): number => {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};
