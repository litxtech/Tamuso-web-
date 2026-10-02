/** İşlem Hacmi — tip sözleşmeleri. RPC yanıtları defansif parse edilir. */

export type IslemHacmiGorunurluk = 'FULL' | 'TIER_ONLY' | 'PRIVATE';

export const ISLEM_HACMI_GORUNURLUKLER: readonly IslemHacmiGorunurluk[] = [
  'FULL',
  'TIER_ONLY',
  'PRIVATE',
] as const;

export function gorunurlukMu(v: unknown): v is IslemHacmiGorunurluk {
  return v === 'FULL' || v === 'TIER_ONLY' || v === 'PRIVATE';
}

export type IslemHacmiKademe = {
  id: string;
  name: string;
  display_label: string;
  badge_key: string | null;
  frame_key: string | null;
  effect_key: string | null;
  /** Backend: threshold_try */
  threshold_try?: number | null;
  min_amount_try?: number | null;
  sort_order?: number | null;
  is_active?: boolean;
  icon?: string | null;
};

/** get_public_transaction_volume yanıtı */
export type KamuIslemHacmi = {
  enabled: boolean;
  /** false → ziyaretçiye kart gösterme (PRIVATE) */
  visible?: boolean;
  visibility: IslemHacmiGorunurluk;
  /** FULL veya sahip değilse null / alan yok */
  amount_try: number | null;
  /** Kademe etiketi veya biçimlenmiş tutar */
  display_label: string | null;
  tier: IslemHacmiKademe | null;
  show_badge: boolean;
  show_frame: boolean;
  show_effect: boolean;
  is_owner: boolean;
  /** Sahip PRIVATE seçtiyse true — kart sadece sahibine görünür */
  hidden_from_others?: boolean;
};

/** get_my_transaction_volume yanıtı — kamu alanları + sahip detayları */
export type BenimIslemHacmim = KamuIslemHacmi & {
  next_tier: IslemHacmiKademe | null;
  remaining_try: number | null;
  eligible_purchase_count: number | null;
  /** 0..1 arası kademe ilerlemesi */
  progress_01: number | null;
  show_in_leaderboard?: boolean;
};

export type IslemHacmiAyarlari = {
  visibility: IslemHacmiGorunurluk;
  show_badge: boolean;
  show_frame: boolean;
  show_effect: boolean;
  show_in_leaderboard: boolean;
};

export type IslemHacmiLiderSatiri = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  amount_try: number | null;
  tier_label: string | null;
  rank: number;
};

/** admin_transaction_volume_dashboard yanıtı */
export type AdminIslemHacmiOzet = {
  ok?: boolean;
  total_volume_try?: number | null;
  today_try?: number | null;
  week_try?: number | null;
  month_try?: number | null;
  active_users?: number | null;
  refund_adjustments_try?: number | null;
  tier_distribution?: unknown;
  generated_at?: string | null;
  [k: string]: unknown;
};

export type AdminIslemHacmiUygunluk = {
  category: string;
  key?: string;
  label?: string | null;
  enabled: boolean;
  recalc_required?: boolean;
};
