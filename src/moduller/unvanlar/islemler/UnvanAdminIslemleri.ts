import { supabase } from '../../../lib/supabase';
import { UnvanTasariminiDogrula } from '../dogrulama/UnvanTasarimZod';
import { UnvanKatalogCache } from '../onbellek/UnvanKatalogCache';
import type { UnvanAdminKaydetGirdi, UnvanAtaGirdi, UnvanKayit } from '../tipler';

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

function kayitParse(v: unknown): UnvanKayit | null {
  const d = ham(v);
  if (typeof d.id !== 'string' || !d.id) return null;
  return {
    id: d.id,
    slug: typeof d.slug === 'string' ? d.slug : '',
    name: typeof d.name === 'string' ? d.name : '',
    name_i18n: i18nMap(d.name_i18n),
    design: UnvanTasariminiDogrula(d.design),
    version: Number(d.version) || 0,
    priority: Number(d.priority) || 0,
    updated_at: typeof d.updated_at === 'string' ? d.updated_at : undefined,
    description: typeof d.description === 'string' ? d.description : null,
    is_active: d.is_active !== false,
    archived_at: typeof d.archived_at === 'string' ? d.archived_at : null,
    selection_locked: d.selection_locked === true,
    created_at: typeof d.created_at === 'string' ? d.created_at : undefined,
    active_user_count: Number.isFinite(Number(d.active_user_count))
      ? Number(d.active_user_count)
      : undefined,
    total_assignment_count: Number.isFinite(Number(d.total_assignment_count))
      ? Number(d.total_assignment_count)
      : undefined,
    metadata:
      d.metadata && typeof d.metadata === 'object'
        ? (d.metadata as Record<string, unknown>)
        : undefined,
  };
}

export type AdminUnvanListeFiltre = 'all' | 'active' | 'inactive';
export type AdminUnvanListeSort = 'newest' | 'name' | 'priority' | 'most_assigned';

export async function AdminUnvanKaydet(
  girdi: UnvanAdminKaydetGirdi,
): Promise<{ ok: boolean; title?: UnvanKayit; hata?: string; error?: string; error_code?: string }> {
  const { data, error } = await supabase.rpc('admin_user_title_kaydet', {
    p_id: girdi.id ?? null,
    p_slug: girdi.slug ?? null,
    p_name: girdi.name,
    p_description: girdi.description ?? null,
    p_name_i18n: girdi.name_i18n ?? null,
    p_design: girdi.design ?? {},
    p_is_active: girdi.is_active ?? true,
    p_selection_locked: girdi.selection_locked ?? false,
    p_priority: girdi.priority ?? 100,
    p_metadata: girdi.metadata ?? {},
  });
  if (error) return { ok: false, hata: error.message, error: error.message };
  const d = ham(data);
  if (d.ok === true) {
    void UnvanKatalogCache.yukle({ force: true });
  }
  const hata = typeof d.error === 'string' ? d.error : undefined;
  return {
    ok: d.ok === true,
    title: kayitParse(d.title) ?? undefined,
    hata,
    error: hata,
    error_code: typeof d.error_code === 'string' ? d.error_code : undefined,
  };
}

export async function AdminUnvanArsivle(
  id: string,
): Promise<{ ok: boolean; hata?: string; error?: string; error_code?: string }> {
  const { data, error } = await supabase.rpc('admin_user_title_arsivle', { p_id: id });
  if (error) return { ok: false, hata: error.message, error: error.message };
  const d = ham(data);
  if (d.ok === true) void UnvanKatalogCache.yukle({ force: true });
  const hata = typeof d.error === 'string' ? d.error : undefined;
  return {
    ok: d.ok === true,
    hata,
    error: hata,
    error_code: typeof d.error_code === 'string' ? d.error_code : undefined,
  };
}

export async function AdminUnvanKopyala(
  id: string,
  newName?: string | null,
): Promise<{ ok: boolean; title?: UnvanKayit; hata?: string; error?: string; error_code?: string }> {
  const { data, error } = await supabase.rpc('admin_user_title_kopyala', {
    p_id: id,
    p_new_name: newName ?? null,
  });
  if (error) return { ok: false, hata: error.message, error: error.message };
  const d = ham(data);
  if (d.ok === true) void UnvanKatalogCache.yukle({ force: true });
  const hata = typeof d.error === 'string' ? d.error : undefined;
  return {
    ok: d.ok === true,
    title: kayitParse(d.title) ?? undefined,
    hata,
    error: hata,
    error_code: typeof d.error_code === 'string' ? d.error_code : undefined,
  };
}

export async function AdminUnvanlariListele(opts?: {
  q?: string | null;
  filter?: AdminUnvanListeFiltre;
  sort?: AdminUnvanListeSort;
  limit?: number;
  offset?: number;
}): Promise<{ ok: boolean; items: UnvanKayit[]; hata?: string; error?: string }> {
  const { data, error } = await supabase.rpc('admin_user_titles_liste', {
    p_q: opts?.q ?? null,
    p_filter: opts?.filter ?? 'all',
    p_sort: opts?.sort ?? 'newest',
    p_limit: opts?.limit ?? 50,
    p_offset: opts?.offset ?? 0,
  });
  if (error) return { ok: false, items: [], hata: error.message, error: error.message };
  const d = ham(data);
  const rows = Array.isArray(d.items) ? d.items : [];
  const hata = typeof d.error === 'string' ? d.error : undefined;
  return {
    ok: d.ok !== false,
    items: rows.map(kayitParse).filter((r): r is UnvanKayit => r !== null),
    hata,
    error: hata,
  };
}

/** @deprecated alias — AdminUnvanlariListele */
export const AdminUnvanListele = AdminUnvanlariListele;

export type AdminUnvanDetayStats = {
  active_users: number;
  total_assignments: number;
  timed_assignments: number;
  selected_users: number;
};

export async function AdminUnvanDetay(
  id: string,
): Promise<{
  ok: boolean;
  title?: UnvanKayit;
  stats?: AdminUnvanDetayStats;
  hata?: string;
  error_code?: string;
}> {
  const { data, error } = await supabase.rpc('admin_user_title_detay', { p_id: id });
  if (error) return { ok: false, hata: error.message };
  const d = ham(data);
  const s = ham(d.stats);
  return {
    ok: d.ok === true,
    title: kayitParse(d.title) ?? undefined,
    stats: d.stats
      ? {
          active_users: Number(s.active_users) || 0,
          total_assignments: Number(s.total_assignments) || 0,
          timed_assignments: Number(s.timed_assignments) || 0,
          selected_users: Number(s.selected_users) || 0,
        }
      : undefined,
    hata: typeof d.error === 'string' ? d.error : undefined,
    error_code: typeof d.error_code === 'string' ? d.error_code : undefined,
  };
}

export async function AdminUnvanAta(
  girdi: UnvanAtaGirdi,
): Promise<{ ok: boolean; assignment?: Ham; hata?: string; error_code?: string }> {
  const { data, error } = await supabase.rpc('admin_user_title_ata', {
    p_user_id: girdi.userId,
    p_title_id: girdi.titleId,
    p_starts_at: girdi.startsAt ?? null,
    p_expires_at: girdi.expiresAt ?? null,
    p_set_selected: girdi.setSelected ?? true,
    p_selection_locked: girdi.selectionLocked ?? false,
    p_reason: girdi.reason ?? null,
    p_notify_user: girdi.notifyUser ?? false,
    p_assignment_source: girdi.assignmentSource ?? 'ADMIN',
  });
  if (error) return { ok: false, hata: error.message };
  const d = ham(data);
  return {
    ok: d.ok === true,
    assignment: d.assignment && typeof d.assignment === 'object' ? ham(d.assignment) : undefined,
    hata: typeof d.error === 'string' ? d.error : undefined,
    error_code: typeof d.error_code === 'string' ? d.error_code : undefined,
  };
}

export async function AdminUnvanTopluAta(opts: {
  userIds: string[];
  titleId: string;
  startsAt?: string | null;
  expiresAt?: string | null;
  setSelected?: boolean;
  selectionLocked?: boolean;
  reason?: string | null;
  notifyUser?: boolean;
}): Promise<{
  ok: boolean;
  success_count?: number;
  fail_count?: number;
  hata?: string;
  error_code?: string;
}> {
  const { data, error } = await supabase.rpc('admin_user_title_toplu_ata', {
    p_user_ids: opts.userIds,
    p_title_id: opts.titleId,
    p_starts_at: opts.startsAt ?? null,
    p_expires_at: opts.expiresAt ?? null,
    p_set_selected: opts.setSelected ?? true,
    p_selection_locked: opts.selectionLocked ?? false,
    p_reason: opts.reason ?? null,
    p_notify_user: opts.notifyUser ?? false,
  });
  if (error) return { ok: false, hata: error.message };
  const d = ham(data);
  return {
    ok: d.ok === true,
    success_count: Number(d.success_count) || 0,
    fail_count: Number(d.fail_count) || 0,
    hata: typeof d.error === 'string' ? d.error : undefined,
    error_code: typeof d.error_code === 'string' ? d.error_code : undefined,
  };
}

export async function AdminUnvanGeriAl(opts: {
  assignmentId?: string | null;
  userId?: string | null;
  titleId?: string | null;
}): Promise<{ ok: boolean; hata?: string; error_code?: string }> {
  const { data, error } = await supabase.rpc('admin_user_title_geri_al', {
    p_assignment_id: opts.assignmentId ?? null,
    p_user_id: opts.userId ?? null,
    p_title_id: opts.titleId ?? null,
  });
  if (error) return { ok: false, hata: error.message };
  const d = ham(data);
  return {
    ok: d.ok === true,
    hata: typeof d.error === 'string' ? d.error : undefined,
    error_code: typeof d.error_code === 'string' ? d.error_code : undefined,
  };
}

export type AdminUnvanAtanan = {
  assignment_id: string;
  user_id: string;
  assigned_at: string;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
  revoked_at: string | null;
  selection_locked: boolean;
  assignment_source: string;
  reason: string | null;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  public_user_id: string | null;
  is_selected: boolean;
};

export async function AdminUnvanAtananlar(
  titleId: string,
  limit = 50,
  offset = 0,
): Promise<{ ok: boolean; items: AdminUnvanAtanan[]; hata?: string }> {
  const { data, error } = await supabase.rpc('admin_user_title_atananlar', {
    p_title_id: titleId,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) return { ok: false, items: [], hata: error.message };
  const d = ham(data);
  const rows = Array.isArray(d.items) ? d.items : [];
  return {
    ok: d.ok !== false,
    items: rows.map((r) => {
      const x = ham(r);
      return {
        assignment_id: String(x.assignment_id ?? ''),
        user_id: String(x.user_id ?? ''),
        assigned_at: typeof x.assigned_at === 'string' ? x.assigned_at : '',
        starts_at: typeof x.starts_at === 'string' ? x.starts_at : '',
        expires_at: typeof x.expires_at === 'string' ? x.expires_at : null,
        is_active: x.is_active !== false,
        revoked_at: typeof x.revoked_at === 'string' ? x.revoked_at : null,
        selection_locked: x.selection_locked === true,
        assignment_source: typeof x.assignment_source === 'string' ? x.assignment_source : 'ADMIN',
        reason: typeof x.reason === 'string' ? x.reason : null,
        display_name: typeof x.display_name === 'string' ? x.display_name : null,
        username: typeof x.username === 'string' ? x.username : null,
        avatar_url: typeof x.avatar_url === 'string' ? x.avatar_url : null,
        public_user_id: typeof x.public_user_id === 'string' ? x.public_user_id : null,
        is_selected: x.is_selected === true,
      };
    }),
    hata: typeof d.error === 'string' ? d.error : undefined,
  };
}

export type AdminKullaniciUnvanlariSonuc = {
  ok: boolean;
  selected_title_id: string | null;
  display_title_id: string | null;
  assignments: Array<Ham & { currently_valid?: boolean; title_name?: string }>;
  hata?: string;
};

export async function AdminKullaniciUnvanlari(
  userId: string,
): Promise<AdminKullaniciUnvanlariSonuc> {
  const { data, error } = await supabase.rpc('admin_kullanici_unvanlari', {
    p_user_id: userId,
  });
  if (error) {
    return {
      ok: false,
      selected_title_id: null,
      display_title_id: null,
      assignments: [],
      hata: error.message,
    };
  }
  const d = ham(data);
  const rows = Array.isArray(d.assignments) ? d.assignments : [];
  return {
    ok: d.ok !== false,
    selected_title_id: typeof d.selected_title_id === 'string' ? d.selected_title_id : null,
    display_title_id: typeof d.display_title_id === 'string' ? d.display_title_id : null,
    assignments: rows.map((r) => ham(r)),
    hata: typeof d.error === 'string' ? d.error : undefined,
  };
}
