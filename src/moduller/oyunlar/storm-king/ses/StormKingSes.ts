/**
 * Fırtına Kralı, Kozmik Kaskad / Zeus ile aynı Realm of Storms ses kanalını kullanır.
 * Yeni dosya yok; LiveKit oturumu keepAudioSessionActive ile açık kalır.
 */

import {
  beginKaskadAudioSession,
  loadKaskadAudioSettings,
  playKaskadSfx,
  preloadKaskadAudio,
  saveKaskadAudioSettings,
  setKaskadVoiceDuck,
  startKaskadMusic,
  stopAllKaskadAudio,
  stopKaskadMusic,
} from '../../kaskad/ses/GameAudioManager';

export type StormKingCue = 'spin' | 'land' | 'win' | 'explode' | 'multiplier' | 'big-win';

const COOLDOWN_MS: Partial<Record<StormKingCue, number>> = {
  land: 90,
  explode: 140,
  multiplier: 160,
};

const lastAt = new Map<StormKingCue, number>();

export function playStormKingCue(cue: StormKingCue): void {
  const now = Date.now();
  const wait = COOLDOWN_MS[cue] ?? 0;
  if (wait > 0 && now - (lastAt.get(cue) ?? 0) < wait) return;
  lastAt.set(cue, now);

  if (cue === 'spin') {
    void playKaskadSfx('spin_press');
    void playKaskadSfx('symbols_falling');
    return;
  }
  if (cue === 'land') {
    void playKaskadSfx('symbol_land');
    return;
  }
  if (cue === 'explode') {
    void playKaskadSfx('symbol_destroy');
    void playKaskadSfx('lightning');
    return;
  }
  if (cue === 'multiplier') {
    void playKaskadSfx('multiplier_collect');
    return;
  }
  if (cue === 'big-win') {
    void playKaskadSfx('big_win');
    return;
  }
  void playKaskadSfx('normal_win');
}

export function startStormKingAudio(voiceDuck: boolean): void {
  beginKaskadAudioSession();
  setKaskadVoiceDuck(voiceDuck);
  void preloadKaskadAudio();
  void playKaskadSfx('game_open');
  void startKaskadMusic(false);
}

export function setStormKingVoiceDuck(active: boolean): void {
  setKaskadVoiceDuck(active);
}

export async function setStormKingMusic(on: boolean): Promise<boolean> {
  await loadKaskadAudioSettings();
  await saveKaskadAudioSettings({ music: on });
  if (on) await startKaskadMusic(false);
  else stopKaskadMusic();
  return on;
}

export function stopStormKingAudio(): void {
  stopAllKaskadAudio();
}
