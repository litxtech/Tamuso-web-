import { Platform } from 'react-native';

/**
 * Expo CameraView ↔ LiveKit WebRTC kamera kilidi.
 * Aynı anda tek sahibi olabilir; stüdyo önizleme kapanmadan
 * setCameraEnabled / createLocalVideoTrack çoğu cihazda fail olur.
 */

let tutuluyor = false;
const bekleyenler = new Set<() => void>();

function platformSettleMs(): number {
  // Android kamera serbest bırakması genelde daha yavaş
  return Platform.OS === 'android' ? 900 : 450;
}

export function KameraOnizlemeTutuldu(): void {
  tutuluyor = true;
}

export function KameraOnizlemeBirakildi(): void {
  tutuluyor = false;
  for (const fn of [...bekleyenler]) {
    bekleyenler.delete(fn);
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}

export function KameraOnizlemeTutuluyorMu(): boolean {
  return tutuluyor;
}

/**
 * Stüdyo CameraView kapandıktan sonra cihazda kamera serbest kalana kadar bekle.
 * Timeout olsa bile settle gecikmesi uygular (unmount async olabilir).
 */
export async function KameraOnizlemeSerbestBirak(
  timeoutMs = 2_500,
): Promise<void> {
  if (tutuluyor) {
    await Promise.race([
      new Promise<void>((resolve) => {
        const done = () => {
          bekleyenler.delete(done);
          resolve();
        };
        bekleyenler.add(done);
      }),
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  }
  await new Promise((r) => setTimeout(r, platformSettleMs()));
}
