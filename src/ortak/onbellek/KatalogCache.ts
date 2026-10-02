/**
 * Seyrek değişen kataloglar (hediye, coin paket, oda kapasite/düzen).
 */

import { TtlInflightCacheOlustur } from './TtlInflightCache';

/** Admin değişikliği ~2 dk içinde yansır */
export const KATALOG_TTL_MS = 120_000;

const cache = TtlInflightCacheOlustur<unknown>(KATALOG_TTL_MS);

export const KatalogCache = {
  ttlMs: KATALOG_TTL_MS,

  getOrFetch<T>(key: string, fetchFn: () => Promise<T>, ttlMs = KATALOG_TTL_MS) {
    return cache.getOrFetch(key, fetchFn, ttlMs) as Promise<T>;
  },

  invalidate(key: string) {
    cache.invalidate(key);
  },

  invalidatePrefix(prefix: string) {
    cache.invalidatePrefix(prefix);
  },

  temizle() {
    cache.clear();
  },
};
