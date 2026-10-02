/**
 * Ses dosyası yoksa oyun susar; çökmez.
 * Dosyalar assets/oyunlar/fruit-wheel/audio altına eklenince bağlanır.
 */

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
  | 'error';

export function fruitWheelSes(_cue: Cue): void {
  /* Asset paketi henüz yok. Eksik dosya oyunu durdurmaz. */
}

export function fruitWheelSesKapat(): void {
  /* tutulan oynatıcı yok */
}
