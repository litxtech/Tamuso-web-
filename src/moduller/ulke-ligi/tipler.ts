/** Ülke Ligi / Country Contribution — tip sözleşmeleri. RPC yanıtları defansif parse edilir. */

export type UlkeLigiPeriod = 'weekly' | 'all_time';

export function ulkeLigiPeriodMu(v: unknown): v is UlkeLigiPeriod {
  return v === 'weekly' || v === 'all_time';
}

/** get_country_leaderboard satırı */
export type UlkeLiderSatiri = {
  country_code: string;
  points: number;
  rank: number;
  /** Pozitif = yükseldi, negatif = düştü; yoksa null */
  rank_delta: number | null;
  contributor_count: number | null;
};

/** get_country_detail */
export type UlkeDetay = {
  country_code: string;
  points_weekly: number;
  points_all_time: number;
  rank_weekly: number | null;
  rank_all_time: number | null;
  gap_to_next_weekly: number | null;
  gap_to_next_all_time: number | null;
  contributor_count: number | null;
  city_count: number | null;
  league_enabled: boolean;
  week_code: string | null;
};

/** get_country_contributors satırı */
export type UlkeKatkici = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  points: number;
  rank: number | null;
  /** Gizlilik: kimlik gizlenmiş */
  anonymous: boolean;
};

/** get_country_cities satırı */
export type UlkeSehirSatiri = {
  city_id: string;
  name: string;
  power_score: number;
  supporter_count: number | null;
};

/** get_my_country_contribution */
export type BenimUlkeKatkisi = {
  country_code: string | null;
  points_weekly: number;
  points_all_time: number;
  rank_weekly: number | null;
  rank_all_time: number | null;
  gap_to_next_weekly: number | null;
  gap_to_next_all_time: number | null;
  include_in_totals: boolean;
  show_on_leaderboard: boolean;
  show_on_profile: boolean;
  show_country_on_profile: boolean;
  week_code: string | null;
};

/** get_country_contribution_settings / set_* */
export type UlkeKatkisiAyarlari = {
  include_in_totals: boolean;
  show_on_leaderboard: boolean;
  show_on_profile: boolean;
  show_country_on_profile: boolean;
};

/** admin_country_league_overview */
export type AdminUlkeLigiOzet = {
  ok: boolean;
  total_countries: number | null;
  enabled_countries: number | null;
  weekly_points: number | null;
  all_time_points: number | null;
  active_contributors: number | null;
  week_code: string | null;
  eligibility: AdminUlkeLigiUygunluk[];
  products: AdminUlkeLigiUrun[];
  generated_at: string | null;
};

export type AdminUlkeLigiUygunluk = {
  category: string;
  label: string | null;
  enabled: boolean;
};

export type AdminUlkeLigiUrun = {
  product_id: string;
  points: number;
  enabled: boolean;
  label: string | null;
};

export type UlkeLiderSayfa = {
  rows: UlkeLiderSatiri[];
  next_cursor_rank: number | null;
  has_more: boolean;
};

export type UlkeKatkiciSayfa = {
  rows: UlkeKatkici[];
  next_cursor_points: number | null;
  next_cursor_user_id: string | null;
  has_more: boolean;
};
