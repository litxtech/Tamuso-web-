import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function istemciOlustur(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  try {
    return createClient(url, key);
  } catch {
    return null;
  }
}

export const supabase = istemciOlustur();

export async function spinGecmisiniKaydet(kayit: {
  player_id: string;
  reward_type: string;
  reward_value: number;
  multiplier: number;
  final_value: number;
}): Promise<void> {
  if (!supabase || !kayit.player_id) return;
  try {
    await supabase.from('spin_history').insert(kayit);
  } catch {
    /* çevrimdışı veya yetkisiz oturumda oyun devam eder */
  }
}
