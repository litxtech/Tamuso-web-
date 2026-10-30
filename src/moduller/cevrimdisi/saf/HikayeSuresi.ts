/** Sunucu expiry'si yoksa veya geçmişse gösterilmez. */
export function hikayeSuresiGecerliMi(
  expiresAt: string | null | undefined,
  simdiMs: number,
): boolean {
  if (!expiresAt) return false;
  const t = Date.parse(expiresAt);
  if (!Number.isFinite(t)) return false;
  return t > simdiMs;
}

export function hikayeOgeleriFiltrele<T extends { expires_at?: string | null }>(
  ogeler: readonly T[],
  simdiMs: number,
): T[] {
  return ogeler.filter((o) => hikayeSuresiGecerliMi(o.expires_at, simdiMs));
}
