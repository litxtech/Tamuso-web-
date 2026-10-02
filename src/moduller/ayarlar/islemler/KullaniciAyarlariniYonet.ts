import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DilNormalizeEt,
  VARSAYILAN_DIL,
  type DilModu,
  type UygulamaDili,
} from '../../../i18n/diller';

const KEY_PUSH = 'ayarlar.push_enabled';
const KEY_LANG = 'ayarlar.dil';
const KEY_LANG_MODE = 'ayarlar.dil_modu';

export type KullaniciAyarlari = {
  pushEnabled: boolean;
  dil: UygulamaDili;
  dilModu: DilModu;
  /** Kullanıcı MANUAL dil seçti mi — true ise cihaz/ülke override etmez */
  dilKayitli: boolean;
};

export async function KullaniciAyarlariniGetir(): Promise<KullaniciAyarlari> {
  const [push, dil, mod] = await Promise.all([
    AsyncStorage.getItem(KEY_PUSH),
    AsyncStorage.getItem(KEY_LANG),
    AsyncStorage.getItem(KEY_LANG_MODE),
  ]);

  const dilKayitli = dil != null && dil !== '';
  const dilModu: DilModu =
    mod === 'SYSTEM' || mod === 'MANUAL'
      ? mod
      : dilKayitli
        ? 'MANUAL'
        : 'SYSTEM';

  return {
    pushEnabled: push !== '0',
    dil: DilNormalizeEt(dil ?? VARSAYILAN_DIL),
    dilModu,
    dilKayitli,
  };
}

export async function PushBildirimAyariniKaydet(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY_PUSH, enabled ? '1' : '0');
}

/** Manuel dil seçimi — kalıcı kilit; cihaz/ülke dili bir daha override etmez */
export async function DilAyariniKaydet(dil: string): Promise<void> {
  const kod = DilNormalizeEt(dil);
  await AsyncStorage.multiSet([
    [KEY_LANG, kod],
    [KEY_LANG_MODE, 'MANUAL'],
  ]);
}

/** Sistem / ülke diline dön — MANUAL kilidi kaldır */
export async function DilModunuSistemYap(): Promise<void> {
  await AsyncStorage.setItem(KEY_LANG_MODE, 'SYSTEM');
}
