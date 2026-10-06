import i18n from '../../../i18n';
import * as FileSystem from 'expo-file-system/legacy';

export type HikayeVideoKirpSonuc =
  | { ok: true; uri: string; trimmed: boolean }
  | { ok: false; hata: string };

/** Yerel dosya boyutu (bayt). Ölçülemezse null. */
export async function HikayeDosyaBoyutuBayt(
  uri: string,
): Promise<number | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri, { size: true } as any);
    if (info.exists && typeof (info as { size?: number }).size === 'number') {
      return (info as { size: number }).size;
    }
  } catch {
    /* */
  }
  try {
    const bytes = await (await fetch(uri)).arrayBuffer();
    return bytes.byteLength;
  } catch {
    return null;
  }
}

/**
 * Kırpma aralığını gerçek dosyaya uygula (lossless native trim).
 * Native modül yoksa: dosya zaten limit altındaysa metadata kırpma ile devam (trimmed:false).
 */
export async function HikayeVideoDosyaKirp(opts: {
  uri: string;
  startMs: number;
  endMs: number;
  fullDurationMs?: number | null;
  maxBytes?: number;
}): Promise<HikayeVideoKirpSonuc> {
  const startMs = Math.max(0, Math.round(opts.startMs));
  const endMs = Math.max(startMs + 500, Math.round(opts.endMs));
  const full = Math.max(
    0,
    Math.round(Number(opts.fullDurationMs ?? 0) || 0),
  );

  // Tam video seçildiyse kırpmaya gerek yok
  const tamami =
    startMs <= 50 && (full <= 0 || endMs >= full - 150);
  if (tamami) {
    return { ok: true, uri: opts.uri, trimmed: false };
  }

  try {
    const mod = await import('react-native-lossless-trim');
    if (typeof mod.isAvailable === 'function' && !mod.isAvailable()) {
      return await kirpYoksaFallback(opts.uri, opts.maxBytes);
    }
    const { uri } = await mod.trimAsync(opts.uri, { startMs, endMs });
    if (typeof uri !== 'string' || !uri) {
      return { ok: false, hata: i18n.t('hikaye.videoKirpBasarisiz') };
    }
    return { ok: true, uri, trimmed: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (/unavailable|native module|Expo Go|isAvailable/i.test(msg)) {
      return await kirpYoksaFallback(opts.uri, opts.maxBytes);
    }
    return {
      ok: false,
      hata: msg || i18n.t('hikaye.videoKirpBasarisiz'),
    };
  }
}

async function kirpYoksaFallback(
  uri: string,
  maxBytes?: number,
): Promise<HikayeVideoKirpSonuc> {
  const bayt = await HikayeDosyaBoyutuBayt(uri);
  if (maxBytes != null && bayt != null && bayt > maxBytes) {
    const gercekMb = Math.max(1, Math.round(bayt / (1024 * 1024)));
    const limitMb = Math.max(1, Math.round(maxBytes / (1024 * 1024)));
    return {
      ok: false,
      hata: i18n.t('hikaye.videoCokBuyuk', {
        mb: gercekMb,
        limit: limitMb,
      }),
    };
  }
  // Boyut uygun — native kırpma yok; playback trim meta ile devam
  return { ok: true, uri, trimmed: false };
}
