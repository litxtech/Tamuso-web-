/** Banner size / aspect ratio config — hardcode yok, buradan gelir */

import i18n from '../../i18n';

export type BannerSizeType = 'SMALL' | 'MEDIUM' | 'LARGE' | 'HERO' | 'CUSTOM';

export const BANNER_SIZE_PRESETS: Record<
  Exclude<BannerSizeType, 'CUSTOM'>,
  { aspectRatio: string; numeric: number }
> = {
  /** Yatay şerit — feed için varsayılan */
  SMALL: { aspectRatio: '4:1', numeric: 4 / 1 },
  MEDIUM: { aspectRatio: '16:5', numeric: 16 / 5 },
  LARGE: { aspectRatio: '16:6', numeric: 16 / 6 },
  HERO: { aspectRatio: '16:7', numeric: 16 / 7 },
};

/** Feed / otomatik oda tanıtım şeridi */
export const BANNER_STRIP_ASPECT = '4:1';
export const BANNER_STRIP_MAX_HEIGHT = 92;
export const BANNER_COMPACT_MAX_HEIGHT = 92;

/**
 * Ses odası kartı oranı (AnaSayfaFeedKart FEED_KART_ORANI = 0.76).
 * Otomatik oda tanıtımları feed’de kart boyutunda görünür.
 */
export const BANNER_ROOM_CARD_ASPECT = '19:25';
export const BANNER_ROOM_CARD_NUMERIC = 19 / 25;
export const BANNER_ROOM_CARD_TAG = 'ROOM_CARD';

/** Manuel kampanya — sadece feed (ses odası / diğer yüzeyler yok) */
export const MANUAL_BANNER_SCREEN_KEYS = ['FEED'] as const;
export const MANUAL_BANNER_PLACEMENT_KEYS = [
  'FEED_TOP',
  'FEED_AFTER_POST_3',
  'FEED_AFTER_POST_4',
  'FEED_AFTER_POST_6',
  'FEED_AFTER_POST_8',
  'FEED_AFTER_POST_10',
  'FEED_AFTER_POST_14',
  'FEED_INLINE',
] as const;

/** Otomatik tanıtım placement’ları (oda / canlı / oyun) */
export const AUTO_ROOM_PROMO_PLACEMENTS = {
  oda: 'FEED_AFTER_POST_6',
  canli: 'FEED_AFTER_POST_14',
  oyun: 'HOME_BOTTOM',
} as const;

/** Ana feed: N. içerikten sonra banner slotları */
export const FEED_AUTO_BANNER_AFTER_INDEXES = [6, 14] as const;
/** Geriye uyumluluk */
export const FEED_BANNER_AFTER_INDEXES = FEED_AUTO_BANNER_AFTER_INDEXES;

export const BANNER_CUSTOM_ASPECT_OPTIONS = [
  '4:1',
  '3:1',
  '1.91:1',
  '16:9',
  '2:1',
  '16:5',
  '16:6',
  '16:7',
  '19:25',
] as const;

export function parseAspectRatio(ratio: string | null | undefined): number {
  if (!ratio) return BANNER_SIZE_PRESETS.SMALL.numeric;
  const cleaned = ratio.trim().replace(/\s/g, '');
  if (cleaned.includes(':')) {
    const [a, b] = cleaned.split(':').map(Number);
    if (a > 0 && b > 0) return a / b;
  }
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : BANNER_SIZE_PRESETS.SMALL.numeric;
}

export function resolveBannerAspect(
  sizeType: BannerSizeType,
  customRatio?: string | null,
): number {
  if (sizeType === 'CUSTOM') return parseAspectRatio(customRatio);
  return BANNER_SIZE_PRESETS[sizeType]?.numeric ?? BANNER_SIZE_PRESETS.SMALL.numeric;
}

export const BANNER_CACHE_TTL_MS = 90_000;
export const BANNER_IMPRESSION_VISIBLE_RATIO = 0.5;
export const BANNER_IMPRESSION_MIN_MS = 500;
export const BANNER_TAP_MAX_MOVE_PX = 12;
export const BANNER_CAROUSEL_DEFAULT_MS = 3000;
export const BANNER_STORAGE_BUCKET = 'banner-media';
export const BANNER_BORDER_RADIUS = 16;
export const BANNER_BG = 'rgba(24,20,38,0.92)';
export const BANNER_BORDER = 'rgba(255,255,255,0.08)';


export const BANNER_SCREEN_KEYS = [
  'HOME',
  'FEED',
  'DISCOVER',
  'MESSAGES',
  'PROFILE',
  'VOICE_ROOM',
  'GAME_CENTER',
  'SETTINGS',
  'MARKET',
  'LIVE',
] as const;

export type BannerScreenKey = (typeof BANNER_SCREEN_KEYS)[number] | (string & {});

export const BANNER_PLACEMENT_KEYS = [
  'FEED_TOP',
  'FEED_AFTER_POST_3',
  'FEED_AFTER_POST_4',
  'FEED_AFTER_POST_6',
  'FEED_AFTER_POST_8',
  'FEED_AFTER_POST_10',
  'FEED_AFTER_POST_14',
  'FEED_INLINE',
  'DISCOVER_TOP',
  'DISCOVER_MIDDLE',
  'DISCOVER_BOTTOM',
  'MESSAGES_TOP',
  'PROFILE_TOP',
  'PROFILE_MIDDLE',
  'VOICE_ROOM_TOP',
  'VOICE_ROOM_BOTTOM',
  'GAME_CENTER_TOP',
  'GAME_CENTER_MIDDLE',
  'HOME_TOP',
  'HOME_MIDDLE',
  'HOME_BOTTOM',
] as const;

export type BannerPlacementKey =
  | (typeof BANNER_PLACEMENT_KEYS)[number]
  | (string & {});

export const BANNER_TAG_PRESETS = [
  'NEW',
  'HOT',
  'LIVE',
  'PROMOTION',
  'SPECIAL',
  'EVENT',
  'GAME',
  'HOTEL',
  'SPONSORED',
  'ROOM_CARD',
] as const;

export function bannerScreenLabel(key: string): string {
  const t = i18n.t(`banner.screen.${key}`);
  return t || key;
}

export function bannerPlacementLabel(key: string): string {
  const t = i18n.t(`banner.placement.${key}`);
  return t || key;
}

/** Lazy i18n — dil değişince doğru etiket */
export const SCREEN_LABELS: Record<string, string> = new Proxy(
  {} as Record<string, string>,
  {
    get(_target, prop: string | symbol) {
      if (typeof prop !== 'string') return undefined;
      // React / LogBox `$$typeof` okuması → sahte missing-key gürültüsü
      if (prop === '$$typeof' || prop.startsWith('@@')) return undefined;
      return bannerScreenLabel(prop);
    },
  },
);

export const PLACEMENT_LABELS: Record<string, string> = new Proxy(
  {} as Record<string, string>,
  {
    get(_target, prop: string | symbol) {
      if (typeof prop !== 'string') return undefined;
      if (prop === '$$typeof' || prop.startsWith('@@')) return undefined;
      return bannerPlacementLabel(prop);
    },
  },
);
