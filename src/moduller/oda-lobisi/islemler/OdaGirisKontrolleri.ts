import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import type { Room } from '../../../types/models';

export async function OdaGirisYetkisiniKontrolEt(odaId: string): Promise<{
  ok: boolean;
  hata?: string;
  oda?: Room;
}> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*, host:profiles!rooms_host_id_fkey(id, display_name, username, avatar_url, level)')
    .eq('id', odaId)
    .maybeSingle();
  if (error) {
    // FK adı farklı ortamlarda olabilir — düz select'e düş
    const yedek = await supabase.from('rooms').select('*').eq('id', odaId).maybeSingle();
    if (yedek.error) return { ok: false, hata: yedek.error.message };
    if (!yedek.data) return { ok: false, hata: i18n.t('odaX.odaBulunamadi') };
    if (!yedek.data.is_live) return { ok: false, hata: i18n.t('odaX.odaKapali') };
    return { ok: true, oda: yedek.data as Room };
  }
  if (!data) return { ok: false, hata: i18n.t('odaX.odaBulunamadi') };
  if (!data.is_live) return { ok: false, hata: i18n.t('odaX.odaKapali') };
  return { ok: true, oda: data as Room };
}

export async function OdaKapasitesiniKontrolEt(oda: {
  listener_count: number;
  audience_capacity?: number | null;
}): Promise<{ ok: boolean; hata?: string }> {
  const max = oda.audience_capacity ?? 250;
  if (oda.listener_count >= max) {
    return { ok: false, hata: i18n.t('odaX.odaDolu') };
  }
  return { ok: true };
}

/** Kullanıcı odadan resmi çıkmamışsa (hala üye) true. */
export async function OdaUyeligiVarMi(
  odaId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('room_members')
    .select('user_id')
    .eq('room_id', odaId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}
