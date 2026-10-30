/**
 * Mikrofon aç / kapa — tek kısa ton.
 * setAudioModeAsync yok: LiveKit oturumunu bozmasın.
 */
import { createAudioPlayer } from 'expo-audio';

const SES = require('../../../../assets/sounds/mikrofon_kapat.wav');

const OPTS = {
  keepAudioSessionActive: true,
  updateInterval: 8000,
} as const;

type Calar = {
  volume: number;
  play: () => void;
  seekTo?: (s: number) => void;
};

let calar: Calar | null = null;

export function MikrofonUiSesiCal(_acik: boolean) {
  try {
    if (!calar) calar = createAudioPlayer(SES, OPTS) as Calar;
    calar.volume = 0.4;
    calar.seekTo?.(0);
    calar.play();
  } catch {
    /* sessiz */
  }
}
