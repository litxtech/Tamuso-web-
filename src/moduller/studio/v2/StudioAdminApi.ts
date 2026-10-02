import { supabase } from '../../../lib/supabase';

export type AdminStudioOyun = {
  id: string;
  title: string | null;
  status: string;
  error_code: string | null;
  algorithm_enabled: boolean;
  coin_enabled: boolean;
  published_at: string | null;
  updated_at: string | null;
};

export async function StudioAdminListe(): Promise<AdminStudioOyun[]> {
  const { data, error } = await supabase.rpc('creator_v2_admin_liste');
  if (error) return [];
  return Array.isArray(data) ? (data as AdminStudioOyun[]) : [];
}

export async function StudioAdminKarar(id: string, alan: 'algorithm' | 'coin', acik: boolean) {
  const { error } = await supabase.rpc('creator_v2_admin_karar', { p_id: id, p_alan: alan, p_acik: acik });
  if (error) throw error;
}

export async function StudioAdminYayinla(id: string, canli: boolean) {
  const { error } = await supabase.rpc('creator_v2_admin_yayinla', { p_id: id, p_canli: canli });
  if (error) throw error;
}

export async function StudioAdminIncele(id: string, karar: 'APPROVED' | 'REJECTED') {
  const { error } = await supabase.rpc('creator_v2_admin_incele', { p_id: id, p_karar: karar });
  if (error) throw error;
}

export type AdminStudioKayit = {
  at: string | null;
  level: string;
  step: string;
  code: string | null;
  detail: string | null;
};

export async function StudioAdminOku(id: string) {
  const { data, error } = await supabase.rpc('creator_v2_admin_oku', { p_id: id });
  if (error || !data || typeof data !== 'object') return null;
  return data as { id: string; title: string | null; status: string; manifest: unknown; logs?: AdminStudioKayit[] };
}
