import { supabase } from '../../../lib/supabase';

/** Ses odası sahibi liderliği başka bir üye/konuşmacıya devreder.
 * Hedefin açık odası varsa hemen devretmez; karşı tarafa onay kartı gider. */
export async function LiderligiDevret(input: {
  roomId: string;
  yeniHostId: string;
}): Promise<{ ok: true; bekliyor: boolean } | { ok: false; hata: string }> {
  const { data, error } = await supabase.rpc('oda_liderlik_devri_baslat', {
    p_room_id: input.roomId,
    p_yeni_host_id: input.yeniHostId,
  });
  if (error) return { ok: false, hata: error.message };
  const durum = (data as { durum?: string } | null)?.durum;
  return { ok: true, bekliyor: durum === 'bekliyor' };
}

export async function LiderlikDevriYanit(
  teklifId: string,
  kabul: boolean,
): Promise<{ ok: true; roomId?: string } | { ok: false; hata: string }> {
  const { data, error } = await supabase.rpc('oda_liderlik_devri_yanit', {
    p_teklif_id: teklifId,
    p_kabul: kabul,
  });
  if (error) return { ok: false, hata: error.message };
  const row = data as { room_id?: string } | null;
  return { ok: true, roomId: row?.room_id };
}
