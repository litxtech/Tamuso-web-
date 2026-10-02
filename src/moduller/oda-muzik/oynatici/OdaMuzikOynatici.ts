/**
 * Oda müzik oynatıcı — ayrı MUSIC bus (LiveKit voice'tan bağımsız).
 * Position: server started_at + clock. Drift > 1.5s ise yumuşak seek.
 *
 * iOS: setAudioModeAsync ÇAĞIRMA — LiveKit AVAudioSession'ı bozar, konuşmalar
 * birbirine gitmez. keepAudioSessionActive + LiveKit mixWithOthers yeterli.
 * Oynatma sonrası MedyaSesOturumunuYenile ile voice oturumu toparlanır.
 */
import { Platform } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import type { MusicRuntimeConfig, RoomMusicSession } from '../islemler/OdaMuzikApi';

const PLAYER_OPTS = {
  keepAudioSessionActive: true,
  /** Konum okuması anlık; sık status olayına gerek yok — 500ms cihazı ısıtıyordu */
  updateInterval: 8000,
} as const;

function livekitSesToparla() {
  if (Platform.OS !== 'ios') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MedyaSesOturumunuYenile } = require('../../livekit/MedyaBaglantisi') as {
      MedyaSesOturumunuYenile: (zorla?: boolean) => void;
    };
    MedyaSesOturumunuYenile(true);
  } catch {
    /* ignore */
  }
}

type PlayerLike = {
  volume: number;
  playing?: boolean;
  currentTime?: number;
  duration?: number;
  loop?: boolean;
  play: () => void;
  pause?: () => void;
  seekTo?: (sec: number) => void;
  remove?: () => void;
  release?: () => void;
};

const DEFAULT_CFG: MusicRuntimeConfig = {
  default_normal_volume: 0.28,
  default_ducked_volume: 0.1,
  duck_attack_ms: 200,
  duck_hold_ms: 900,
  max_music_volume: 0.7,
};

let player: PlayerLike | null = null;
let currentUrl: string | null = null;
let generation = 0;
let targetVolume = DEFAULT_CFG.default_normal_volume;
let localGain = 1;
let duckGain = 1;
let fadeTimer: ReturnType<typeof setInterval> | null = null;
let bitisTimer: ReturnType<typeof setTimeout> | null = null;
let bitisDinleyici: (() => void) | null = null;
let bitisYakildi = false;
let bitisGen = -1;
let bitisDeneme = 0;
let cfg: MusicRuntimeConfig = { ...DEFAULT_CFG };

/** Parça doğal bitince bir kez — sıradaki veya kapatma oda ekranında. */
export function OdaMuzikBitisDinle(fn: () => void) {
  bitisDinleyici = fn;
  return () => {
    if (bitisDinleyici === fn) bitisDinleyici = null;
  };
}

function bitisIptal() {
  if (bitisTimer) clearTimeout(bitisTimer);
  bitisTimer = null;
}

/** Süre dolunca tek uyanış. Sürekli yoklama yok. */
function bitisPlanla(gen: number) {
  bitisIptal();
  if (gen !== generation) return;
  if (gen !== bitisGen) {
    bitisGen = gen;
    bitisYakildi = false;
    bitisDeneme = 0;
  }
  const p = player;
  if (!p) return;
  const sure = Number(p.duration ?? 0);
  const konum = Number(p.currentTime ?? 0);
  if (sure < 1) {
    bitisDeneme += 1;
    if (bitisDeneme > 8) return;
    bitisTimer = setTimeout(() => bitisPlanla(gen), 2000);
    return;
  }
  bitisDeneme = 0;
  if (konum >= sure - 0.45) {
    if (!bitisYakildi) {
      bitisYakildi = true;
      bitisDinleyici?.();
    }
    return;
  }
  const kalan = Math.max(700, (sure - konum - 0.2) * 1000);
  bitisTimer = setTimeout(() => bitisPlanla(gen), kalan);
}

export function OdaMuzikConfigAyarla(next: Partial<MusicRuntimeConfig> | null) {
  cfg = { ...DEFAULT_CFG, ...(next ?? {}) };
}

export function OdaMuzikLokalGain(g: number) {
  localGain = Math.min(1, Math.max(0, g));
  uygulaVolume();
}

export function OdaMuzikDuckGain(g: number) {
  duckGain = Math.min(1, Math.max(0, g));
  uygulaVolume();
}

function uygulaVolume() {
  if (!player) return;
  const v = Math.min(
    cfg.max_music_volume,
    targetVolume * localGain * duckGain,
  );
  try {
    player.volume = v;
  } catch {
    /* noop */
  }
}

function fadeTo(next: number, ms: number) {
  if (!player) {
    targetVolume = next;
    return;
  }
  if (fadeTimer) clearInterval(fadeTimer);
  const from = targetVolume;
  const steps = Math.max(4, Math.floor(ms / 40));
  let i = 0;
  fadeTimer = setInterval(() => {
    i += 1;
    targetVolume = from + (next - from) * (i / steps);
    uygulaVolume();
    if (i >= steps) {
      if (fadeTimer) clearInterval(fadeTimer);
      fadeTimer = null;
      targetVolume = next;
      uygulaVolume();
    }
  }, 40);
}

function serverPositionMs(session: RoomMusicSession): number {
  if (session.state === 'PAUSED') return Math.max(0, session.position_ms || 0);
  if (session.state !== 'PLAYING' || !session.started_at) return 0;
  const elapsed = Date.now() - new Date(session.started_at).getTime();
  return Math.max(0, elapsed);
}

export async function OdaMuzikSessionUygula(session: RoomMusicSession | null) {
  if (!session || session.state === 'STOPPED' || !session.track?.audio_url) {
    await OdaMuzikDurdur();
    return;
  }

  targetVolume = session.normal_volume || cfg.default_normal_volume;
  const url = session.track.audio_url;
  const gen = ++generation;

  if (currentUrl !== url || !player) {
    await OdaMuzikDurdur(false);
    if (gen !== generation) return;
    try {
      player = createAudioPlayer({ uri: url }, PLAYER_OPTS) as PlayerLike;
      currentUrl = url;
      player.loop = session.repeat_mode === 'one';
      uygulaVolume();
    } catch {
      player = null;
      currentUrl = null;
      return;
    }
  }

  const wantPos = serverPositionMs(session) / 1000;
  const cur = Number(player.currentTime ?? 0);
  if (Math.abs(cur - wantPos) > 1.5 && typeof player.seekTo === 'function') {
    try {
      player.seekTo(wantPos);
    } catch {
      /* noop */
    }
  }

  if (session.state === 'PLAYING') {
    fadeTo(session.normal_volume || cfg.default_normal_volume, 120);
    try {
      player.play();
    } catch {
      /* noop */
    }
    // LiveKit voice oturumunu koru (müzik play session'ı çalmasın)
    livekitSesToparla();
    if (session.repeat_mode !== 'one') bitisPlanla(gen);
    if (Platform.OS === 'ios') {
      setTimeout(() => {
        if (gen !== generation || !player) return;
        try {
          if (!player.playing) player.play();
          uygulaVolume();
        } catch {
          /* noop */
        }
        livekitSesToparla();
      }, 400);
    }
  } else if (session.state === 'PAUSED' || session.state === 'STOPPED') {
    bitisIptal();
    try {
      player.pause?.();
    } catch {
      /* noop */
    }
  }
}

export async function OdaMuzikDurdur(bumpGen = true) {
  if (bumpGen) generation += 1;
  bitisIptal();
  if (fadeTimer) {
    clearInterval(fadeTimer);
    fadeTimer = null;
  }
  const p = player;
  player = null;
  currentUrl = null;
  if (!p) return;
  try {
    p.pause?.();
  } catch {
    /* noop */
  }
  try {
    p.remove?.();
  } catch {
    /* noop */
  }
  try {
    p.release?.();
  } catch {
    /* noop */
  }
  livekitSesToparla();
}

export function OdaMuzikPozisyonMs(): number {
  if (!player) return 0;
  return Math.floor(Number(player.currentTime ?? 0) * 1000);
}

export function OdaMuzikCalıyorMu(): boolean {
  return !!player && !!currentUrl;
}

export function OdaMuzikDuckBaslat() {
  fadeTo(
    Math.min(targetVolume, cfg.default_ducked_volume),
    cfg.duck_attack_ms,
  );
  // duckGain path for absolute duck relative to session volume
  OdaMuzikDuckGain(cfg.default_ducked_volume / Math.max(cfg.default_normal_volume, 0.01));
}

export function OdaMuzikDuckBitir() {
  OdaMuzikDuckGain(1);
  fadeTo(targetVolume || cfg.default_normal_volume, cfg.duck_attack_ms + 100);
}

export function OdaMuzikDuckHoldMs() {
  return cfg.duck_hold_ms;
}
