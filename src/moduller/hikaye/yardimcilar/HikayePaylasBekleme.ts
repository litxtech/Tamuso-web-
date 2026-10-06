/**
 * Hikaye yayın bekleme notları — teknik jargon yok (1080p vb.).
 * İlerlemeye göre modern, kısa mesajlar.
 */
export function HikayePaylasBeklemeNotu(
  pct: number,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const p = Math.max(0, Math.min(1, Number(pct) || 0));
  if (p < 0.2) return t('hikaye.paylasBekleHazirlaniyor');
  if (p < 0.45) return t('hikaye.paylasBekleIsliyor');
  if (p < 0.7) return t('hikaye.paylasBekleNeredeyse');
  if (p < 0.92) return t('hikaye.paylasBekleParlatiyor');
  return t('hikaye.paylasBekleGonderiliyor');
}
