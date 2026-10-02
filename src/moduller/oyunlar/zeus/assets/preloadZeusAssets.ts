/**
 * Zeus — semboller arka planda; tahta hemen açılır.
 * Ağır kapak/karakter decode oyunu kilitlemez.
 */

import type { ImageSourcePropType } from 'react-native';
import {
  oyunGorselleriniYukle,
  oyunGorselModulIdleri,
} from '../../ortak/assets/OyunGorselOnYukle';
import {
  BackgroundImages,
  CharacterImages,
  SymbolImages,
  UiImages,
} from './VisualAssets';

let visualCache: Promise<boolean> | null = null;
let visualsReady = false;
let visualsFailed = false;
let restCache: Promise<void> | null = null;

export function zeusVisualsCached(): boolean {
  return visualsReady;
}

export function zeusVisualsFailed(): boolean {
  return visualsFailed;
}

export function resetZeusVisualCache(): void {
  visualCache = null;
  visualsReady = false;
  visualsFailed = false;
  restCache = null;
}

export function warmZeusAssetsEarly(): void {
  void preloadZeusAssets();
}

function loadRestInBackground(): void {
  if (restCache) return;
  restCache = (async () => {
    await oyunGorselleriniYukle(
      oyunGorselModulIdleri([
        CharacterImages.zeusIdle,
        BackgroundImages.olympusSky,
      ]),
      undefined,
      { wave: 2 },
    );
    // Kapak / spin butonu en son — 2MB+; tahtayı etkilemesin
    await oyunGorselleriniYukle(
      oyunGorselModulIdleri([UiImages.cover, UiImages.spinButton]),
      undefined,
      { wave: 1 },
    );
  })().catch(() => undefined);
}

export async function preloadZeusAssets(
  onProgress?: (progress01: number) => void,
): Promise<boolean> {
  if (visualsReady) {
    onProgress?.(1);
    loadRestInBackground();
    return true;
  }
  if (!visualCache) {
    visualCache = (async () => {
      visualsFailed = false;
      const symbolIds = oyunGorselModulIdleri(
        Object.values(SymbolImages) as ImageSourcePropType[],
      );
      if (symbolIds.length < Object.keys(SymbolImages).length) {
        throw new Error('ZEUS_SYMBOL_MODULES_MISSING');
      }

      // 4'lü dalga — CPU'yu boğmadan hızlı
      await oyunGorselleriniYukle(
        symbolIds,
        (done, total) => {
          onProgress?.(done / Math.max(1, total));
        },
        { wave: 4 },
      );

      visualsReady = true;
      visualsFailed = false;
      onProgress?.(1);
      loadRestInBackground();
      return true;
    })().catch((err) => {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.error('[ZEUS_PRELOAD_FAILED]', err);
      }
      visualCache = null;
      visualsReady = false;
      visualsFailed = true;
      onProgress?.(1);
      return false;
    });
  }
  const ok = await visualCache;
  if (ok) onProgress?.(1);
  return ok;
}
