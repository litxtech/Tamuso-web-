/**
 * StoreKit / Play Billing fiyatları — güvenilir tahsilat kaynağı.
 * DB price_try yalnızca referans / admin önizleme.
 *
 * Kalıcı IAP oturumu + bellek cache — sheet her açılışta yavaşlamasın.
 */
import type { CoinPackage } from '../../../types/models';
import { IapUrunId } from '../../iap/IapUrunId';
import { IapBaglantisiniAc, IapOrtamUygunMu } from '../../iap/oturum/IapOturum';

export type MagazaFiyatHaritasi = Record<
  string,
  { displayPrice: string; price?: number; currency?: string }
>;

const CACHE_TTL_MS = 10 * 60 * 1000;
let cache: { at: number; map: MagazaFiyatHaritasi; skuKey: string } | null =
  null;
let inflight: Promise<MagazaFiyatHaritasi> | null = null;

function skuKey(packages: CoinPackage[]): string {
  return packages
    .map(IapUrunId)
    .filter(Boolean)
    .sort()
    .join('|');
}

/** Bellekte taze mağaza fiyatı var mı — gereksiz IAP fetch atla */
export function MagazaFiyatCacheTazeMi(packages: CoinPackage[]): boolean {
  if (!cache) return false;
  if (cache.skuKey !== skuKey(packages)) return false;
  return Date.now() - cache.at < CACHE_TTL_MS;
}

/** Tek SKU cache'te mi — satın alma öncesi fetchProducts atlamak için */
export function MagazaSkuCacheteMi(sku: string): boolean {
  if (!cache || Date.now() - cache.at >= CACHE_TTL_MS) return false;
  return !!cache.map[sku]?.displayPrice;
}

/**
 * Aktif paketlerin mağaza fiyatlarını çeker (cache'li).
 */
export async function MagazaFiyatlariniYukle(
  packages: CoinPackage[],
): Promise<MagazaFiyatHaritasi> {
  if (!IapOrtamUygunMu()) return {};
  const skus = [...new Set(packages.map(IapUrunId).filter(Boolean))];
  if (!skus.length) return {};

  const key = skuKey(packages);
  if (cache && cache.skuKey === key && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.map;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const iap = await IapBaglantisiniAc();
      const products = await iap.fetchProducts({ skus, type: 'in-app' });
      const map: MagazaFiyatHaritasi = {};
      for (const p of products ?? []) {
        const id =
          (p as { id?: string; productId?: string }).id ??
          (p as { productId?: string }).productId;
        if (!id) continue;
        const displayPrice =
          (p as { displayPrice?: string }).displayPrice ??
          (p as { localizedPrice?: string }).localizedPrice ??
          '';
        const price = Number((p as { price?: number | string }).price ?? NaN);
        const currency = (p as { currency?: string }).currency;
        if (displayPrice) {
          map[id] = {
            displayPrice,
            price: Number.isFinite(price) ? price : undefined,
            currency,
          };
        }
      }
      cache = { at: Date.now(), map, skuKey: key };
      return map;
    } catch {
      return cache?.map ?? {};
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/** Paketi mağaza fiyatıyla zenginleştir */
export function PaketlereMagazaFiyatiUygula(
  packages: CoinPackage[],
  fiyatlar: MagazaFiyatHaritasi,
): CoinPackage[] {
  return packages.map((pkg) => {
    const id = IapUrunId(pkg);
    const f = fiyatlar[id];
    if (!f) return pkg;
    return {
      ...pkg,
      store_display_price: f.displayPrice,
      store_price_amount: f.price ?? null,
      store_currency: f.currency ?? null,
    };
  });
}
