/** Kazanç duyurusundaki çarpan ve oyun adı. */

export function KazancCarpani(
  multiplier: number | null | undefined,
  win: number,
  bet: number,
): string | null {
  let m =
    multiplier != null && Number.isFinite(multiplier) && multiplier > 0
      ? multiplier
      : null;
  if ((m == null || m < 2) && bet > 0 && win > 0) {
    const oran = win / bet;
    if (oran >= 2) m = oran;
  }
  if (m == null || m < 2) return null;
  const tam = Math.abs(m - Math.round(m)) < 0.05;
  const yazi = tam
    ? String(Math.round(m))
    : String(Math.round(m * 10) / 10);
  return `${yazi}x`;
}

export function KazancCoin(tutar: number): string {
  const n = Math.floor(Number(tutar) || 0);
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
  } catch {
    return String(n);
  }
}

export function KazancOyunAdi(
  gameCode: string,
  gameTitle: string,
  meyveAdi: string,
): string {
  if (gameCode === 'fruit_wheel') return meyveAdi;
  const baslik = gameTitle?.trim();
  return baslik || gameCode;
}
