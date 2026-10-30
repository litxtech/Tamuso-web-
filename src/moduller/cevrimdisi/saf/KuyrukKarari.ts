/**
 * Zaman aşımı uygulamayı çevrimdışı yapmaz.
 * Kuyruk: gerçekten çevrimdışı, ya da yeniden deneme güvenli (yorum client_id).
 * Doğrulama ve çakışma hataları kuyruğa yazılmaz.
 */
export function baglantiHatasiMi(hata?: string | null): boolean {
  const m = (hata ?? '').toLowerCase();
  if (!m) return false;
  return /network|timeout|timed out|fetch|abort|offline|econn|socket|failed to fetch|load failed|internet|network request failed/.test(
    m,
  );
}

export function kuyrugaAlinmaliMi(input: {
  offline: boolean;
  hata?: string | null;
  idempotent: boolean;
  catisma: boolean;
}): boolean {
  if (input.catisma) return false;
  if (input.offline) return true;
  if (!input.idempotent) return false;
  return baglantiHatasiMi(input.hata);
}
