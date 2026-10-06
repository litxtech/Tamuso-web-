import { supabase } from '../../../lib/supabase';

export type WebZiyaretOzeti = {
  gunluk: number;
  aylik: number;
};

/** Bugünkü ve bu aydaki tekil web ziyareti. */
export async function AdminWebZiyaretGetir(): Promise<WebZiyaretOzeti | null> {
  const { data, error } = await supabase.rpc('admin_web_ziyaret_ozet');
  if (error || data == null) return null;
  const satir = data as { gunluk?: number; aylik?: number };
  return {
    gunluk: Number(satir.gunluk ?? 0),
    aylik: Number(satir.aylik ?? 0),
  };
}
