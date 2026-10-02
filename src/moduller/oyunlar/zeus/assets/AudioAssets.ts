/**
 * Zeus audio registry — isimler Olympus temalı; kaynak dosyalar
 * assets/zeus/audio altında alias (aynı wav, Zeus pack yolu).
 * Yeni özel ses eklendiğinde yalnızca bu dosya güncellenir.
 */

export type ZeusAudioChannel =
  | 'MUSIC'
  | 'AMBIENCE'
  | 'SFX'
  | 'UI'
  | 'WIN'
  | 'CHARACTER';

export type ZeusSfxEntry = {
  source: number | null;
  channel: ZeusAudioChannel;
};

/**
 * Pack kökü: assets/zeus/audio → şu an realm-of-storms wav'larına yönlendirir.
 * Fiziksel kopya yerine require alias; Metro aynı asset'i tek yükler.
 */
const pack = {
  gameOpen: require('../../../../../assets/realm-of-storms/audio/game_open.wav') as number,
  ambientWind: require('../../../../../assets/realm-of-storms/audio/ambient_wind.wav') as number,
  backgroundMusic: require('../../../../../assets/realm-of-storms/audio/background_music.wav') as number,
  bonusMusic: require('../../../../../assets/realm-of-storms/audio/bonus_music.wav') as number,
  spinPress: require('../../../../../assets/realm-of-storms/audio/spin_press.wav') as number,
  symbolsFalling: require('../../../../../assets/realm-of-storms/audio/symbols_falling.wav') as number,
  crystalLand: require('../../../../../assets/realm-of-storms/audio/crystal_land.wav') as number,
  symbolMatch: require('../../../../../assets/realm-of-storms/audio/symbol_match.wav') as number,
  symbolDestroy: require('../../../../../assets/realm-of-storms/audio/symbol_destroy.wav') as number,
  cascadeStart: require('../../../../../assets/realm-of-storms/audio/cascade_start.wav') as number,
  multiplierSpawn: require('../../../../../assets/realm-of-storms/audio/multiplier_spawn.wav') as number,
  multiplierSmall: require('../../../../../assets/realm-of-storms/audio/multiplier_small.wav') as number,
  multiplierMedium: require('../../../../../assets/realm-of-storms/audio/multiplier_medium.wav') as number,
  multiplierLarge: require('../../../../../assets/realm-of-storms/audio/multiplier_large.wav') as number,
  multiplierCollect: require('../../../../../assets/realm-of-storms/audio/multiplier_collect.wav') as number,
  lightning: require('../../../../../assets/realm-of-storms/audio/lightning.wav') as number,
  characterCast: require('../../../../../assets/realm-of-storms/audio/character_cast.wav') as number,
  scatterLand: require('../../../../../assets/realm-of-storms/audio/scatter_land.wav') as number,
  anticipation: require('../../../../../assets/realm-of-storms/audio/scatter_anticipation.wav') as number,
  bonusTrigger: require('../../../../../assets/realm-of-storms/audio/bonus_trigger.wav') as number,
  freeSpinStart: require('../../../../../assets/realm-of-storms/audio/free_spin_start.wav') as number,
  retrigger: require('../../../../../assets/realm-of-storms/audio/retrigger.wav') as number,
  normalWin: require('../../../../../assets/realm-of-storms/audio/normal_win.wav') as number,
  bigWin: require('../../../../../assets/realm-of-storms/audio/big_win.wav') as number,
  megaWin: require('../../../../../assets/realm-of-storms/audio/mega_win.wav') as number,
  legendaryWin: require('../../../../../assets/realm-of-storms/audio/legendary_win.wav') as number,
  countUp: require('../../../../../assets/realm-of-storms/audio/count_up.wav') as number,
  countUpEnd: require('../../../../../assets/realm-of-storms/audio/count_up_end.wav') as number,
};

/** Zeus event → asset; GameAudioManager hâlâ Kaskad isimleri kullanır — ZeusAudio facade bridge. */
export const ZeusAudioPack = {
  olympus_open: { source: pack.gameOpen, channel: 'UI' as const },
  olympus_ambient: { source: pack.ambientWind, channel: 'AMBIENCE' as const },
  olympus_music: { source: pack.backgroundMusic, channel: 'MUSIC' as const },
  olympus_bonus_music: { source: pack.bonusMusic, channel: 'MUSIC' as const },
  olympus_spin: { source: pack.spinPress, channel: 'UI' as const },
  olympus_fall: { source: pack.symbolsFalling, channel: 'SFX' as const },
  olympus_land: { source: pack.crystalLand, channel: 'SFX' as const },
  olympus_match: { source: pack.symbolMatch, channel: 'SFX' as const },
  olympus_destroy: { source: pack.symbolDestroy, channel: 'SFX' as const },
  olympus_cascade: { source: pack.cascadeStart, channel: 'SFX' as const },
  olympus_orb: { source: pack.multiplierSpawn, channel: 'SFX' as const },
  olympus_orb_small: { source: pack.multiplierSmall, channel: 'SFX' as const },
  olympus_orb_medium: { source: pack.multiplierMedium, channel: 'SFX' as const },
  olympus_orb_large: { source: pack.multiplierLarge, channel: 'SFX' as const },
  olympus_orb_collect: { source: pack.multiplierCollect, channel: 'SFX' as const },
  olympus_bolt: { source: pack.lightning, channel: 'CHARACTER' as const },
  olympus_cast: { source: pack.characterCast, channel: 'CHARACTER' as const },
  olympus_scatter: { source: pack.scatterLand, channel: 'SFX' as const },
  olympus_anticipation: { source: pack.anticipation, channel: 'SFX' as const },
  olympus_bonus: { source: pack.bonusTrigger, channel: 'WIN' as const },
  olympus_free_spin: { source: pack.freeSpinStart, channel: 'SFX' as const },
  olympus_retrigger: { source: pack.retrigger, channel: 'WIN' as const },
  olympus_win: { source: pack.normalWin, channel: 'WIN' as const },
  olympus_big_win: { source: pack.bigWin, channel: 'WIN' as const },
  olympus_mega_win: { source: pack.megaWin, channel: 'WIN' as const },
  olympus_legendary: { source: pack.legendaryWin, channel: 'WIN' as const },
  olympus_count: { source: pack.countUp, channel: 'WIN' as const },
  olympus_count_end: { source: pack.countUpEnd, channel: 'WIN' as const },
} satisfies Record<string, ZeusSfxEntry>;
