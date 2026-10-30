import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * iOS: AFTER_FIRST_UNLOCK — cihaz kilitliyken de autoRefreshToken okuyabilsin.
 * Varsayılan WHEN_UNLOCKED → "User interaction is not allowed" (Keychain).
 * Mevcut anahtarların accessibility'si SecItemUpdate ile değişmez; yazmadan önce silinir.
 */
const IOS_KEYCHAIN: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

/**
 * Supabase Auth storage adapter.
 * Native: SecureStore (Keychain/Keystore).
 * Web: AsyncStorage fallback (SecureStore web sinirli).
 *
 * Yönetim paneli (apps/super-admin) açılışta `globalThis.__TAMUSO_ADMIN_WEB__`
 * bayrağını koyar. Bayrak açıkken web'de sessionStorage kullanılır: personel
 * oturumu sekme kapanınca tarayıcıdan silinir ve aynı tarayıcıdaki diğer
 * sekmeleri etkilemez.
 */
function webDeposu(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    const bayrak = (globalThis as { __TAMUSO_ADMIN_WEB__?: boolean })
      .__TAMUSO_ADMIN_WEB__;
    return bayrak ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

async function webOku(key: string): Promise<string | null> {
  try {
    const depo = webDeposu();
    if (!depo) return AsyncStorage.getItem(key);
    return depo.getItem(key);
  } catch {
    return null;
  }
}

async function webYaz(key: string, value: string): Promise<void> {
  const depo = webDeposu();
  if (!depo) {
    await AsyncStorage.setItem(key, value);
    return;
  }
  depo.setItem(key, value);
}

async function webSil(key: string): Promise<void> {
  const depo = webDeposu();
  if (!depo) {
    await AsyncStorage.removeItem(key);
    return;
  }
  depo.removeItem(key);
}

export const GuvenliOturumDepolama = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return webOku(key);
    }
    try {
      return await SecureStore.getItemAsync(key, IOS_KEYCHAIN);
    } catch {
      // Kilitli cihaz / geçici Keychain — autoRefresh tick sessizce geçsin
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      await webYaz(key, value);
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key).catch(() => undefined);
      await SecureStore.setItemAsync(key, value, IOS_KEYCHAIN);
    } catch {
      /* autoRefresh yeniden dener */
    }
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      await webSil(key);
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      /* ignore */
    }
  },
};
