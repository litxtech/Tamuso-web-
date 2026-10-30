import { supabase } from '../../../lib/supabase';
import { OdaIslemOzetleriniBagla } from '../../ses-odalari/okuma/OdaIslemOzeti';
import type { Room, RoomMode } from '../../../types/models';
import type { KesfetFiltresi } from '../filtreler/KesfetFiltreleri';

/**
 * Kesfet oneri — canli odalari filtre/sirala.
 */
const KESFET_ODA_SELECT =
  'id, host_id, title, topic, cover_url, mode, max_seats, is_live, is_locked, listener_count, total_coins_earned, created_at, room_code, host:profiles!rooms_host_id_fkey(id, display_name, username, avatar_url, level)';

export async function KesfetOneriGetir(input: {
  filtre: KesfetFiltresi;
  mode?: RoomMode | null;
  limit?: number;
}): Promise<Room[]> {
  const limit = Math.min(Math.max(input.limit ?? 48, 1), 80);
  let q = supabase
    .from('rooms')
    .select(KESFET_ODA_SELECT)
    .eq('is_live', true)
    .limit(limit);

  switch (input.filtre) {
    case 'trending':
      q = q.order('total_coins_earned', { ascending: false });
      break;
    case 'new_creator':
      q = q.order('created_at', { ascending: false });
      break;
    case 'online':
      q = q.gt('listener_count', 0).order('listener_count', { ascending: false });
      break;
    case 'global':
    default:
      q = q.order('listener_count', { ascending: false });
  }

  if (input.mode) {
    q = q.eq('mode', input.mode);
  }

  const { data, error } = await q;
  if (error) {
    const { CevrimdisiAktifKullanici } = await import('../../cevrimdisi/AktifKullanici');
    const { KesfetAnlikOku } = await import('../../cevrimdisi/AnlikGoruntu');
    const disk = await KesfetAnlikOku(CevrimdisiAktifKullanici());
    if (disk && disk.length > 0) return disk as Room[];
    throw error;
  }
  const odalar = await OdaIslemOzetleriniBagla((data as Room[]) ?? []);
  if (odalar.length > 0) {
    const { CevrimdisiAktifKullanici } = await import('../../cevrimdisi/AktifKullanici');
    const { KesfetAnlikYaz } = await import('../../cevrimdisi/AnlikGoruntu');
    void KesfetAnlikYaz(CevrimdisiAktifKullanici(), odalar);
  }
  return odalar;
}
