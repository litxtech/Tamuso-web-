import type {
  KillSwitchAnahtari,
  OzellikBayragiAnahtari,
} from './OzellikBayragiAnahtarlari';
import { CacheBayrakOku, CacheKillOku } from './OzellikBayrakCache';

/**
 * Sync UI gate — remote cache (yoksa yerel fallback).
 * App start'ta OzellikBayraklariniYukle() ile doldurulur.
 */
export function OzellikBayragiAktifMi(anahtar: OzellikBayragiAnahtari): boolean {
  return CacheBayrakOku(anahtar);
}

export function KillSwitchAktifMi(anahtar: KillSwitchAnahtari): boolean {
  return CacheKillOku(anahtar);
}
