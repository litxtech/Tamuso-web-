import type { KvDepo } from './KvDepo';

export function bellekKvDepoOlustur(baslangic?: Map<string, string>): KvDepo {
  const map = baslangic ?? new Map<string, string>();
  return {
    async getItem(key) {
      return map.has(key) ? map.get(key)! : null;
    },
    async setItem(key, value) {
      map.set(key, value);
    },
    async removeItem(key) {
      map.delete(key);
    },
    async getAllKeys() {
      return [...map.keys()];
    },
    async multiRemove(keys) {
      for (const k of keys) map.delete(k);
    },
  };
}
