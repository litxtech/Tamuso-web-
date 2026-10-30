import type { KvDepo } from './KvDepo';

/** AsyncStorage — anahtarlar kullanıcı kimliğine bağlıdır, sır içermez. */
export function asyncKvDepoOlustur(): KvDepo {
  return {
    async getItem(key) {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      return AsyncStorage.getItem(key);
    },
    async setItem(key, value) {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem(key, value);
    },
    async removeItem(key) {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.removeItem(key);
    },
    async getAllKeys() {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const keys = await AsyncStorage.getAllKeys();
      return [...keys];
    },
    async multiRemove(keys) {
      if (keys.length === 0) return;
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.multiRemove(keys);
    },
  };
}
