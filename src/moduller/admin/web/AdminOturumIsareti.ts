/**
 * Personel oturumunun "bu sekmede açık" işareti.
 *
 * Supabase belirteci localStorage'da kalıcıdır; yönetim panelinde sekme
 * kapatıldığında oturumun düşmesi istenir. sessionStorage sekmeye özeldir:
 * sekme kapanınca silinir. İşaret yoksa panel açılışta oturumu zorla kapatır.
 *
 * Depolama kapalıysa (gizli mod) mekanizma devre dışı kalır; giriş engellenmez.
 */

const ANAHTAR = 'tamuso_admin_oturum_v1';

function depo(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    const s = window.sessionStorage;
    s.getItem(ANAHTAR);
    return s;
  } catch {
    return null;
  }
}

export function adminOturumIsaretiniKoy(): void {
  const s = depo();
  if (!s) return;
  try {
    s.setItem(ANAHTAR, String(Date.now()));
  } catch {
    /* kota / izin — yok say */
  }
}

/** Oturumun açıldığı an (epoch ms). Yoksa 0. */
export function adminOturumBaslangiciGetir(): number {
  const s = depo();
  if (!s) return 0;
  try {
    const ham = s.getItem(ANAHTAR);
    const n = ham ? Number(ham) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function adminOturumIsaretiniSil(): void {
  const s = depo();
  if (!s) return;
  try {
    s.removeItem(ANAHTAR);
  } catch {
    /* yok say */
  }
}

/**
 * İşaret var mı? Depolama kullanılamıyorsa `true` döner:
 * mekanizma çalışamıyorsa personeli dışarıda bırakmanın anlamı yok.
 */
export function adminOturumIsaretiVarMi(): boolean {
  const s = depo();
  if (!s) return true;
  try {
    return s.getItem(ANAHTAR) !== null;
  } catch {
    return true;
  }
}
