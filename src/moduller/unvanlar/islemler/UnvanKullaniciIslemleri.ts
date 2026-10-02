import { supabase } from '../../../lib/supabase';
import { UnvanTasariminiDogrula } from '../dogrulama/UnvanTasarimZod';
import type { UnvanAtama } from '../tipler';

type Ham = Record<string, unknown>;

function ham(v: unknown): Ham {
  return v && typeof v === 'object' ? (v as Ham) : {};
}

function i18nMap(v: unknown): Record<string, string> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === 'string') out[k] = val;
  }
  return out;
}

function atamaParse(v: unknown): UnvanAtama | null {
  const d = ham(v);
  const titleId = typeof d.title_id === 'string' ? d.title_id : null;
  if (!titleId) return null;
  return {
    assignment_id: typeof d.assignment_id === 'string' ? d.assignment_id : String(d.id ?? ''),
    title_id: titleId,
    assigned_at: typeof d.assigned_at === 'string' ? d.assigned_at : '',
    starts_at: typeof d.starts_at === 'string' ? d.starts_at : '',
    expires_at: typeof d.expires_at === 'string' ? d.expires_at : null,
    selection_locked: d.selection_locked === true,
    assignment_source: typeof d.assignment_source === 'string' ? d.assignment_source : 'ADMIN',
    name: typeof d.name === 'string' ? d.name : '',
    slug: typeof d.slug === 'string' ? d.slug : '',
    name_i18n: i18nMap(d.name_i18n),
    design: UnvanTasariminiDogrula(d.design),
    priority: Number(d.priority) || 0,
    version: Number(d.version) || 0,
    currently_valid: d.currently_valid === true,
    expired: d.expired === true,
  };
}

export type UnvanBenimkilerSonuc = {
  ok: boolean;
  enabled: boolean;
  selected_title_id: string | null;
  display_title_id: string | null;
  items: UnvanAtama[];
  hata?: string;
};

export async function UnvanBenimkileriGetir(): Promise<UnvanBenimkilerSonuc> {
  const { data, error } = await supabase.rpc('user_titles_benimkiler');
  if (error) {
    return {
      ok: false,
      enabled: false,
      selected_title_id: null,
      display_title_id: null,
      items: [],
      hata: error.message,
    };
  }
  const d = ham(data);
  const rows = Array.isArray(d.items) ? d.items : [];
  return {
    ok: d.ok !== false,
    enabled: d.enabled !== false,
    selected_title_id: typeof d.selected_title_id === 'string' ? d.selected_title_id : null,
    display_title_id: typeof d.display_title_id === 'string' ? d.display_title_id : null,
    items: rows.map(atamaParse).filter((a): a is UnvanAtama => a !== null),
    hata: typeof d.error === 'string' ? d.error : undefined,
  };
}

/** p_title_id = null → gizle */
export async function UnvanSec(
  titleId: string | null,
): Promise<{ ok: boolean; selected_title_id: string | null; hata?: string; error_code?: string }> {
  const { data, error } = await supabase.rpc('user_title_sec', {
    p_title_id: titleId,
  });
  if (error) return { ok: false, selected_title_id: null, hata: error.message };
  const d = ham(data);
  return {
    ok: d.ok === true,
    selected_title_id: typeof d.selected_title_id === 'string' ? d.selected_title_id : null,
    hata: typeof d.error === 'string' ? d.error : undefined,
    error_code: typeof d.error_code === 'string' ? d.error_code : undefined,
  };
}

export async function UnvanGizle(): Promise<{
  ok: boolean;
  selected_title_id: string | null;
  hata?: string;
  error_code?: string;
}> {
  return UnvanSec(null);
}

/** Feed/yorum — user_id → görünen title_id */
export async function UnvanBatchGorunen(
  userIds: string[],
): Promise<Record<string, string | null>> {
  const uniq = [...new Set(userIds.filter(Boolean))];
  if (uniq.length === 0) return {};
  const { data, error } = await supabase.rpc('user_titles_batch_gorunen', {
    p_user_ids: uniq,
  });
  if (error) return {};
  const d = ham(data);
  const out: Record<string, string | null> = {};
  for (const id of uniq) {
    const v = d[id];
    out[id] = typeof v === 'string' ? v : null;
  }
  return out;
}
