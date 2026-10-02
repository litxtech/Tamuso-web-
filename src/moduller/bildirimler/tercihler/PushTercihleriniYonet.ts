import { supabase } from '../../../lib/supabase';
import type {
  BildirimAnahtari,
  PushTercihAnahtari,
  PushTercihleri,
} from './PushTercihTipleri';

const BOS: Omit<PushTercihleri, 'user_id' | 'updated_at'> = {
  all_enabled: true,
  messages: true,
  calls: true,
  gifts: true,
  live: true,
  rooms: true,
  social: true,
  wallet: true,
  agency: true,
  system: true,
};

function normalize(row: PushTercihleri): PushTercihleri {
  return {
    ...BOS,
    ...row,
    calls: row.calls ?? true,
    agency: row.agency ?? true,
  };
}

export async function PushTercihleriniGetir(): Promise<PushTercihleri> {
  const { data, error } = await supabase.rpc('benim_push_tercihlerimi_getir');
  if (error) throw error;
  return normalize(data as PushTercihleri);
}

export async function PushTercihiniKaydet(
  key: PushTercihAnahtari,
  value: boolean,
): Promise<PushTercihleri> {
  const payload: Record<string, boolean> = { [`p_${key}`]: value };
  const { data, error } = await supabase.rpc('benim_push_tercihlerimi_kaydet', payload);
  if (error) throw error;
  return normalize(data as PushTercihleri);
}

export async function PushTercihleriniTopluKaydet(
  patch: Partial<Record<PushTercihAnahtari, boolean>>,
): Promise<PushTercihleri> {
  const { data, error } = await supabase.rpc('benim_push_tercihlerimi_kaydet', {
    p_all_enabled: patch.all_enabled ?? null,
    p_messages: patch.messages ?? null,
    p_gifts: patch.gifts ?? null,
    p_live: patch.live ?? null,
    p_rooms: patch.rooms ?? null,
    p_social: patch.social ?? null,
    p_wallet: patch.wallet ?? null,
    p_system: patch.system ?? null,
    p_calls: patch.calls ?? null,
    p_agency: patch.agency ?? null,
  });
  if (error) throw error;
  return normalize(data as PushTercihleri);
}

export async function BildirimAnahtarlariniGetir(
  dil: string,
): Promise<BildirimAnahtari[]> {
  const { data, error } = await supabase.rpc('benim_bildirim_anahtarlarim', {
    p_dil: dil,
  });
  if (error) throw error;
  return (data ?? []) as BildirimAnahtari[];
}

export async function BildirimAnahtariniKaydet(
  kod: string,
  acik: boolean,
): Promise<void> {
  const { error } = await supabase.rpc('bildirim_anahtarini_kaydet', {
    p_kod: kod,
    p_acik: acik,
  });
  if (error) throw error;
}

export function VarsayilanPushTercihleri(userId = ''): PushTercihleri {
  return {
    user_id: userId,
    updated_at: new Date().toISOString(),
    ...BOS,
  };
}
