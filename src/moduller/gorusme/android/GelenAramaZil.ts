/**
 * Gelen arama zil sesi — uygulama process canlıyken (ön plan / kısa arka plan).
 * App tamamen ölüyse sistem bildirimi kanal sesi çalar (Android arama kanalı).
 */
import { Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ARAMA_SESI = require('../../../../assets/sounds/gelen_arama.wav');

type PlayerLike = {
  play: () => void;
  pause?: () => void;
  remove?: () => void;
  loop?: boolean;
  volume?: number;
};

let player: PlayerLike | null = null;
let caliyor = false;

export function GelenAramaZilCalıyorMu(): boolean {
  return caliyor;
}

export async function GelenAramaZilBaslat(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (caliyor) return;

  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers',
      allowsRecording: false,
    } as never);
  } catch {
    /* mode opsiyonel */
  }

  try {
    GelenAramaZilDurdur();
    const p = createAudioPlayer(ARAMA_SESI, {
      keepAudioSessionActive: true,
    } as never) as unknown as PlayerLike;
    try {
      p.loop = true;
    } catch {
      /* bazı sürümlerde setter yok */
    }
    try {
      p.volume = 1;
    } catch {
      /* ignore */
    }
    player = p;
    p.play();
    caliyor = true;
  } catch (e) {
    console.warn(
      '[GelenAramaZil]',
      e instanceof Error ? e.message : e,
    );
  }
}

export function GelenAramaZilDurdur(): void {
  caliyor = false;
  const p = player;
  player = null;
  if (!p) return;
  try {
    p.pause?.();
  } catch {
    /* ignore */
  }
  try {
    p.remove?.();
  } catch {
    /* ignore */
  }
}
