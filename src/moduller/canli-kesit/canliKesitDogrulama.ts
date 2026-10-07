/** Kesit süre ve boyut kuralları — sunucu ile aynı sınırlar. */

export const KESIT_SURELERI = [15, 20, 30] as const;
export type KesitSaniye = (typeof KESIT_SURELERI)[number];

export const KESIT_VARSAYILAN_SANIYE: KesitSaniye = 30;
export const KESIT_CAPTION_MAX = 300;
/** story-media kovası 50MB. 30 sn için güvenli tavan. */
export const KESIT_VARSAYILAN_MAX_BAYT = 18 * 1024 * 1024;

export function kesitSuresiGecerliMi(saniye: number): saniye is KesitSaniye {
  return (KESIT_SURELERI as readonly number[]).includes(saniye);
}

export function kesitSaniyeNormalize(saniye: number | null | undefined): KesitSaniye {
  if (saniye === 15 || saniye === 20 || saniye === 30) return saniye;
  return KESIT_VARSAYILAN_SANIYE;
}

export function kesitBoyutAsimi(bayt: number | null | undefined, maxBayt: number): boolean {
  if (bayt == null || !(bayt > 0)) return false;
  const tavan = maxBayt > 0 ? maxBayt : KESIT_VARSAYILAN_MAX_BAYT;
  return bayt > tavan;
}

export function kesitUzanti(mime: string | null | undefined): 'mp4' | 'webm' | null {
  const m = (mime ?? '').toLowerCase();
  if (m.includes('webm')) return 'webm';
  if (m.includes('mp4') || m.includes('avc') || m.includes('h264')) return 'mp4';
  return null;
}
