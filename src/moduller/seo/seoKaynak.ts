import { supabase } from '../../lib/supabase';

/** Kayıt olan kullanıcının ilk public SEO adresini saklar. Tekrar yazılmaz. */
export async function SeoKaynakKaydet(): Promise<void> {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  const ham = window.sessionStorage.getItem('tamuso_seo_landing');
  if (!ham) return;
  let kaynak: unknown;
  try {
    kaynak = JSON.parse(ham);
  } catch {
    return;
  }
  if (!kaynak || typeof kaynak !== 'object') return;
  await supabase.rpc('seo_kayit_kaynagi', { p_kaynak: kaynak });
}
