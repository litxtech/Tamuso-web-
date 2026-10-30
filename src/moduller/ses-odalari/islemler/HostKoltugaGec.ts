import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';

function hataMetni(raw?: string): string {
  const m = (raw ?? '').toLowerCase();
  if (m.includes('seat locked') || m.includes('throne locked')) {
    return i18n.t('sesOda.tahtKilitli');
  }
  if (m.includes('seat occupied')) return i18n.t('sesOda.koltukDolu');
  if (m.includes('not host') || m.includes('not authorized')) {
    return i18n.t('sesOda.yetkiYok');
  }
  if (m.includes('not found') || m.includes('invalid seat')) {
    return i18n.t('sesOda.koltukBulunamadi');
  }
  return raw?.trim() || i18n.t('sesOda.koltugaOturulamadi');
}

/** Oda sahibi istediği boş koltuğa geçer. Tahttan ayrılınca taht kilitlenir. */
export async function HostKoltugaGec(
  roomId: string,
  seatIndex: number,
): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('host_koltuga_gec', {
    p_room_id: roomId,
    p_seat_index: seatIndex,
  });
  if (error) return { ok: false, hata: hataMetni(error.message) };
  return { ok: true };
}

/** Sahip tahtta değilse taht koltuğunu diğerlerine kilitler. */
export async function HostTahtiniKilitle(
  roomId: string,
): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('host_tahtini_kilitle', {
    p_room_id: roomId,
  });
  if (error) return { ok: false, hata: hataMetni(error.message) };
  return { ok: true };
}
