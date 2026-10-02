/** Olay tabanlı otomatik banner ayarları / liste */

import i18n from '../../i18n';

export type AutoBannerKind =
  | 'room_coins'
  | 'live_coins'
  | 'seats_full'
  | 'game_coins'
  | 'gift_burst';

export type AutoBannerAyarlari = {
  enabled: boolean;
  feature_flag: boolean;
  ttl_hours: number;
  cooldown_hours: number;
  room_coin_threshold: number;
  live_coin_threshold: number;
  game_coin_threshold: number;
  seats_full_enabled: boolean;
  room_coins_enabled: boolean;
  live_coins_enabled: boolean;
  game_coins_enabled: boolean;
  gift_burst_enabled: boolean;
  gift_burst_window_sec: number;
  gift_burst_coin_threshold: number;
  milestone_enabled: boolean;
  max_active: number;
  carousel_max: number;
  updated_at?: string;
};

export type AutoBannerKayit = {
  id: string;
  kind: AutoBannerKind;
  source_key: string;
  ref_type: 'room' | 'live_session' | 'game';
  ref_id: string;
  title: string;
  subtitle: string | null;
  badge: string | null;
  media_url: string | null;
  gradient_json: { colors?: string[] } | null;
  action_type: string;
  action_target: string;
  metric_value: number;
  active: boolean;
  pinned?: boolean;
  admin_priority?: number;
  milestone?: number;
  score?: number;
  created_at: string;
  expires_at: string;
  deactivated_at: string | null;
  deactivate_reason: string | null;
};

export function autoBannerKindLabel(kind: AutoBannerKind): string {
  return i18n.t(`banner.auto.${kind}`);
}

/** Lazy i18n — dil değişince doğru etiket */
export const AUTO_BANNER_KIND_LABELS: Record<AutoBannerKind, string> = new Proxy(
  {} as Record<AutoBannerKind, string>,
  {
    get(_target, prop: string | symbol) {
      if (typeof prop !== 'string') return undefined;
      if (prop === '$$typeof' || prop.startsWith('@@')) return undefined;
      return autoBannerKindLabel(prop as AutoBannerKind);
    },
  },
);

export const AUTO_BANNER_AYAR_VARSAYILAN: AutoBannerAyarlari = {
  enabled: true,
  feature_flag: true,
  ttl_hours: 12,
  cooldown_hours: 12,
  room_coin_threshold: 50000,
  live_coin_threshold: 50000,
  game_coin_threshold: 10000,
  seats_full_enabled: true,
  room_coins_enabled: true,
  live_coins_enabled: true,
  game_coins_enabled: true,
  gift_burst_enabled: true,
  gift_burst_window_sec: 120,
  gift_burst_coin_threshold: 10000,
  milestone_enabled: true,
  max_active: 20,
  carousel_max: 8,
};
