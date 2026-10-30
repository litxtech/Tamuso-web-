export const ONBELLEK_SEMA = 1;

export type SemaSarma = { schema: number; data: unknown };

export function semaSar(data: unknown): string {
  return JSON.stringify({ schema: ONBELLEK_SEMA, data } satisfies SemaSarma);
}

/**
 * Bozuk JSON uygulamayı düşürmez.
 * Şemasız eski kayıt (dizi/nesne) v1 veri olarak okunur.
 */
export function semaCoz(raw: string | null | undefined): { ok: true; data: unknown } | { ok: false } {
  if (!raw) return { ok: false };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false };
  }
  if (!parsed || typeof parsed !== 'object') return { ok: false };
  const row = parsed as { schema?: unknown; data?: unknown };
  if (row.schema === ONBELLEK_SEMA && 'data' in row) {
    return { ok: true, data: row.data };
  }
  if (typeof row.schema === 'number' && row.schema > ONBELLEK_SEMA) {
    return { ok: false };
  }
  if (Array.isArray(parsed) || !('schema' in row)) {
    return { ok: true, data: parsed };
  }
  return { ok: false };
}
