import type { KvDepo } from './depo/KvDepo';
import { asyncKvDepoOlustur } from './depo/AsyncKvDepo';
import { semaCoz, semaSar } from './saf/SemaGoc';

const ONEK = 'tamuso.of.v1';

let depo: KvDepo | null = null;

export function cevrimdisiDepoAyarla(sonraki: KvDepo | null): void {
  depo = sonraki;
}

export function cevrimdisiDepoAl(): KvDepo {
  if (!depo) depo = asyncKvDepoOlustur();
  return depo;
}

export function cevrimdisiAnahtar(userId: string, alan: string): string {
  return `${ONEK}:${userId}:${alan}`;
}

export async function cevrimdisiYaz<T>(
  userId: string,
  alan: string,
  data: T,
  hedef: KvDepo = cevrimdisiDepoAl(),
): Promise<void> {
  if (!userId) return;
  await hedef.setItem(cevrimdisiAnahtar(userId, alan), semaSar(data));
}

export async function cevrimdisiOku<T>(
  userId: string,
  alan: string,
  yedek: T,
  hedef: KvDepo = cevrimdisiDepoAl(),
): Promise<T> {
  if (!userId) return yedek;
  try {
    const raw = await hedef.getItem(cevrimdisiAnahtar(userId, alan));
    const coz = semaCoz(raw);
    if (!coz.ok) return yedek;
    return coz.data as T;
  } catch {
    return yedek;
  }
}

export async function cevrimdisiAlanSil(
  userId: string,
  alanlar: string[],
  hedef: KvDepo = cevrimdisiDepoAl(),
): Promise<void> {
  if (!userId || alanlar.length === 0) return;
  const keys = alanlar.map((a) => cevrimdisiAnahtar(userId, a));
  await hedef.multiRemove(keys);
}

/** Yalnızca bu kullanıcının anahtarları. Başka hesabın verisine dokunmaz. */
export async function cevrimdisiKullaniciSil(
  userId: string,
  hedef: KvDepo = cevrimdisiDepoAl(),
): Promise<void> {
  if (!userId) return;
  const prefix = `${ONEK}:${userId}:`;
  const keys = (await hedef.getAllKeys()).filter((k) => k.startsWith(prefix));
  await hedef.multiRemove(keys);
}
