export type Semver = { major: number; minor: number; patch: number };

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

/** Sayısal major.minor.patch. Bozuk metin null. */
export function SemverCoz(girdi: string | null | undefined): Semver | null {
  const t = String(girdi ?? '').trim();
  const m = SEMVER.exec(t);
  if (!m) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
  };
}

/** -1 a eski, 0 eşit, 1 a yeni. İkisi de çözülemezse null. */
export function SemverKarsilastir(
  a: string | null | undefined,
  b: string | null | undefined,
): -1 | 0 | 1 | null {
  const sol = SemverCoz(a);
  const sag = SemverCoz(b);
  if (!sol || !sag) return null;
  if (sol.major !== sag.major) return sol.major < sag.major ? -1 : 1;
  if (sol.minor !== sag.minor) return sol.minor < sag.minor ? -1 : 1;
  if (sol.patch !== sag.patch) return sol.patch < sag.patch ? -1 : 1;
  return 0;
}

export function BuildCoz(girdi: string | number | null | undefined): number | null {
  if (typeof girdi === 'number' && Number.isFinite(girdi)) {
    const n = Math.trunc(girdi);
    return n >= 0 ? n : null;
  }
  const t = String(girdi ?? '').trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  if (!Number.isSafeInteger(n) || n < 0) return null;
  return n;
}
