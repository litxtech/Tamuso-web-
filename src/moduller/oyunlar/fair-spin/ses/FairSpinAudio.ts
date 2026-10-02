/**
 * Fair Spin ses — çark dönüşü + yüksek kazanç.
 * Ses yalnızca gerçek dönüş animasyonu başında çalar.
 */

import { createAudioPlayer, preload } from 'expo-audio';

const SPIN_SRC = require('../../../../../assets/oyunlar/fair-spin/audio/wheel-spin-synced.mp3');
const LIGHTNING_SRC = require('../../../../../assets/oyunlar/fair-spin/audio/high-win-lightning.mp3');

type PlayerLike = {
  volume: number;
  loop?: boolean;
  play: () => void;
  pause?: () => void;
  seekTo?: (sec: number) => void;
  remove?: () => void;
  release?: () => void;
};

const PLAYER_OPTS = { keepAudioSessionActive: true } as const;

let enabled = true;
let spinPlayer: PlayerLike | null = null;
let lightningPlayer: PlayerLike | null = null;
let warmed = false;

function safePlay(p: PlayerLike | null) {
  if (!p || !enabled) return;
  try {
    p.seekTo?.(0);
    p.play();
  } catch {
    /* ignore */
  }
}

function safeStop(p: PlayerLike | null) {
  if (!p) return;
  try {
    p.pause?.();
    p.seekTo?.(0);
  } catch {
    /* ignore */
  }
}

export async function preloadFairSpinAudio(): Promise<void> {
  if (warmed) return;
  try {
    await Promise.all([preload(SPIN_SRC), preload(LIGHTNING_SRC)]);
  } catch {
    /* ignore */
  }
  if (!spinPlayer) {
    try {
      spinPlayer = createAudioPlayer(SPIN_SRC, PLAYER_OPTS) as unknown as PlayerLike;
      spinPlayer.loop = false;
      spinPlayer.volume = 0.85;
    } catch {
      spinPlayer = null;
    }
  }
  if (!lightningPlayer) {
    try {
      lightningPlayer = createAudioPlayer(
        LIGHTNING_SRC,
        PLAYER_OPTS,
      ) as unknown as PlayerLike;
      lightningPlayer.loop = false;
      lightningPlayer.volume = 0.9;
    } catch {
      lightningPlayer = null;
    }
  }
  warmed = true;
}

export function setFairSpinSoundEnabled(on: boolean): void {
  enabled = on;
  if (!on) stopFairSpinAudio();
}

export function isFairSpinSoundEnabled(): boolean {
  return enabled;
}

export function playFairSpinWheel(): void {
  void preloadFairSpinAudio().then(() => safePlay(spinPlayer));
}

export function playFairSpinLightning(): void {
  void preloadFairSpinAudio().then(() => safePlay(lightningPlayer));
}

export function stopFairSpinAudio(): void {
  safeStop(spinPlayer);
  safeStop(lightningPlayer);
}
