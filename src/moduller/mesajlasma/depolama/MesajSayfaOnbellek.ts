/**
 * Sohbet son sayfa önbelleği — Instagram gibi açılışta anında boya.
 * Bellek (senkron) + AsyncStorage (kalıcı).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DirektMesaj } from '../okuma/MesajlariGetir';

const bellek = new Map<string, DirektMesaj[]>();
const PREFIX = 'tamuso.dm.page.';

function anahtar(threadId: string) {
  return `${PREFIX}${threadId}`;
}

export function MesajSayfaOnbellekOkuSync(
  threadId: string,
): DirektMesaj[] | null {
  const hit = bellek.get(threadId);
  return hit && hit.length > 0 ? hit : null;
}

export async function MesajSayfaOnbellekOku(
  threadId: string,
): Promise<DirektMesaj[] | null> {
  const sync = MesajSayfaOnbellekOkuSync(threadId);
  if (sync) return sync;
  try {
    const raw = await AsyncStorage.getItem(anahtar(threadId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DirektMesaj[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    bellek.set(threadId, parsed);
    return parsed;
  } catch {
    return null;
  }
}

/** Son sayfayı (en yeni mesajlar) sakla — pagination eski mesajları yazmaz. */
export function MesajSayfaOnbellekYaz(
  threadId: string,
  mesajlar: DirektMesaj[],
): void {
  const temiz = mesajlar
    .filter((m) => m && typeof m.id === 'string' && !m.id.startsWith('temp'))
    .slice(-40)
    .map((m) => {
      const { _localStatus: _s, ...rest } = m;
      return rest as DirektMesaj;
    });
  bellek.set(threadId, temiz);
  void AsyncStorage.setItem(anahtar(threadId), JSON.stringify(temiz)).catch(
    () => null,
  );
}

export function MesajSayfaOnbellekSil(threadId: string): void {
  bellek.delete(threadId);
  void AsyncStorage.removeItem(anahtar(threadId)).catch(() => null);
}

export const MESAJ_SAYFA_BOYUTU = 20;
