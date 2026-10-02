import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SurumPolitikasi } from './SurumKarari';

const ANAHTAR = 'tamuso_surum_politika_v1';
const SONRA_ANAHTAR = 'tamuso_surum_sonra_v1';

/** Onaylanmış politika bu süreden eskiyse ağ yokken kilit uygulanmaz. */
export const SURUM_ONBELLEK_TTL_MS = 10 * 60 * 1000;

export type SurumOnbellek = {
  platform: 'ios' | 'android';
  fetchedAt: number;
  policy: SurumPolitikasi;
};

export async function SurumOnbellegiOku(
  platform: 'ios' | 'android',
): Promise<SurumOnbellek | null> {
  try {
    const raw = await AsyncStorage.getItem(ANAHTAR);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SurumOnbellek;
    if (parsed?.platform !== platform || typeof parsed.fetchedAt !== 'number') return null;
    if (!parsed.policy?.minimumVersion) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function SurumOnbellegiYaz(kayit: SurumOnbellek): Promise<void> {
  try {
    await AsyncStorage.setItem(ANAHTAR, JSON.stringify(kayit));
  } catch {
    /* cache isteğe bağlı */
  }
}

type SonraKaydi = { anahtar: string };

export function SonraAnahtari(policy: SurumPolitikasi): string {
  return `${policy.platform}:${policy.latestVersion}:${policy.latestBuild}`;
}

export async function IstegeBagliErtelendiMi(policy: SurumPolitikasi): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(SONRA_ANAHTAR);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as SonraKaydi;
    return parsed.anahtar === SonraAnahtari(policy);
  } catch {
    return false;
  }
}

export async function IstegeBagliErtele(policy: SurumPolitikasi): Promise<void> {
  try {
    const kayit: SonraKaydi = { anahtar: SonraAnahtari(policy) };
    await AsyncStorage.setItem(SONRA_ANAHTAR, JSON.stringify(kayit));
  } catch {
    /* ignore */
  }
}
