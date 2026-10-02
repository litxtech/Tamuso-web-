/**
 * Realm of Storms — semboller önce decode; karakter/UI/bg oyunu kilitlemez.
 * Tahta, slot görselleri hazır olunca açılır.
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

let visualCache: Promise<void> | null = null;
let visualsReady = false;
let restCache: Promise<void> | null = null;

export function kaskadVisualsCached(): boolean {
  return visualsReady;
}

/** Oyun seçim modalı açılınca çağır — cold start’ı kısaltır. */
export function warmKaskadAssetsEarly(): void {
  void preloadKaskadAssets();
}

function loadRestInBackground(): void {
  if (restCache) return;
  restCache = oyunGorselleriniYukle(
    oyunGorselModulIdleri([
      CharacterImages.stormKeeper,
      UiImages.spinButton,
      BackgroundImages.stormSky,
    ]),
    undefined,
    { wave: 2 },
  ).catch(() => undefined);
}

export async function preloadKaskadAssets(
  onProgress?: (progress01: number) => void,
): Promise<void> {
  if (visualsReady) {
    onProgress?.(1);
    loadRestInBackground();
    return;
  }
  if (!visualCache) {
    visualCache = (async () => {
      const symbolIds = oyunGorselModulIdleri(
        Object.values(SymbolImages) as ImageSourcePropType[],
      );

      await oyunGorselleriniYukle(
        symbolIds,
        (done, total) => {
          onProgress?.(done / Math.max(1, total));
        },
        { wave: symbolIds.length },
      );
      visualsReady = true;
      onProgress?.(1);
      loadRestInBackground();
    })().catch(() => {
      visualCache = null;
      visualsReady = true;
      onProgress?.(1);
    });
  }
  await visualCache;
  onProgress?.(1);
}
