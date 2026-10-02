/**
 * Coin paket kataloğu — Store Product ID'leri sabittir (App Store / Play).
 * Coin miktarı / bonus / görünürlük admin + Supabase'ten gelir.
 * Gerçek tahsilat fiyatı StoreKit / Play Billing'den okunur (price_try referans).
 */

import i18n from '../../../i18n';
import { COIN_TRY_ORANI, CoinTryOraniCanli } from './CoinTryOrani';

export { COIN_TRY_ORANI, CoinTryOraniCanli };

/** Mağaza IAP Product ID'leri — DEĞİŞTİRİLMEZ */
export const TAMUSO_COIN_PRODUCT_IDS = [
  'tamuso_coin_pack_1',
  'tamuso_coin_pack_2',
  'tamuso_coin_pack_3',
  'tamuso_coin_pack_4',
  'tamuso_coin_pack_5',
  'tamuso_coin_pack_6',
  'tamuso_coin_pack_7',
  'tamuso_coin_pack_8',
] as const;

export type TamusoCoinProductId = (typeof TAMUSO_COIN_PRODUCT_IDS)[number];

type CoinPaketKademeIc = {
  sku: TamusoCoinProductId;
  titleKey:
    | 'coinPaket.pack1'
    | 'coinPaket.pack2'
    | 'coinPaket.pack3'
    | 'coinPaket.pack4'
    | 'coinPaket.pack5'
    | 'coinPaket.pack6'
    | 'coinPaket.pack7'
    | 'coinPaket.pack8';
  /** Referans liste (mağaza fiyatı UI'da override eder) */
  priceTry: number;
  priceUsd: number;
  coins: number;
  bonusCoins: number;
  badgeKey: 'coinPaket.badgePopuler' | null;
  badgeLiteral: string | null;
  sortOrder: number;
  /** Pack 5–8 varsayılan kapalı; admin açar */
  isActiveDefault: boolean;
};

export type CoinPaketKademe = {
  sku: TamusoCoinProductId;
  title: string;
  priceTry: number;
  priceUsd: number;
  coins: number;
  bonusCoins: number;
  badge: string | null;
  sortOrder: number;
  isActiveDefault: boolean;
};

/**
 * Pack 1–4: talimat coin miktarları.
 * Pack 5–8: coin admin panelinden — burada tahmin yok (0).
 */
const COIN_PAKET_KADEMELERI_IC: readonly CoinPaketKademeIc[] = [
  {
    sku: 'tamuso_coin_pack_1',
    titleKey: 'coinPaket.pack1',
    priceTry: 99.99,
    priceUsd: 2.99,
    coins: 400,
    bonusCoins: 0,
    badgeKey: null,
    badgeLiteral: null,
    sortOrder: 1,
    isActiveDefault: true,
  },
  {
    sku: 'tamuso_coin_pack_2',
    titleKey: 'coinPaket.pack2',
    priceTry: 489.99,
    priceUsd: 14.99,
    coins: 1500,
    bonusCoins: 0,
    badgeKey: 'coinPaket.badgePopuler',
    badgeLiteral: null,
    sortOrder: 2,
    isActiveDefault: true,
  },
  {
    sku: 'tamuso_coin_pack_3',
    titleKey: 'coinPaket.pack3',
    priceTry: 999.99,
    priceUsd: 29.99,
    coins: 2400,
    bonusCoins: 0,
    badgeKey: null,
    badgeLiteral: null,
    sortOrder: 3,
    isActiveDefault: true,
  },
  {
    sku: 'tamuso_coin_pack_4',
    titleKey: 'coinPaket.pack4',
    priceTry: 4999.99,
    priceUsd: 149.99,
    coins: 5200,
    bonusCoins: 0,
    badgeKey: null,
    badgeLiteral: 'MAX',
    sortOrder: 4,
    isActiveDefault: true,
  },
  {
    sku: 'tamuso_coin_pack_5',
    titleKey: 'coinPaket.pack5',
    priceTry: 0,
    priceUsd: 0,
    coins: 0,
    bonusCoins: 0,
    badgeKey: null,
    badgeLiteral: null,
    sortOrder: 5,
    isActiveDefault: false,
  },
  {
    sku: 'tamuso_coin_pack_6',
    titleKey: 'coinPaket.pack6',
    priceTry: 0,
    priceUsd: 0,
    coins: 0,
    bonusCoins: 0,
    badgeKey: null,
    badgeLiteral: null,
    sortOrder: 6,
    isActiveDefault: false,
  },
  {
    sku: 'tamuso_coin_pack_7',
    titleKey: 'coinPaket.pack7',
    priceTry: 0,
    priceUsd: 0,
    coins: 0,
    bonusCoins: 0,
    badgeKey: null,
    badgeLiteral: null,
    sortOrder: 7,
    isActiveDefault: false,
  },
  {
    sku: 'tamuso_coin_pack_8',
    titleKey: 'coinPaket.pack8',
    priceTry: 0,
    priceUsd: 0,
    coins: 0,
    bonusCoins: 0,
    badgeKey: null,
    badgeLiteral: null,
    sortOrder: 8,
    isActiveDefault: false,
  },
] as const;

function kademeCevir(k: CoinPaketKademeIc): CoinPaketKademe {
  return {
    sku: k.sku,
    title: i18n.t(k.titleKey),
    priceTry: k.priceTry,
    priceUsd: k.priceUsd,
    coins: k.coins,
    bonusCoins: k.bonusCoins,
    badge: k.badgeKey ? i18n.t(k.badgeKey) : k.badgeLiteral,
    sortOrder: k.sortOrder,
    isActiveDefault: k.isActiveDefault,
  };
}

/** Canlı dilde kademeler */
export function CoinPaketKademeleriniAl(): CoinPaketKademe[] {
  return COIN_PAKET_KADEMELERI_IC.map(kademeCevir);
}

/** Geriye dönük — her okumada canlı dil */
export const COIN_PAKET_KADEMELERI: readonly CoinPaketKademe[] = new Proxy(
  [] as CoinPaketKademe[],
  {
    get(_t, prop, receiver) {
      const live = CoinPaketKademeleriniAl();
      if (prop === 'length') return live.length;
      if (prop === Symbol.iterator) return live[Symbol.iterator].bind(live);
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        return live[Number(prop)];
      }
      const v = Reflect.get(live, prop, receiver);
      return typeof v === 'function' ? v.bind(live) : v;
    },
    ownKeys() {
      return Reflect.ownKeys(CoinPaketKademeleriniAl());
    },
    getOwnPropertyDescriptor(_t, prop) {
      const live = CoinPaketKademeleriniAl();
      const desc = Reflect.getOwnPropertyDescriptor(live, prop);
      if (desc) desc.configurable = true;
      return desc;
    },
  },
);

export type CoinPaketHesap = {
  sku: string;
  title: string;
  priceTry: number;
  priceUsd: number;
  coins: number;
  bonusCoins: number;
  toplamCoin: number;
  badge: string | null;
  sortOrder: number;
};

export function PaketHesapla(k: CoinPaketKademe): CoinPaketHesap {
  const toplamCoin = k.coins + k.bonusCoins;
  return {
    sku: k.sku,
    title: k.title,
    priceTry: k.priceTry,
    priceUsd: k.priceUsd,
    coins: k.coins,
    bonusCoins: k.bonusCoins,
    toplamCoin,
    badge: k.badge,
    sortOrder: k.sortOrder,
  };
}

export function TumPaketHesaplari(): CoinPaketHesap[] {
  return CoinPaketKademeleriniAl()
    .filter((k) => k.isActiveDefault)
    .map(PaketHesapla);
}

/** @deprecated Oran tabanlı hesap — yeni sistemde kullanılmaz */
export function TabanCoinHesapla(priceTry: number): number {
  const p = Number(priceTry);
  if (!Number.isFinite(p) || p <= 0) return 0;
  const oran = CoinTryOraniCanli() || COIN_TRY_ORANI;
  return Math.max(1, Math.round(p / oran));
}

export function GulKarsiligi(toplamCoin: number): number {
  return Math.max(0, Math.floor(toplamCoin));
}
