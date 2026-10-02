import type { FeedOggesi } from '../okuma/AnaSayfaIcerikleriniGetir';
import { TtlInflightCacheOlustur } from '../../../ortak/onbellek/TtlInflightCache';

/** Tab focus / sessiz yenilemede kısa TTL — Realtime önemli olayda invalidate */
export const CANLI_FEED_TTL_MS = 8_000;

const cache = TtlInflightCacheOlustur<{
  items: FeedOggesi[];
  at: number;
}>(CANLI_FEED_TTL_MS);

function anahtar(
  limit: number,
  selfUserId: string | null | undefined,
  uyeAvatar: boolean,
): string {
  return `feed:${limit}:${selfUserId ?? 'anon'}:av=${uyeAvatar ? 1 : 0}`;
}

export const CanliFeedCache = {
  ttlMs: CANLI_FEED_TTL_MS,

  al(
    limit: number,
    selfUserId: string | null | undefined,
    uyeAvatar: boolean,
  ): FeedOggesi[] | undefined {
    return cache.get(anahtar(limit, selfUserId, uyeAvatar))?.items;
  },

  yaz(
    limit: number,
    selfUserId: string | null | undefined,
    uyeAvatar: boolean,
    items: FeedOggesi[],
  ) {
    cache.set(anahtar(limit, selfUserId, uyeAvatar), {
      items,
      at: Date.now(),
    });
  },

  /** Realtime anlamlı olay / pull-to-refresh */
  invalidate() {
    cache.clear();
  },
};
