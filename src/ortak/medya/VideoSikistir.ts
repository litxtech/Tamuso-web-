import { Platform } from 'react-native';
import i18n from '../../i18n';
import {
  VIDEO_ATLA_MAX_BYTES,
  VIDEO_ATLA_MAX_MBPS,
  VIDEO_HEDEF_MAX_EDGE,
  VIDEO_MIN_MB_FOR_COMPRESS,
} from './VideoPaylasimSabitleri';

export type VideoSikistirSonuc =
  | {
      ok: true;
      uri: string;
      compressed: boolean;
      mime: 'video/mp4';
      skipped?: boolean;
    }
  | { ok: false; hata: string; uri: string };

type Opts = {
  /** 0..1 */
  onProgress?: (pct: number) => void;
  maxEdge?: number;
  /**
   * true (varsayılan): zaten ≤1080 ve makul boyuttaysa sıkıştırmayı atla.
   */
  hizliAtla?: boolean;
  /** Biliniyorsa atlama kararı daha isabetli (bitrate hesabı). */
  durationMs?: number | null;
};

let nativeUyariLoglandi = false;

/** Editörde önceden başlatılan sıkıştırmalar — yayın anında bekleme azalır */
const onIsitMap = new Map<string, Promise<VideoSikistirSonuc>>();

async function gercekYolAl(
  uri: string,
  getRealPath: (u: string, t: 'video') => Promise<string>,
): Promise<string> {
  try {
    if (
      !uri.startsWith('file://') &&
      !uri.startsWith('content://') &&
      !uri.startsWith('ph://')
    ) {
      return uri;
    }
    const real = await getRealPath(uri, 'video');
    return typeof real === 'string' && real.trim() ? real.trim() : uri;
  } catch {
    return uri;
  }
}

function bitrateMbps(bayt: number, durationMs?: number | null): number | null {
  const sn = Number(durationMs ?? 0) / 1000;
  if (!(bayt > 0) || !(sn > 0.25)) return null;
  return (bayt * 8) / sn / 1_000_000;
}

async function zatenHazirMi(
  uri: string,
  maxEdge: number,
  durationMs: number | null | undefined,
  getVideoMetaData: (p: string) => Promise<{
    width?: number;
    height?: number;
    size?: number;
    duration?: number;
  }>,
  getFileSize: (p: string) => Promise<string>,
): Promise<boolean> {
  try {
    const meta = await getVideoMetaData(uri);
    const w = Number(meta?.width ?? 0);
    const h = Number(meta?.height ?? 0);
    const uzun = Math.max(w, h);

    let bayt = Number(meta?.size ?? 0);
    if (!(bayt > 0)) {
      const s = await getFileSize(uri);
      bayt = Number(s) || 0;
    }
    if (!(bayt > 0)) return false;

    let sureMs = durationMs;
    if (!(Number(sureMs) > 0) && Number(meta?.duration) > 0) {
      const d = Number(meta!.duration);
      sureMs = d > 1000 ? d : d * 1000;
    }

    const mbps = bitrateMbps(bayt, sureMs);

    // 4K / büyük kenar → sıkıştır
    if (uzun > maxEdge) return false;

    // Çözünürlük bilinmiyor: makul boyut/bitrate ise atla (hız)
    if (!(uzun > 0)) {
      if (mbps != null && mbps <= VIDEO_ATLA_MAX_MBPS) return true;
      return bayt <= VIDEO_ATLA_MAX_BYTES;
    }

    if (mbps != null && mbps <= VIDEO_ATLA_MAX_MBPS) return true;
    return bayt <= VIDEO_ATLA_MAX_BYTES;
  } catch {
    return false;
  }
}

async function sikistirIc(
  kaynak: string,
  opts?: Opts,
): Promise<VideoSikistirSonuc> {
  try {
    const mod = await import('react-native-compressor');
    const { Video, getRealPath, getVideoMetaData, getFileSize } = mod;
    const maxEdge = opts?.maxEdge ?? VIDEO_HEDEF_MAX_EDGE;
    const yol = await gercekYolAl(kaynak, getRealPath);

    if (opts?.hizliAtla !== false) {
      const atla = await zatenHazirMi(
        yol,
        maxEdge,
        opts?.durationMs,
        getVideoMetaData,
        getFileSize,
      );
      if (atla) {
        opts?.onProgress?.(1);
        return {
          ok: true,
          uri: yol,
          compressed: false,
          mime: 'video/mp4',
          skipped: true,
        };
      }
    }

    // Arka planda HW encode — kullanıcı başka ekrana geçse de devam
    try {
      await Video.activateBackgroundTask();
    } catch {
      /* opsiyonel API */
    }

    try {
      const out = await Video.compress(
        yol,
        {
          // auto = native HW (bitrate yok — auto’da işe yaramaz, yavaşlatır)
          compressionMethod: 'auto',
          maxSize: maxEdge,
          minimumFileSizeForCompress: VIDEO_MIN_MB_FOR_COMPRESS,
          progressDivider: 5,
        },
        (p) => {
          if (typeof p === 'number' && opts?.onProgress) {
            opts.onProgress(Math.max(0, Math.min(1, p)));
          }
        },
      );
      const sonucUri =
        typeof out === 'string' && out.trim() ? out.trim() : yol;
      return {
        ok: true,
        uri: sonucUri,
        compressed: sonucUri !== yol && sonucUri !== kaynak,
        mime: 'video/mp4',
      };
    } finally {
      try {
        await Video.deactivateBackgroundTask();
      } catch {
        /* */
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e ?? '');
    if (
      !nativeUyariLoglandi &&
      /native module|TurboModule|Nitro|Cannot find|not linked/i.test(msg)
    ) {
      nativeUyariLoglandi = true;
      console.warn(
        '[VideoSikistir] Native compressor yok — EAS rebuild gerekir. Orijinal video kullanılacak.',
      );
    }
    return {
      ok: true,
      uri: kaynak,
      compressed: false,
      mime: 'video/mp4',
      skipped: true,
    };
  }
}

/**
 * Editör açılır açılmaz sıkıştırmayı arka planda başlat.
 * Yayın anında aynı URI için sonuç hazır olur.
 */
export function Video1080OnIsit(
  uri: string,
  opts?: Pick<Opts, 'durationMs' | 'maxEdge'>,
): void {
  if (Platform.OS === 'web') return;
  const kaynak = (uri ?? '').trim();
  if (!kaynak || onIsitMap.has(kaynak)) return;
  const p = sikistirIc(kaynak, {
    durationMs: opts?.durationMs,
    maxEdge: opts?.maxEdge,
  }).catch(
    (): VideoSikistirSonuc => ({
      ok: true,
      uri: kaynak,
      compressed: false,
      mime: 'video/mp4',
      skipped: true,
    }),
  );
  onIsitMap.set(kaynak, p);
}

/** Prefetch önbelleğini temizle (URI değişti / iptal). */
export function Video1080OnIsitIptal(uri?: string): void {
  if (!uri) {
    onIsitMap.clear();
    return;
  }
  onIsitMap.delete(uri.trim());
}

/**
 * Profesyonel / hızlı 1080p sıkıştırma.
 * - HW `auto` encoder
 * - ≤1080 + makul bitrate → atla (anında)
 * - Editör prefetch varsa sonucu yeniden kullan
 */
export async function Video1080eSikistir(
  uri: string,
  opts?: Opts,
): Promise<VideoSikistirSonuc> {
  const kaynak = (uri ?? '').trim();
  if (!kaynak) {
    return { ok: false, hata: i18n.t('medyaYukle.dosyaBos'), uri: kaynak };
  }

  if (Platform.OS === 'web') {
    return {
      ok: true,
      uri: kaynak,
      compressed: false,
      mime: 'video/mp4',
      skipped: true,
    };
  }

  const hazir = onIsitMap.get(kaynak);
  if (hazir) {
    const r = await hazir;
    opts?.onProgress?.(1);
    // Tek kullanımlık — trim sonrası yeni URI gelir
    onIsitMap.delete(kaynak);
    return r;
  }

  const p = sikistirIc(kaynak, opts);
  onIsitMap.set(kaynak, p);
  try {
    return await p;
  } finally {
    onIsitMap.delete(kaynak);
  }
}
