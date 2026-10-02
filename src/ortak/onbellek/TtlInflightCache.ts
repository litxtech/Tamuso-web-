/**
 * Bellek içi TTL cache + in-flight deduplication.
 * Aynı key için eşzamanlı fetch'ler tek Promise paylaşır.
 */

type Kayit<T> = { value: T; exp: number };

export type TtlInflightCache<T> = {
  get(key: string): T | undefined;
  set(key: string, value: T, ttlMs?: number): void;
  invalidate(key: string): void;
  invalidatePrefix(prefix: string): void;
  clear(): void;
  getOrFetch(key: string, fetchFn: () => Promise<T>, ttlMs?: number): Promise<T>;
};

export function TtlInflightCacheOlustur<T>(
  varsayilanTtlMs: number,
): TtlInflightCache<T> {
  const store = new Map<string, Kayit<T>>();
  const inflight = new Map<string, Promise<T>>();

  return {
    get(key) {
      const row = store.get(key);
      if (!row) return undefined;
      if (Date.now() > row.exp) {
        store.delete(key);
        return undefined;
      }
      return row.value;
    },

    set(key, value, ttlMs = varsayilanTtlMs) {
      store.set(key, { value, exp: Date.now() + ttlMs });
    },

    invalidate(key) {
      store.delete(key);
      inflight.delete(key);
    },

    invalidatePrefix(prefix) {
      for (const k of store.keys()) {
        if (k.startsWith(prefix)) store.delete(k);
      }
      for (const k of inflight.keys()) {
        if (k.startsWith(prefix)) inflight.delete(k);
      }
    },

    clear() {
      store.clear();
      inflight.clear();
    },

    async getOrFetch(key, fetchFn, ttlMs = varsayilanTtlMs) {
      const hit = this.get(key);
      if (hit !== undefined) return hit;

      const pending = inflight.get(key);
      if (pending) return pending;

      const p = (async () => {
        try {
          const value = await fetchFn();
          this.set(key, value, ttlMs);
          return value;
        } finally {
          inflight.delete(key);
        }
      })();

      inflight.set(key, p);
      return p;
    },
  };
}
