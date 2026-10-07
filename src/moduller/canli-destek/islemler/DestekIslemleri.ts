import { Platform } from 'react-native';
import { supabase } from '../../../lib/supabase';
import type {
  DestekMesaj,
  DestekOturum,
  DestekOturumListeSatiri,
  DestekOturumPaket,
  DestekTemsilci,
} from '../tipler';

export async function DestekOturumAc(): Promise<
  { ok: true; paket: DestekOturumPaket } | { ok: false; hata: string }
> {
  const { data, error } = await supabase.rpc('destek_oturum_ac');
  if (error) return { ok: false, hata: error.message };
  return { ok: true, paket: data as DestekOturumPaket };
}

export async function DestekOturumDetay(
  sessionId: string,
): Promise<{ ok: true; paket: DestekOturumPaket } | { ok: false; hata: string }> {
  const { data, error } = await supabase.rpc('destek_oturum_detay', {
    p_session_id: sessionId,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true, paket: data as DestekOturumPaket };
}

export async function DestekMesajGonder(input: {
  sessionId: string;
  body: string;
}): Promise<{ ok: true; mesaj: DestekMesaj } | { ok: false; hata: string }> {
  const { data, error } = await supabase.rpc('destek_mesaj_gonder', {
    p_session_id: input.sessionId,
    p_body: input.body,
    p_kaynak: Platform.OS === 'web' ? 'web' : 'uygulama',
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true, mesaj: data as DestekMesaj };
}

export async function DestekOturumKapat(
  sessionId: string,
  reason = 'manual',
): Promise<{ ok: true; session: DestekOturum } | { ok: false; hata: string }> {
  const { data, error } = await supabase.rpc('destek_oturum_kapat', {
    p_session_id: sessionId,
    p_reason: reason,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true, session: data as DestekOturum };
}

export async function AdminDestekTemsilciListesi(): Promise<DestekTemsilci[]> {
  const { data, error } = await supabase.rpc('admin_destek_temsilci_listesi');
  if (error) throw error;
  return (data as DestekTemsilci[]) ?? [];
}

export async function AdminDestekTemsilciAyarla(input: {
  userId: string;
  active: boolean;
}): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('admin_destek_temsilci_ayarla', {
    p_user_id: input.userId,
    p_active: input.active,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

export async function AdminDestekOturumListesi(
  limit = 40,
): Promise<DestekOturumListeSatiri[]> {
  const { data, error } = await supabase.rpc('admin_destek_oturum_listesi', {
    p_limit: limit,
  });
  if (error) throw error;
  return (data as DestekOturumListeSatiri[]) ?? [];
}

export async function AdminDestekOturumAta(input: {
  sessionId: string;
  agentId: string;
}): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('admin_destek_oturum_ata', {
    p_session_id: input.sessionId,
    p_agent_id: input.agentId,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

export async function BenDestekTemsilcisiMiyim(): Promise<boolean> {
  const { data, error } = await supabase.rpc('ben_destek_temsilcisi_miyim');
  if (error) return false;
  return Boolean(data);
}
