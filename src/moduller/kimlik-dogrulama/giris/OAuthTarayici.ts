/**
 * Android OAuth — Chrome kartı aynı görevde kalsın.
 * Yeni görev (createTask) dönüş adresini uygulamada olmayan
 * bir sayfa gibi açıyor; giriş yine oluyor ama "sayfa yok" uyarısı çıkıyor.
 */
export const OAUTH_TARAYICI = {
  createTask: false,
  showInRecents: false,
} as const;

let gizle: (() => void) | null = null;

/** Giriş lobisi video yüzeyini, tarayıcı açılmadan hemen önce kaldırır. */
export function oauthTarayiciGizleBagla(fn: (() => void) | null): void {
  gizle = fn;
}

export async function oauthTarayiciAcilmadanOnce(): Promise<void> {
  gizle?.();
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 32);
  });
}
