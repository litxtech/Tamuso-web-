import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { CeviriAnahtari } from '../../../i18n/useCeviri';

const ANAHTAR = 'muta.biyometri.kilit';

const IOS_KEYCHAIN: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

export type BiyometriYetenegi = {
  uygun: boolean;
  donanim: boolean;
  kayitli: boolean;
  yuz: boolean;
  parmak: boolean;
};

export function BiyometriYontemAnahtari(yetenek: BiyometriYetenegi): CeviriAnahtari {
  if (Platform.OS === 'ios' && yetenek.yuz) return 'biyometri.baslikFaceId';
  if (Platform.OS === 'ios' && yetenek.parmak) return 'biyometri.baslikTouchId';
  if (yetenek.yuz) return 'biyometri.baslikYuz';
  if (yetenek.parmak) return 'biyometri.baslikParmak';
  return 'biyometri.baslikGenel';
}

const BOS: BiyometriYetenegi = {
  uygun: false,
  donanim: false,
  kayitli: false,
  yuz: false,
  parmak: false,
};

type YerelKimlik = typeof import('expo-local-authentication');

let yerelModul: YerelKimlik | null | undefined;
let tercihOnbellegi: boolean | null = null;
let oturumAcik = false;
const dinleyiciler = new Set<() => void>();

function bildir() {
  dinleyiciler.forEach((dinle) => dinle());
}

/**
 * Paketi doğrudan require etmek native yokken Metro'da yakalanamayan
 * redbox açar. Önce isteğe bağlı kontrol; modül yoksa pakete hiç girme.
 */
function yerelKimlik(): YerelKimlik | null {
  if (Platform.OS === 'web') return null;
  if (yerelModul !== undefined) return yerelModul;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireOptionalNativeModule } = require('expo-modules-core') as {
      requireOptionalNativeModule: (name: string) => unknown;
    };
    if (requireOptionalNativeModule('ExpoLocalAuthentication') == null) {
      yerelModul = null;
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    yerelModul = require('expo-local-authentication') as YerelKimlik;
    return yerelModul;
  } catch {
    yerelModul = null;
    return null;
  }
}

export function BiyometriTercihOnbellegi(): boolean | null {
  return tercihOnbellegi;
}

export function BiyometriOturumAcikMi(): boolean {
  return oturumAcik;
}

export function BiyometriDurumunaAboneOl(dinle: () => void): () => void {
  dinleyiciler.add(dinle);
  return () => {
    dinleyiciler.delete(dinle);
  };
}

export function BiyometriOturumunuAc() {
  if (oturumAcik) return;
  oturumAcik = true;
  bildir();
}

export function BiyometriOturumunuKilitle() {
  if (!oturumAcik) return;
  oturumAcik = false;
  bildir();
}

export async function BiyometriTercihiniOku(): Promise<boolean> {
  if (Platform.OS === 'web') {
    tercihOnbellegi = false;
    return false;
  }
  try {
    const deger = await SecureStore.getItemAsync(ANAHTAR, IOS_KEYCHAIN);
    tercihOnbellegi = deger === '1';
  } catch {
    tercihOnbellegi = false;
  }
  return tercihOnbellegi;
}

export async function BiyometriTercihiniYaz(acik: boolean): Promise<void> {
  const oncekiTercih = tercihOnbellegi;
  const oncekiOturum = oturumAcik;
  tercihOnbellegi = acik;
  oturumAcik = acik;
  try {
    if (Platform.OS === 'web') return;
    await SecureStore.deleteItemAsync(ANAHTAR).catch(() => undefined);
    await SecureStore.setItemAsync(ANAHTAR, acik ? '1' : '0', IOS_KEYCHAIN);
  } catch (hata) {
    tercihOnbellegi = oncekiTercih;
    oturumAcik = oncekiOturum;
    throw hata;
  } finally {
    bildir();
  }
}

export async function BiyometriYeteneginiOku(): Promise<BiyometriYetenegi> {
  const mod = yerelKimlik();
  if (!mod) return BOS;
  try {
    const [donanim, kayitli, turler] = await Promise.all([
      mod.hasHardwareAsync(),
      mod.isEnrolledAsync(),
      mod.supportedAuthenticationTypesAsync(),
    ]);
    const yuz = turler.includes(mod.AuthenticationType.FACIAL_RECOGNITION);
    const parmak = turler.includes(mod.AuthenticationType.FINGERPRINT);
    return { uygun: donanim && kayitli, donanim, kayitli, yuz, parmak };
  } catch {
    return BOS;
  }
}

export async function BiyometriIleDogrula(
  mesaj: string,
  iptalEtiketi?: string,
): Promise<{ ok: boolean; iptal: boolean; kod?: string }> {
  const mod = yerelKimlik();
  if (!mod) return { ok: false, iptal: false, kod: 'not_available' };
  try {
    const sonuc = await mod.authenticateAsync({
      promptMessage: mesaj,
      cancelLabel: iptalEtiketi,
      disableDeviceFallback: false,
      biometricsSecurityLevel: 'strong',
    });
    if (sonuc.success) return { ok: true, iptal: false };
    const iptal =
      sonuc.error === 'user_cancel' ||
      sonuc.error === 'system_cancel' ||
      sonuc.error === 'app_cancel';
    return { ok: false, iptal, kod: sonuc.error };
  } catch {
    return { ok: false, iptal: false, kod: 'unknown' };
  }
}

void BiyometriTercihiniOku().then(() => bildir());
