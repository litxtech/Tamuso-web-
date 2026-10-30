/** Otomatik hedef bandı: 500 MB – 1 GB. Varsayılan tavan ortada. */
export const OTOMATIK_KOTA_BAYT = 700 * 1024 * 1024;
export const MANUEL_KOTA_BAYT = 2 * 1024 * 1024 * 1024;
const DUSUK_ALAN_BAYT = 200 * 1024 * 1024;
const DUSUK_ALAN_TAVAN = 32 * 1024 * 1024;

/**
 * Cihazın boş alanının en fazla %20'si.
 * 700 MB boşta 2 GB önbellek açılmaz.
 */
export function kotaHesapla(
  bosBayt: number | null,
  manuelKayitVar: boolean,
): number {
  const hedef = manuelKayitVar ? MANUEL_KOTA_BAYT : OTOMATIK_KOTA_BAYT;
  if (bosBayt == null || !Number.isFinite(bosBayt) || bosBayt < 0) {
    return OTOMATIK_KOTA_BAYT;
  }
  if (bosBayt < DUSUK_ALAN_BAYT) {
    return Math.min(hedef, DUSUK_ALAN_TAVAN, Math.floor(bosBayt * 0.2));
  }
  const pay = Math.floor(bosBayt * 0.2);
  return Math.max(DUSUK_ALAN_TAVAN, Math.min(hedef, pay));
}

export function jsonBayt(data: unknown): number {
  try {
    const s = JSON.stringify(data);
    if (!s) return 0;
    return new TextEncoder().encode(s).length;
  } catch {
    return 0;
  }
}

export function baytEtiket(bayt: number): string {
  if (!Number.isFinite(bayt) || bayt <= 0) return '0 MB';
  const mb = bayt / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  if (mb >= 10) return `${Math.round(mb)} MB`;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bayt / 1024;
  if (kb >= 10) return `${Math.round(kb)} KB`;
  if (kb >= 0.1) return `${kb.toFixed(1)} KB`;
  return '0.1 KB';
}
