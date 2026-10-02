import { Platform } from 'react-native';
import type { CoinPackage } from '../../../types/models';

/**
 * Store product id — Magaza fiyat + satın alma aynı olmalı.
 * Katalogda apple_product_id / google_product_id dolu gelmeli;
 * yoksa sku (App Store Connect ile aynı).
 */
export function IapUrunId(pkg: CoinPackage): string {
  if (Platform.OS === 'ios') {
    return (pkg.apple_product_id ?? pkg.sku).trim();
  }
  return (pkg.google_product_id ?? pkg.sku).trim();
}
