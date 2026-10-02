import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import type { FikirDetay, FikirKategori, FikirOzet } from '../tipler';
import type { FikirEk } from '../yardimcilar/FikirMedyaYukle';
import { FikirTeknikMetaAl } from '../yardimcilar/FikirTeknikMeta';

function rpcHata(error: { message?: string } | null): never {
  throw new Error(error?.message || i18n.t('fikirler.islemBasarisiz'));
}

export async function FikirKategorileriGetir(
  includeInactive = false,
): Promise<FikirKategori[]> {
  const { data, error } = await supabase.rpc('feedback_kategorileri_getir', {
    p_include_inactive: includeInactive,
  });
  if (error) rpcHata(error);
  return (data ?? []) as FikirKategori[];
}

export async function FikirGonder(girdi: {
  categoryId: string;
  title: string;
  description: string;
  attachments?: FikirEk[];
  bugWhere?: string;
  bugWhat?: string;
  bugRepro?: string;
  clientToken?: string;
}): Promise<{ ok: true; id: string; status: string }> {
  const meta = FikirTeknikMetaAl();
  const { data, error } = await supabase.rpc('feedback_gonder', {
    p_category_id: girdi.categoryId,
    p_title: girdi.title,
    p_description: girdi.description,
    p_attachments: girdi.attachments ?? [],
    p_bug_where: girdi.bugWhere ?? null,
    p_bug_what: girdi.bugWhat ?? null,
    p_bug_repro: girdi.bugRepro ?? null,
    p_platform: meta.platform,
    p_app_version: meta.app_version,
    p_build_number: meta.build_number,
    p_os_version: meta.os_version,
    p_client_token: girdi.clientToken ?? null,
  });
  if (error) rpcHata(error);
  const row = data as { ok?: boolean; id?: string; status?: string };
  if (!row?.id) throw new Error(i18n.t('fikirler.olusturulamadi'));
  return { ok: true, id: row.id, status: row.status ?? 'RECEIVED' };
}

export async function FikirlerimiListele(
  limit = 30,
  offset = 0,
): Promise<FikirOzet[]> {
  const { data, error } = await supabase.rpc('feedback_fikirlerim', {
    p_limit: limit,
    p_offset: offset,
  });
  if (error) rpcHata(error);
  return (data ?? []) as FikirOzet[];
}

export async function FikirToplulukListele(opts?: {
  sort?: 'popular' | 'new' | 'featured' | 'reviewing';
  limit?: number;
  offset?: number;
  status?: string | null;
}): Promise<FikirOzet[]> {
  const { data, error } = await supabase.rpc('feedback_topluluk_liste', {
    p_sort: opts?.sort ?? 'popular',
    p_limit: opts?.limit ?? 20,
    p_offset: opts?.offset ?? 0,
    p_status: opts?.status ?? null,
  });
  if (error) rpcHata(error);
  return (data ?? []) as FikirOzet[];
}

export async function FikirBenzerAra(title: string): Promise<FikirOzet[]> {
  if (title.trim().length < 4) return [];
  const { data, error } = await supabase.rpc('feedback_benzer_ara', {
    p_title: title,
    p_limit: 5,
  });
  if (error) return [];
  return (data ?? []) as FikirOzet[];
}

export async function FikirDetayGetir(id: string): Promise<FikirDetay> {
  const { data, error } = await supabase.rpc('feedback_detay', { p_id: id });
  if (error) rpcHata(error);
  return data as FikirDetay;
}

export async function FikirDestekToggle(
  id: string,
): Promise<{ voted: boolean; vote_count: number }> {
  const { data, error } = await supabase.rpc('feedback_destek_toggle', {
    p_id: id,
  });
  if (error) rpcHata(error);
  const row = data as { voted?: boolean; vote_count?: number };
  return {
    voted: !!row.voted,
    vote_count: row.vote_count ?? 0,
  };
}
