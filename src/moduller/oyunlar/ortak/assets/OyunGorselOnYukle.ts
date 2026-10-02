/**
 * Oyun görsel ön-yükleme — semboller önce (tahta açılır),
 * karakter / UI / arka plan arka planda tamamlanır.
 */

import { Asset } from 'expo-asset';
import type { ImageSourcePropType } from 'react-native';

export function oyunGorselModulIdleri(
  sources: ImageSourcePropType[],
): number[] {
  const out: number[] = [];
  for (const src of sources) {
    if (typeof src === 'number') out.push(src);
  }
  return out;
}

export async function oyunGorselleriniYukle(
  ids: number[],
  onChunk?: (done: number, total: number) => void,
  opts?: { wave?: number },
): Promise<void> {
  if (ids.length === 0) return;
  let done = 0;
  const total = ids.length;
  const WAVE = Math.max(1, Math.min(opts?.wave ?? 8, total));
  for (let i = 0; i < ids.length; i += WAVE) {
    const slice = ids.slice(i, i + WAVE);
    await Promise.all(
      slice.map(async (id) => {
        try {
          await Asset.fromModule(id).downloadAsync();
        } catch {
          /* tek asset hatası oyunu kilitlemesin */
        } finally {
          done += 1;
          onChunk?.(done, total);
        }
      }),
    );
  }
}
