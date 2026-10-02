import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import type {
  AdminSatinAlmaItiraz,
  SatinAlmaItirazNeden,
} from './SatinAlmaItirazTipleri';

function rpcHata(error: { message?: string } | null): never {
  throw new Error(error?.message ?? i18n.t('satinAlma.itirazBasarisiz'));
}

export async function SatinAlmaItirazOlustur(params: {
  kind: 'coin' | 'ai_music' | string;
  purchaseId: string;
  reasonCode: SatinAlmaItirazNeden;
  userNote?: string;
}): Promise<{ ok: boolean; id: string; status: string }> {
  const { data, error } = await supabase.rpc('satin_alma_itiraz_olustur', {
    p_kind: params.kind,
    p_purchase_id: params.purchaseId,
    p_reason_code: params.reasonCode,
    p_user_note: params.userNote?.trim() || null,
  });
  if (error) rpcHata(error);
  const row = data as { ok?: boolean; id?: string; status?: string };
  return {
    ok: !!row?.ok,
    id: String(row?.id ?? ''),
    status: String(row?.status ?? 'pending'),
  };
}

export async function AdminSatinAlmaItirazListele(
  status?: 'pending' | 'approved' | 'rejected' | null,
  limit = 80,
): Promise<AdminSatinAlmaItiraz[]> {
  const { data, error } = await supabase.rpc('admin_satin_alma_itiraz_listele', {
    p_status: status ?? null,
    p_limit: limit,
  });
  if (error) rpcHata(error);
  return (Array.isArray(data) ? data : []) as AdminSatinAlmaItiraz[];
}

export async function AdminSatinAlmaItirazKarar(params: {
  id: string;
  status: 'approved' | 'rejected';
  adminNote?: string;
  resolutionNote?: string;
}): Promise<{ ok: boolean; status: string }> {
  const { data, error } = await supabase.rpc('admin_satin_alma_itiraz_karar', {
    p_id: params.id,
    p_status: params.status,
    p_admin_note: params.adminNote?.trim() || null,
    p_resolution_note: params.resolutionNote?.trim() || null,
  });
  if (error) rpcHata(error);
  const row = data as { ok?: boolean; status?: string };
  return { ok: !!row?.ok, status: String(row?.status ?? params.status) };
}
