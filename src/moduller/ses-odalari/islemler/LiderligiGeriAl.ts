import { supabase } from '../../../lib/supabase';

/** Odayı kuran kişi, devrettiği liderliği geri alır. */
export async function LiderligiGeriAl(roomId: string): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('oda_liderligi_geri_al', {
    p_room_id: roomId,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}
