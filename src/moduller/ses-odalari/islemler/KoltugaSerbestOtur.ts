import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';

function hataMetni(raw?: string): string {
  const m = (raw ?? '').toLowerCase();
  if (m.includes('seat requires approval')) return i18n.t('sesOda.oturmaOnayGerekli');
  if (m.includes('seat locked')) return i18n.t('sesOda.koltukKilitli');
  if (m.includes('seat occupied')) return i18n.t('sesOda.koltukDolu');
  if (m.includes('already seated')) return i18n.t('sesOda.zatenKoltuktasin');
  if (m.includes('throne') || m.includes('invalid seat')) {
    return i18n.t('sesOda.tahtSadeceSahip');
  }
  if (m.includes('guest')) return i18n.t('sesOda.misafirKoltukYok');
  if (m.includes('not authenticated')) return i18n.t('ortak.oturumYok');
  if (m.includes('not found')) return i18n.t('sesOda.koltukBulunamadi');
  return raw?.trim() || i18n.t('sesOda.koltugaOturulamadi');
}

/** İzinsiz oturma: boş koltuğa host onayı olmadan geç. */
export async function KoltugaSerbestOtur(
  roomId: string,
  seatIndex: number,
): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('koltuga_serbest_otur', {
    p_room_id: roomId,
    p_seat_index: seatIndex,
  });
  if (error) return { ok: false, hata: hataMetni(error.message) };
  return { ok: true };
}
