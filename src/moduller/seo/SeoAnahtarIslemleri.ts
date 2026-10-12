import { supabase } from '../../lib/supabase';
import type { SeoOneri, SeoSinif } from './seoAnahtarMotor';

export type SeoAnahtarSatir = {
  id: string;
  ifade: string;
  dil: string;
  kategori: string;
  niyet: string;
  hedef_yol: string | null;
  aktif: boolean;
  durum: string;
  updated_at: string;
};

export type SeoGecmisSatir = {
  id: string;
  yol: string;
  alan: string;
  eski: string | null;
  yeni: string | null;
  islem: string;
  created_at: string;
};

export type SeoKayitPaketi = {
  ifade: string;
  dil: SeoSinif['dil'];
  kategori: string;
  niyet: string;
  hedef_yol: string;
  aktif: boolean;
  oneriler: Array<SeoOneri & { yeni_sayfa?: boolean }>;
};

function paketSonuc(data: unknown, error: { message: string } | null) {
  if (error) return { ok: false, hata: error.message, adet: 0, uyari: '' };
  const satir = (data ?? {}) as { ok?: boolean; hata?: string; adet?: number; uyari?: string; id?: string };
  return { ok: Boolean(satir.ok), hata: satir.hata || '', adet: Number(satir.adet || 0), uyari: satir.uyari || '', id: satir.id };
}

export async function SeoAnahtarListe(arama: string): Promise<SeoAnahtarSatir[]> {
  const { data, error } = await supabase.rpc('seo_anahtar_liste', { p_arama: arama });
  if (error || !data || data.ok === false) return [];
  const satirlar = (data as { satirlar?: SeoAnahtarSatir[] }).satirlar;
  return Array.isArray(satirlar) ? satirlar : [];
}

export async function SeoAnahtarKaydet(paket: SeoKayitPaketi) {
  const govde = {
    ...paket,
    oneriler: paket.oneriler.map((o) => ({
      hedef_yol: o.hedefYol,
      alan: o.alan,
      onceki: o.onceki,
      onerilen: o.onerilen,
      uyari: o.uyari,
      yeni_sayfa: o.yeniSayfa,
    })),
  };
  const { data, error } = await supabase.rpc('seo_anahtar_kaydet', { p_paket: govde });
  return paketSonuc(data, error);
}

export async function SeoAnahtarOnerileri(id: string) {
  const { data, error } = await supabase.rpc('seo_anahtar_oneri_getir', { p_id: id });
  if (error || !data || data.ok === false) return [];
  const oneriler = (data as { oneriler?: Array<{ id: string; hedef_yol: string; alan: string; onceki: string; onerilen: string; durum: string; uyari: string; yeni_sayfa: boolean }> }).oneriler;
  return Array.isArray(oneriler) ? oneriler : [];
}

export async function SeoAnahtarYayinla(idler: string[]) {
  const { data, error } = await supabase.rpc('seo_anahtar_yayinla', { p_idler: idler });
  return paketSonuc(data, error);
}

export async function SeoAnahtarGeriAl(id: string) {
  const { data, error } = await supabase.rpc('seo_anahtar_geri_al', { p_id: id });
  return paketSonuc(data, error);
}

export async function SeoAnahtarDurum(id: string, islem: 'aktif' | 'pasif' | 'sil') {
  const { data, error } = await supabase.rpc('seo_anahtar_durum', { p_id: id, p_islem: islem });
  return paketSonuc(data, error);
}

export async function SeoAnahtarGecmis(): Promise<SeoGecmisSatir[]> {
  const { data, error } = await supabase.rpc('seo_anahtar_gecmis_liste');
  if (error || !data || data.ok === false) return [];
  const satirlar = (data as { satirlar?: SeoGecmisSatir[] }).satirlar;
  return Array.isArray(satirlar) ? satirlar : [];
}
