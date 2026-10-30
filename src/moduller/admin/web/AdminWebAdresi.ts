import { Linking } from 'react-native';

/**
 * Personel konsolu ayrı bir web uygulamasıdır (`apps/super-admin`).
 *
 * Bu adres mobil uygulamanın binary'sine admin ekranı koymadan personelin
 * panele ulaşmasını sağlar. Tanımlı değilse mobil uygulamada hiçbir personel
 * girişi gösterilmez.
 *
 * Yapılandırma: EXPO_PUBLIC_ADMIN_WEB_URL (örn. https://admin.tamuso.app)
 */
export const ADMIN_WEB_ADRESI: string | null = (() => {
  const ham = (process.env.EXPO_PUBLIC_ADMIN_WEB_URL ?? '').trim();
  if (!ham) return null;
  try {
    const url = new URL(ham);
    if (url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
})();

export function AdminWebAdresiVarMi(): boolean {
  return ADMIN_WEB_ADRESI != null;
}

export function AdminWebYolu(yol = ''): string {
  const temel = ADMIN_WEB_ADRESI;
  if (!temel) return '';
  const normalize = yol.startsWith('/') ? yol : `/${yol}`;
  return `${temel}${normalize}`;
}

/** Personel konsolunu sistem tarayıcısında açar. Adres yoksa false döner. */
export async function AdminPaneliAc(yol = ''): Promise<boolean> {
  const adres = AdminWebYolu(yol);
  if (!adres) return false;
  await Linking.openURL(adres);
  return true;
}
