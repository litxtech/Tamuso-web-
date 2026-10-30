import { Share } from 'react-native';
import { supabase } from '../../lib/supabase';

export async function SeoPaylasimAdresi(
  tur: 'post' | 'profile',
  id: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc('seo_paylasim_adresi', {
    p_tur: tur,
    p_id: id,
  });
  if (error || typeof data !== 'string') return null;
  if (!data.startsWith('https://www.tamuso.com/')) return null;
  return data;
}

export async function SeoAdresiniPaylas(
  tur: 'post' | 'profile',
  id: string,
): Promise<'ok' | 'yok'> {
  const url = await SeoPaylasimAdresi(tur, id);
  if (!url) return 'yok';
  try {
    await Share.share({ message: url });
  } catch {
    return 'ok';
  }
  return 'ok';
}
