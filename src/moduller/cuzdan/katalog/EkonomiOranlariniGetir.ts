import { supabase } from '../../../lib/supabase';
import { KatalogCache } from '../../../ortak/onbellek/KatalogCache';
import type { PlatformEkonomiConfig } from '../../admin/tipler/PlatformTipleri';

export const EKONOMI_ORAN_FALLBACK: PlatformEkonomiConfig = {
  coin_try: 0.1,
  diamond_try: 0.1,
  gift_host_share: 0.8,
  default_agency_share: 0.2,
  iap_store_fee_estimate: 0.3,
  updated_at: null,
};

let canli: PlatformEkonomiConfig = { ...EKONOMI_ORAN_FALLBACK };

function sayi(v: unknown, fb: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fb;
}

function normalize(raw: Partial<PlatformEkonomiConfig> | null | undefined): PlatformEkonomiConfig {
  return {
    coin_try: sayi(raw?.coin_try, EKONOMI_ORAN_FALLBACK.coin_try),
    diamond_try: sayi(raw?.diamond_try, EKONOMI_ORAN_FALLBACK.diamond_try),
    gift_host_share: Math.min(
      1,
      Math.max(0, Number(raw?.gift_host_share ?? EKONOMI_ORAN_FALLBACK.gift_host_share)),
    ),
    default_agency_share: Math.min(
      0.9,
      Math.max(0, Number(raw?.default_agency_share ?? EKONOMI_ORAN_FALLBACK.default_agency_share)),
    ),
    iap_store_fee_estimate: Math.min(
      0.99,
      Math.max(0, Number(raw?.iap_store_fee_estimate ?? EKONOMI_ORAN_FALLBACK.iap_store_fee_estimate)),
    ),
    updated_at: raw?.updated_at ?? null,
  };
}

export function EkonomiOranCacheOku(): PlatformEkonomiConfig {
  return canli;
}

export function EkonomiOranCacheAyarla(cfg: PlatformEkonomiConfig): void {
  canli = normalize(cfg);
}

export async function EkonomiOranlariniGetir(
  force = false,
): Promise<PlatformEkonomiConfig> {
  if (force) KatalogCache.invalidate('economy:config');
  const cfg = await KatalogCache.getOrFetch('economy:config', async () => {
    const { data, error } = await supabase.rpc('ekonomi_config_getir');
    if (error) throw new Error(error.message);
    return normalize(data as PlatformEkonomiConfig);
  });
  canli = cfg;
  return cfg;
}
