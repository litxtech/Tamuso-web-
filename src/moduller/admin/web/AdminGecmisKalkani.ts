/**
 * Tarayıcı geri tuşu kalkanı.
 *
 * Panel bir sekmede açıldığında geçmişin altında kullanıcının önceki siteleri
 * durur (arama sonucu, başka bir uygulama vb.). Geri tuşuna basıldığında
 * yönetim paneli yerine o sayfa açılıyordu.
 *
 * Çözüm: uygulamanın açılış girişini "taban" olarak işaretle ve üstüne aynı
 * adreste bir kopya koy. Taban girişe düşüldüğünde hemen yeni bir kopya
 * eklenir; böylece geri tuşu panelin dışına inemez.
 *
 * Expo Router geçmiş girdilerini `history.state.id` ile eşlediği için kopya
 * girişler aynı state'i taşır: rota çözümü bozulmaz.
 */

const TABAN_ANAHTARI = '__tamusoAdminTaban';

let kuruldu = false;

type GecmisState = Record<string, unknown> | null;

function durumKopyala(): Record<string, unknown> {
  const s = (window.history.state ?? {}) as GecmisState;
  const kopya: Record<string, unknown> = { ...(s ?? {}) };
  // Kopya, taban sayılmasın; yoksa her geri basışında fazladan giriş eklenir.
  delete kopya[TABAN_ANAHTARI];
  return kopya;
}

/**
 * Kalkanı kurar. Dönen fonksiyon temizler.
 * Yalnızca tarayıcıda ve bir kez çağrılmalıdır.
 */
export function adminGecmisKalkaniniKur(): () => void {
  if (typeof window === 'undefined' || !window.history) return () => undefined;
  // React StrictMode / yeniden bağlanma: kalkan bir kez kurulur.
  if (kuruldu) return () => undefined;
  kuruldu = true;

  const kopyaEkle = () => {
    try {
      window.history.pushState(durumKopyala(), '', window.location.href);
    } catch {
      /* pushState engelliyse kalkan devre dışı */
    }
  };

  // Açılış girişi taban olarak işaretlenir.
  try {
    window.history.replaceState(
      { ...durumKopyala(), [TABAN_ANAHTARI]: true },
      '',
      window.location.href,
    );
  } catch {
    /* yok say */
  }

  // Tabanın üstüne kopya: ilk geri basışı uygulama içinde kalır.
  kopyaEkle();

  const dinle = () => {
    const s = (window.history.state ?? {}) as GecmisState;
    if (s && s[TABAN_ANAHTARI] === true) kopyaEkle();
  };

  window.addEventListener('popstate', dinle);
  return () => window.removeEventListener('popstate', dinle);
}
