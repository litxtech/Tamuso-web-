import { supabase } from '../../../lib/supabase';
import {
  ulkeLigiPeriodMu,
  type AdminUlkeLigiOzet,
  type AdminUlkeLigiUrun,
  type AdminUlkeLigiUygunluk,
  type BenimUlkeKatkisi,
  type UlkeDetay,
  type UlkeKatkici,
  type UlkeKatkiciSayfa,
  type UlkeKatkisiAyarlari,
  type UlkeLiderSatiri,
  type UlkeLiderSayfa,
  type UlkeLigiPeriod,
  type UlkeSehirSatiri,
} from '../tipler';

type Ham = Record<string, unknown>;

function ham(v: unknown): Ham {
  return v && typeof v === 'object' ? (v as Ham) : {};
}

function sayi(v: unknown, yedek = 0): number {
  const n = Number(v);
  return v == null || !Number.isFinite(n) ? yedek : n;
}

function sayiVeyaNull(v: unknown): number | null {
  const n = Number(v);
  return v == null || !Number.isFinite(n) ? null : n;
}

function metinVeyaNull(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function kodNormalize(v: unknown): string {
  return String(v ?? '')
    .trim()
    .toUpperCase()
    .slice(0, 2);
}

function liderParse(r: unknown, i: number): UlkeLiderSatiri {
  const d = ham(r);
  return {
    country_code: kodNormalize(d.country_code ?? d.code),
    points: sayi(d.points ?? d.contribution_points),
    rank: sayiVeyaNull(d.rank_pos) ?? sayiVeyaNull(d.rank) ?? i + 1,
    rank_delta: sayiVeyaNull(d.rank_delta ?? d.movement),
    contributor_count: sayiVeyaNull(d.contributor_count),
  };
}

function katkiciParse(r: unknown, i: number): UlkeKatkici {
  const d = ham(r);
  const anon = d.anonymous === true || d.is_anonymous === true;
  return {
    user_id: String(d.user_id ?? ''),
    display_name: anon
      ? null
      : typeof d.display_name === 'string'
        ? d.display_name
        : null,
    avatar_url: anon
      ? null
      : typeof d.avatar_url === 'string'
        ? d.avatar_url
        : null,
    points: sayi(d.points ?? d.contribution_points),
    rank: sayiVeyaNull(d.rank_pos) ?? sayiVeyaNull(d.rank) ?? i + 1,
    anonymous: anon,
  };
}

function sehirParse(r: unknown): UlkeSehirSatiri {
  const d = ham(r);
  return {
    city_id: String(d.city_id ?? d.id ?? ''),
    name: typeof d.name === 'string' ? d.name : '',
    power_score: sayi(d.power_score),
    supporter_count: sayiVeyaNull(d.supporter_count),
  };
}

function ayarParse(v: unknown): UlkeKatkisiAyarlari {
  const d = ham(v);
  return {
    include_in_totals: d.include_in_totals !== false,
    show_on_leaderboard: d.show_on_leaderboard !== false,
    show_on_profile: d.show_on_profile !== false,
    show_country_on_profile: d.show_country_on_profile !== false,
  };
}

function benimParse(v: unknown): BenimUlkeKatkisi {
  const d = ham(v);
  const ayar = ayarParse(d.settings ?? v);
  const code = kodNormalize(d.country_code);
  return {
    country_code: code.length === 2 ? code : null,
    points_weekly: sayi(d.points_weekly ?? d.weekly_points),
    points_all_time: sayi(d.points_all_time ?? d.all_time_points),
    rank_weekly: sayiVeyaNull(d.rank_weekly ?? d.world_weekly_rank),
    rank_all_time: sayiVeyaNull(d.rank_all_time ?? d.country_rank),
    gap_to_next_weekly: sayiVeyaNull(d.gap_to_next_weekly ?? d.gap_to_next),
    gap_to_next_all_time: sayiVeyaNull(d.gap_to_next_all_time),
    ...ayar,
    week_code: metinVeyaNull(d.week_code ?? d.week_id),
  };
}

function detayParse(v: unknown): UlkeDetay {
  const d = ham(v);
  return {
    country_code: kodNormalize(d.country_code ?? d.code),
    points_weekly: sayi(d.points_weekly ?? d.weekly_points),
    points_all_time: sayi(d.points_all_time ?? d.all_time_points),
    rank_weekly: sayiVeyaNull(d.rank_weekly ?? d.weekly_rank),
    rank_all_time: sayiVeyaNull(d.rank_all_time ?? d.all_time_rank),
    gap_to_next_weekly: sayiVeyaNull(d.gap_to_next_weekly ?? d.gap_to_next),
    gap_to_next_all_time: sayiVeyaNull(d.gap_to_next_all_time),
    contributor_count: sayiVeyaNull(
      d.contributor_count ??
        d.all_time_contributor_count ??
        d.weekly_contributor_count,
    ),
    city_count: sayiVeyaNull(d.city_count),
    league_enabled: d.league_enabled !== false && d.found !== false,
    week_code: metinVeyaNull(d.week_code ?? d.week_id),
  };
}

export async function UlkeLiderligiGetir(opts: {
  period: UlkeLigiPeriod;
  limit?: number;
  cursorRank?: number | null;
  search?: string | null;
}): Promise<UlkeLiderSayfa> {
  const period = ulkeLigiPeriodMu(opts.period) ? opts.period : 'weekly';
  const { data, error } = await supabase.rpc('get_country_leaderboard', {
    p_period: period,
    p_limit: opts.limit ?? 50,
    p_cursor_rank: opts.cursorRank ?? null,
    p_search: opts.search?.trim() || null,
  });
  if (error) throw error;

  const root = ham(data);
  const rawRows = Array.isArray(data)
    ? data
    : Array.isArray(root.rows)
      ? root.rows
      : Array.isArray(root.items)
        ? root.items
        : [];
  const rows = rawRows.map(liderParse).filter((r) => r.country_code.length === 2);
  return {
    rows,
    next_cursor_rank: sayiVeyaNull(root.next_cursor_rank),
    has_more: root.has_more === true || (rows.length > 0 && rows.length >= (opts.limit ?? 50)),
  };
}

export async function UlkeDetayGetir(countryCode: string): Promise<UlkeDetay> {
  const { data, error } = await supabase.rpc('get_country_detail', {
    p_country_code: kodNormalize(countryCode),
  });
  if (error) throw error;
  return detayParse(data);
}

export async function UlkeKatkicilariGetir(opts: {
  countryCode: string;
  period: UlkeLigiPeriod;
  limit?: number;
  cursorPoints?: number | null;
  cursorUserId?: string | null;
  search?: string | null;
}): Promise<UlkeKatkiciSayfa> {
  const period = ulkeLigiPeriodMu(opts.period) ? opts.period : 'weekly';
  const { data, error } = await supabase.rpc('get_country_contributors', {
    p_country_code: kodNormalize(opts.countryCode),
    p_period: period,
    p_limit: opts.limit ?? 40,
    p_cursor_points: opts.cursorPoints ?? null,
    p_cursor_user_id: opts.cursorUserId ?? null,
    p_search: opts.search?.trim() || null,
  });
  if (error) throw error;

  const root = ham(data);
  const rawRows = Array.isArray(data)
    ? data
    : Array.isArray(root.rows)
      ? root.rows
      : Array.isArray(root.items)
        ? root.items
        : [];
  const rows = rawRows.map(katkiciParse);
  return {
    rows,
    next_cursor_points: sayiVeyaNull(root.next_cursor_points),
    next_cursor_user_id: metinVeyaNull(root.next_cursor_user_id),
    has_more: root.has_more === true,
  };
}

export async function UlkeSehirleriGetir(
  countryCode: string,
  limit = 30,
): Promise<UlkeSehirSatiri[]> {
  const { data, error } = await supabase.rpc('get_country_cities', {
    p_country_code: kodNormalize(countryCode),
    p_limit: limit,
  });
  if (error) throw error;
  const root = ham(data);
  const rows = Array.isArray(data)
    ? data
    : Array.isArray(root.rows)
      ? root.rows
      : [];
  return rows.map(sehirParse).filter((r) => !!r.city_id);
}

export async function BenimUlkeKatkiGetir(): Promise<BenimUlkeKatkisi> {
  const { data, error } = await supabase.rpc('get_my_country_contribution');
  if (error) throw error;
  return benimParse(data);
}

export async function UlkeKatkisiAyarlariniGetir(): Promise<UlkeKatkisiAyarlari> {
  const { data, error } = await supabase.rpc('get_country_contribution_settings');
  if (error) throw error;
  return ayarParse(data);
}

export async function UlkeKatkisiAyarlariniKaydet(
  ayar: Partial<UlkeKatkisiAyarlari>,
): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('set_country_contribution_settings', {
    p_include_in_totals: ayar.include_in_totals ?? null,
    p_show_on_leaderboard: ayar.show_on_leaderboard ?? null,
    p_show_on_profile: ayar.show_on_profile ?? null,
    p_show_country_on_profile: ayar.show_country_on_profile ?? null,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

export async function AdminUlkeLigiOzetGetir(): Promise<AdminUlkeLigiOzet> {
  const { data, error } = await supabase.rpc('admin_country_league_overview');
  if (error) throw error;
  const d = ham(data);

  const eligibilityRaw = Array.isArray(d.eligibility) ? d.eligibility : [];
  const eligibility: AdminUlkeLigiUygunluk[] = eligibilityRaw.map((r) => {
    const x = ham(r);
    const category = String(x.category ?? x.key ?? '');
    return {
      category,
      label: typeof x.label === 'string' ? x.label : category,
      enabled: x.enabled === true,
    };
  });

  const productsRaw = Array.isArray(d.products) ? d.products : [];
  const products: AdminUlkeLigiUrun[] = productsRaw.map((r) => {
    const x = ham(r);
    return {
      product_id: String(x.product_id ?? x.id ?? ''),
      points: sayi(x.points ?? x.contribution_points),
      enabled: x.enabled !== false,
      label: typeof x.label === 'string' ? x.label : null,
    };
  });

  const countries = Array.isArray(d.countries) ? d.countries : [];
  return {
    ok: d.ok !== false,
    total_countries: sayiVeyaNull(d.total_countries) ?? countries.length,
    enabled_countries:
      sayiVeyaNull(d.enabled_countries) ??
      countries.filter((c) => ham(c).league_enabled !== false).length,
    weekly_points: sayiVeyaNull(d.weekly_points ?? d.points_weekly),
    all_time_points: sayiVeyaNull(d.all_time_points ?? d.points_all_time),
    active_contributors: sayiVeyaNull(
      d.active_contributors ?? d.event_count,
    ),
    week_code: metinVeyaNull(d.week_code ?? d.week_id),
    eligibility,
    products,
    generated_at: metinVeyaNull(d.generated_at),
  };
}

export async function AdminUlkeLigiUygunlukAyarla(
  category: string,
  enabled: boolean,
): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('admin_country_league_set_eligibility', {
    p_category: category,
    p_enabled: enabled,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

export async function AdminUlkeLigiUrunPuanAyarla(
  productId: string,
  points: number,
  enabled: boolean,
): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('admin_country_league_set_product_points', {
    p_product_id: productId,
    p_points: points,
    p_enabled: enabled,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

export async function AdminUlkeLigiUlkeAktiflikAyarla(
  countryCode: string,
  enabled: boolean,
  reason: string,
): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('admin_country_league_set_country_enabled', {
    p_country_code: kodNormalize(countryCode),
    p_enabled: enabled,
    p_reason: reason,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

/** Yalnızca PROMOTIONAL olay — gerçek satın alma değil */
export async function AdminUlkeLigiPromoPuan(
  countryCode: string,
  points: number,
  reason: string,
): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('admin_country_league_promotional_points', {
    p_country_code: kodNormalize(countryCode),
    p_points: points,
    p_reason: reason,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

export async function AdminUlkeLigiHaftayiKapat(): Promise<{
  ok: boolean;
  hata?: string;
  week_code?: string | null;
}> {
  const { data, error } = await supabase.rpc('admin_country_league_close_week');
  if (error) return { ok: false, hata: error.message };
  const d = ham(data);
  return {
    ok: d.ok !== false,
    week_code: metinVeyaNull(d.week_code),
  };
}
