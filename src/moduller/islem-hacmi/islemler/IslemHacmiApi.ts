import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import {
  gorunurlukMu,
  type AdminIslemHacmiOzet,
  type AdminIslemHacmiUygunluk,
  type BenimIslemHacmim,
  type IslemHacmiAyarlari,
  type IslemHacmiKademe,
  type IslemHacmiLiderSatiri,
  type KamuIslemHacmi,
} from '../tipler';

type Ham = Record<string, unknown>;

function ham(v: unknown): Ham {
  return v && typeof v === 'object' ? (v as Ham) : {};
}

function sayiVeyaNull(v: unknown): number | null {
  const n = Number(v);
  return v == null || !Number.isFinite(n) ? null : n;
}

function kademeParse(v: unknown): IslemHacmiKademe | null {
  const t = ham(v);
  if (typeof t.id !== 'string' && typeof t.id !== 'number') return null;
  const thr = sayiVeyaNull(t.threshold_try) ?? sayiVeyaNull(t.min_amount_try);
  return {
    id: String(t.id),
    name: typeof t.name === 'string' ? t.name : '',
    display_label: typeof t.display_label === 'string' ? t.display_label : '',
    badge_key: typeof t.badge_key === 'string' ? t.badge_key : null,
    frame_key: typeof t.frame_key === 'string' ? t.frame_key : null,
    effect_key: typeof t.effect_key === 'string' ? t.effect_key : null,
    threshold_try: thr,
    min_amount_try: thr,
    sort_order: sayiVeyaNull(t.sort_order),
    is_active: t.is_active !== false,
    icon: typeof t.icon === 'string' ? t.icon : null,
  };
}

function kamuParse(v: unknown): KamuIslemHacmi {
  const d = ham(v);
  const visibility = gorunurlukMu(d.visibility) ? d.visibility : 'PRIVATE';
  const visible =
    d.visible === false ? false : d.visible === true ? true : visibility !== 'PRIVATE';
  return {
    enabled: d.enabled !== false,
    visible,
    visibility,
    amount_try: sayiVeyaNull(d.amount_try),
    display_label: typeof d.display_label === 'string' ? d.display_label : null,
    tier: kademeParse(d.tier),
    show_badge: d.show_badge !== false,
    show_frame: d.show_frame !== false,
    show_effect: d.show_effect === true,
    is_owner: d.is_owner === true,
    hidden_from_others: d.hidden_from_others === true || visibility === 'PRIVATE',
  };
}

function benimParse(v: unknown): BenimIslemHacmim {
  const d = ham(v);
  return {
    ...kamuParse(v),
    visible: true,
    is_owner: true,
    next_tier: kademeParse(d.next_tier),
    remaining_try: sayiVeyaNull(d.remaining_try),
    eligible_purchase_count: sayiVeyaNull(d.eligible_purchase_count),
    progress_01: sayiVeyaNull(d.progress_01),
    show_in_leaderboard: d.show_in_leaderboard !== false,
  };
}

export async function BenimIslemHacmimiGetir(): Promise<BenimIslemHacmim> {
  const { data, error } = await supabase.rpc('get_my_transaction_volume');
  if (error) throw error;
  return benimParse(data);
}

export async function KamuIslemHacminiGetir(userId: string): Promise<KamuIslemHacmi> {
  const { data, error } = await supabase.rpc('get_public_transaction_volume', {
    p_user_id: userId,
  });
  if (error) throw error;
  return kamuParse(data);
}

export async function IslemHacmiAyarlariniKaydet(
  ayar: Partial<IslemHacmiAyarlari> & { visibility?: IslemHacmiAyarlari['visibility'] },
): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('set_transaction_volume_settings', {
    p_visibility: ayar.visibility ?? null,
    p_show_badge: ayar.show_badge ?? null,
    p_show_frame: ayar.show_frame ?? null,
    p_show_effect: ayar.show_effect ?? null,
    p_show_in_leaderboard: ayar.show_in_leaderboard ?? null,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

export async function IslemHacmiLiderligiGetir(
  limit = 50,
): Promise<IslemHacmiLiderSatiri[]> {
  const { data, error } = await supabase.rpc('transaction_volume_leaderboard', {
    p_limit: limit,
  });
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return rows.map((r, i) => {
    const d = ham(r);
    const tier = kademeParse(d.tier);
    return {
      user_id: String(d.user_id ?? ''),
      display_name: typeof d.display_name === 'string' ? d.display_name : null,
      avatar_url: typeof d.avatar_url === 'string' ? d.avatar_url : null,
      amount_try: sayiVeyaNull(d.amount_try),
      tier_label:
        typeof d.display_label === 'string'
          ? d.display_label
          : tier?.display_label ?? null,
      rank: sayiVeyaNull(d.rank_pos) ?? sayiVeyaNull(d.rank) ?? i + 1,
    };
  });
}

export async function AdminIslemHacmiOzetGetir(): Promise<AdminIslemHacmiOzet> {
  const { data, error } = await supabase.rpc('admin_transaction_volume_dashboard');
  if (error) throw error;
  return ham(data) as AdminIslemHacmiOzet;
}

export async function AdminIslemHacmiKademeleriListele(): Promise<IslemHacmiKademe[]> {
  const { data, error } = await supabase.rpc('admin_transaction_volume_tiers_list');
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return rows.map(kademeParse).filter((t): t is IslemHacmiKademe => t !== null);
}

export async function AdminIslemHacmiKademeKaydet(
  kademe: Partial<IslemHacmiKademe>,
): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('admin_transaction_volume_tier_upsert', {
    p_id: kademe.id ?? null,
    p_name: kademe.name ?? '',
    p_threshold_try: Number(kademe.threshold_try ?? kademe.min_amount_try ?? 0),
    p_display_label: kademe.display_label ?? '',
    p_badge_key: kademe.badge_key ?? null,
    p_frame_key: kademe.frame_key ?? null,
    p_effect_key: kademe.effect_key ?? null,
    p_icon: kademe.icon ?? null,
    p_is_active: kademe.is_active !== false,
    p_sort_order: Number(kademe.sort_order ?? 0),
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

export async function AdminIslemHacmiKademePasifle(
  id: string,
  mevcut?: IslemHacmiKademe,
): Promise<{ ok: boolean; hata?: string }> {
  if (!mevcut) {
    const list = await AdminIslemHacmiKademeleriListele();
    mevcut = list.find((t) => t.id === id);
  }
  if (!mevcut) return { ok: false, hata: i18n.t('islemHacmi.kademeBulunamadi') as string };
  return AdminIslemHacmiKademeKaydet({ ...mevcut, is_active: false });
}

export async function AdminIslemHacmiDuzelt(
  userId: string,
  tutarDelta: number,
  sebep: string,
): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('admin_transaction_volume_adjust', {
    p_user_id: userId,
    p_amount_delta: tutarDelta,
    p_reason: sebep,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

export async function AdminIslemHacmiYenidenHesapla(
  userId?: string,
): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('admin_transaction_volume_recalculate', {
    p_user_id: userId ?? null,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

export async function AdminIslemHacmiUygunlukGetir(): Promise<AdminIslemHacmiUygunluk[]> {
  const { data, error } = await supabase.rpc('admin_transaction_volume_eligibility_get');
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return rows.map((r) => {
    const d = ham(r);
    const category = String(d.category ?? d.key ?? '');
    return {
      category,
      key: category,
      label: typeof d.label === 'string' ? d.label : category,
      enabled: d.enabled === true,
      recalc_required: d.recalc_required === true,
    };
  });
}

export async function AdminIslemHacmiUygunlukAyarla(
  category: string,
  enabled: boolean,
): Promise<{ ok: boolean; hata?: string; recalculation_required?: boolean }> {
  const { data, error } = await supabase.rpc('admin_transaction_volume_eligibility_set', {
    p_category: category,
    p_enabled: enabled,
  });
  if (error) return { ok: false, hata: error.message };
  const d = ham(data);
  return {
    ok: d.ok !== false,
    recalculation_required: d.recalculation_required === true,
  };
}
