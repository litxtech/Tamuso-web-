/**
 * Zeus ses — Olympus kanalı.
 * Asset path'leri ZeusAudioAssets üzerinden; şimdilik Olympus-temalı
 * realm-of-storms pack'ine map edilir (ileride assets/zeus/audio ile değiştirilebilir).
 */

import {
  beginKaskadAudioSession,
  playKaskadSfx,
  preloadKaskadAudio,
  setKaskadVoiceDuck,
  startKaskadCountUp,
  startKaskadMusic,
  stopAllKaskadAudio,
  stopKaskadCountUp,
  type KaskadAudioSettings,
} from '../../kaskad/ses/GameAudioManager';
import type { KaskadSfxName } from '../../kaskad/assets/GameAssets';
import { ZeusAudioPack } from '../assets/AudioAssets';

export type ZeusSfxName = KaskadSfxName;

/** Pack registry'yi bundle'a bağlar (ileride native Zeus wav path). */
void ZeusAudioPack;

export function preloadZeusAudio(): Promise<void> {
  return preloadKaskadAudio();
}

export function beginZeusAudioSession(): void {
  beginKaskadAudioSession();
}

export function playZeusSfx(name: ZeusSfxName): void {
  playKaskadSfx(name);
}

export function startZeusMusic(bonus = false): void {
  void startKaskadMusic(bonus);
}

export function startZeusCountUp(): void {
  startKaskadCountUp();
}

export function stopZeusCountUp(playEnd = false): void {
  stopKaskadCountUp(playEnd);
}

export function stopAllZeusAudio(): void {
  stopAllKaskadAudio();
}

export function setZeusVoiceDuck(active: boolean): void {
  setKaskadVoiceDuck(active);
}

export type { KaskadAudioSettings as ZeusAudioSettings };
