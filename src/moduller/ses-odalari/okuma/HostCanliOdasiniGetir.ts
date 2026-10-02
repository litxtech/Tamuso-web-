import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';

export type HostCanliOda = {
  roomId: string;
  title: string;
};

/** Host’un şu an canlı olan ses odası (varsa). */
export async function HostCanliOdasiniGetir(
  hostId: string,
): Promise<HostCanliOda | null> {
  if (!hostId) return null;
  const { data, error } = await supabase
    .from('rooms')
    .select('id, title')
    .eq('host_id', hostId)
    .eq('is_live', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data?.id) return null;
  return {
    roomId: data.id as string,
    title: ((data.title as string | null) ?? '').trim() || i18n.t('sesOda.sesOdasi'),
  };
}
