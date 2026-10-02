import { supabase } from '../../../lib/supabase';
import type {
  AdminFikirOzet,
  FikirDetay,
  FikirDurum,
  FikirIstatistik,
  FikirKategori,
} from '../tipler';
import i18n from '../../../i18n';

function rpcHata(error: { message?: string } | null): never {
  throw new Error(error?.message || i18n.t('fikirler.adminIslemBasarisiz'));
}

export async function AdminFikirIstatistikGetir(): Promise<FikirIstatistik> {
  const { data, error } = await supabase.rpc('admin_feedback_istatistik');
  if (error) rpcHata(error);
  return data as FikirIstatistik;
}

export async function AdminFikirListele(opts?: {
  status?: string | null;
  categoryId?: string | null;
  userRef?: string | null;
  q?: string | null;
  from?: string | null;
  to?: string | null;
  limit?: number;
  offset?: number;
}): Promise<AdminFikirOzet[]> {
  const { data, error } = await supabase.rpc('admin_feedback_liste', {
    p_status: opts?.status ?? null,
    p_category_id: opts?.categoryId ?? null,
    p_user_ref: opts?.userRef ?? null,
    p_q: opts?.q ?? null,
    p_from: opts?.from ?? null,
    p_to: opts?.to ?? null,
    p_limit: opts?.limit ?? 40,
    p_offset: opts?.offset ?? 0,
  });
  if (error) rpcHata(error);
  return (data ?? []) as AdminFikirOzet[];
}

export async function AdminFikirDurumGuncelle(girdi: {
  id: string;
  status: FikirDurum;
  adminNote?: string;
  isPublic?: boolean;
  isFeatured?: boolean;
  isHidden?: boolean;
  isArchived?: boolean;
}): Promise<void> {
  const { error } = await supabase.rpc('admin_feedback_durum_guncelle', {
    p_id: girdi.id,
    p_status: girdi.status,
    p_admin_note: girdi.adminNote ?? null,
    p_is_public: girdi.isPublic ?? null,
    p_is_featured: girdi.isFeatured ?? null,
    p_is_hidden: girdi.isHidden ?? null,
    p_is_archived: girdi.isArchived ?? null,
  });
  if (error) rpcHata(error);
}

export async function AdminFikirCevapYaz(
  id: string,
  body: string,
): Promise<void> {
  const { error } = await supabase.rpc('admin_feedback_cevap_yaz', {
    p_id: id,
    p_body: body,
  });
  if (error) rpcHata(error);
}

export async function AdminFikirOdulVer(girdi: {
  feedbackId: string;
  rewardType: 'coin' | 'badge';
  rewardAmount?: number;
  badgeCode?: string;
  userMessage?: string;
  adminNote?: string;
  idempotencyKey: string;
}): Promise<{ ok: true; duplicate?: boolean; id: string }> {
  const { data, error } = await supabase.rpc('admin_feedback_odul_ver', {
    p_feedback_id: girdi.feedbackId,
    p_reward_type: girdi.rewardType,
    p_reward_amount: girdi.rewardAmount ?? null,
    p_badge_code: girdi.badgeCode ?? null,
    p_user_message: girdi.userMessage ?? null,
    p_admin_note: girdi.adminNote ?? null,
    p_idempotency_key: girdi.idempotencyKey,
  });
  if (error) rpcHata(error);
  const row = data as { ok?: boolean; duplicate?: boolean; id?: string };
  return {
    ok: true,
    duplicate: !!row.duplicate,
    id: row.id ?? '',
  };
}

export async function AdminFikirKategoriKaydet(girdi: {
  id?: string | null;
  name?: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
  isBugForm?: boolean;
  code?: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('admin_feedback_kategori_kaydet', {
    p_id: girdi.id ?? null,
    p_name: girdi.name ?? null,
    p_icon: girdi.icon ?? null,
    p_sort_order: girdi.sortOrder ?? null,
    p_is_active: girdi.isActive ?? null,
    p_is_bug_form: girdi.isBugForm ?? null,
    p_code: girdi.code ?? null,
  });
  if (error) rpcHata(error);
  return (data as { id: string }).id;
}

export async function AdminFikirDetayGetir(id: string): Promise<FikirDetay> {
  const { data, error } = await supabase.rpc('feedback_detay', { p_id: id });
  if (error) rpcHata(error);
  return data as FikirDetay;
}

export type { FikirKategori };
