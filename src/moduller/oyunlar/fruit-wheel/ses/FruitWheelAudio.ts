/**
 * Fruit Wheel ses — expo-audio.
 * Fair Spin / Realm asset'leri yeniden kullanılır; eksik dosya oyunu durdurmaz.
 */

import { createAudioPlayer, preload } from 'expo-audio';

type Cue =
  | 'round-open'
  | 'selection-add'
  | 'selection-remove'
  | 'selection-confirm'
  | 'countdown'
  | 'lock'
  | 'wheel-start'
  | 'pointer-tick'
  | 'wheel-stop'
  | 'win'
  | 'lose'
  | 'error';

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

const SOURCES: Record<Cue, number> = {
  'round-open': require('../../../../../assets/realm-of-storms/audio/game_open.wav'),
  'selection-add': require('../../../../../assets/realm-of-storms/audio/ui_click.wav'),
  'selection-remove': require('../../../../../assets/realm-of-storms/audio/ui_click.wav'),
  'selection-confirm': require('../../../../../assets/realm-of-storms/audio/spin_press.wav'),
  countdown: require('../../../../../assets/oyunlar/fair-spin/audio/wheel-tick.mp3'),
  lock: require('../../../../../assets/realm-of-storms/audio/scatter_anticipation.wav'),
  'wheel-start': require('../../../../../assets/oyunlar/fair-spin/audio/wheel-spin.mp3'),
  'pointer-tick': require('../../../../../assets/oyunlar/fair-spin/audio/wheel-tick.mp3'),
  'wheel-stop': require('../../../../../assets/realm-of-storms/audio/crystal_land.wav'),
  win: require('../../../../../assets/realm-of-storms/audio/mega_win.wav'),
  lose: require('../../../../../assets/realm-of-storms/audio/ui_click.wav'),
  error: require('../../../../../assets/realm-of-storms/audio/error.wav'),
};

const VOLUMES: Partial<Record<Cue, number>> = {
  'pointer-tick': 0.35,
  countdown: 0.55,
  'wheel-start': 0.8,
  win: 0.95,
  lose: 0.25,
  'selection-add': 0.45,
  'selection-remove': 0.3,
  'wheel-stop': 0.55,
};

let enabled = true;
let warmed = false;
const players = new Map<Cue, PlayerLike>();
let lastTickAt = 0;

function safePlay(p: PlayerLike | null | undefined, volume?: number) {
  if (!p || !enabled) return;
  try {
    if (typeof volume === 'number') p.volume = volume;
    p.seekTo?.(0);
    p.play();
  } catch {
    /* ignore */
  }
}

function safeStop(p: PlayerLike | null | undefined) {
  if (!p) return;
  try {
    p.pause?.();
    p.seekTo?.(0);
  } catch {
    /* ignore */
  }
}

export async function preloadFruitWheelAudio(): Promise<void> {
  if (warmed) return;
  try {
    await Promise.all(Object.values(SOURCES).map((src) => preload(src)));
  } catch {
    /* ignore */
  }
  (Object.keys(SOURCES) as Cue[]).forEach((cue) => {
    if (players.has(cue)) return;
    try {
      const p = createAudioPlayer(SOURCES[cue], PLAYER_OPTS) as unknown as PlayerLike;
      p.loop = false;
      p.volume = VOLUMES[cue] ?? 0.7;
      players.set(cue, p);
    } catch {
      /* ignore */
    }
  });
  warmed = true;
}

export function setFruitWheelSoundEnabled(on: boolean): void {
  enabled = on;
  if (!on) fruitWheelSesKapat();
}

export function isFruitWheelSoundEnabled(): boolean {
  return enabled;
}

export function fruitWheelSes(cue: Cue): void {
  if (!enabled) return;
  if (cue === 'pointer-tick' || cue === 'countdown') {
    const now = Date.now();
    if (now - lastTickAt < (cue === 'countdown' ? 180 : 240)) return;
    lastTickAt = now;
  }
  void preloadFruitWheelAudio().then(() => {
    if (cue === 'wheel-start') safeStop(players.get('pointer-tick'));
    if (cue === 'win') {
      safeStop(players.get('wheel-start'));
      safeStop(players.get('pointer-tick'));
      safeStop(players.get('lose'));
      // Önce kristal duruş, ardından sıcak mega win tonu
      safePlay(players.get('wheel-stop'), 0.45);
      setTimeout(() => safePlay(players.get('win'), VOLUMES.win), 120);
      return;
    }
    safePlay(players.get(cue), VOLUMES[cue]);
  });
}

export function fruitWheelSesKapat(): void {
  players.forEach((p) => safeStop(p));
}
