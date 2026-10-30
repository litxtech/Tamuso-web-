import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';

function hataMetni(raw?: string): string {
  const m = (raw ?? '').toLowerCase();
  if (m.includes('not authorized')) return i18n.t('sesOda.yetkiYok');
  if (m.includes('not authenticated')) return i18n.t('ortak.oturumYok');
  if (m.includes('not found')) return i18n.t('sesOda.odaBulunamadi');
  return raw?.trim() || i18n.t('sesOda.izinKaydedilemedi');
}

/** Oda sahibinin son oturma / mikrofon seçimini kaydeder. */
export async function OdaIzinAyarla(input: {
  roomId: string;
  oturmaIzinli: boolean;
  mikrofonIzinli: boolean;
}): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('oda_izin_ayarla', {
    p_room_id: input.roomId,
    p_oturma_izinli: input.oturmaIzinli,
    p_mikrofon_izinli: input.mikrofonIzinli,
  });
  if (error) return { ok: false, hata: hataMetni(error.message) };
  return { ok: true };
}
