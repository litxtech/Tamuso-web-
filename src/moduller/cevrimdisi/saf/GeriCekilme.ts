/** 1s, 2s, 4s, 8s, 16s, 30s — sonra dur. */
export const GERİ_CEKILME_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000] as const;

export const MAKS_DENEME = 6;

export function sonrakiBeklemeMs(deneme: number): number {
  const i = Math.max(0, Math.min(deneme, GERİ_CEKILME_MS.length - 1));
  return GERİ_CEKILME_MS[i]!;
}

export function denemeTukendiMi(denemeSayisi: number): boolean {
  return denemeSayisi >= MAKS_DENEME;
}
