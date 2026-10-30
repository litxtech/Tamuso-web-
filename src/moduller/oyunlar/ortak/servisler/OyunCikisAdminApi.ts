/**
 * Ortak çıkış planı.
 * Yeni oyun veritabanında game_cikis_oyun satırıyla buraya düşer;
 * ekran oyun listesini sunucudan okur.
 */

import { supabase } from '../../../../lib/supabase';

export type CikisTur = 'tek' | 'carpan';

export type CikisOyunOzet = {
  kod: string;
  ad: string;
  tur: CikisTur;
};

export type CikisOge = {
  anahtar: string;
  ad: string;
  agirlik: number;
};

export type CikisKural = {
  id: string;
  anahtar: string;
  ad: string;
  gun: string;
  saatBas: number;
  saatBit: number;
  agirlik: number;
  enFazla: number | null;
  kullanilan: number;
  uyuyor: boolean;
};

export type CikisAdim = {
  id: string;
  anahtar: string;
  ad: string;
};

export type CikisOnizleme = {
  anahtar: string;
  ad: string;
  kaynak: 'sira' | 'tahmin';
};

export type CikisPano = {
  ok: boolean;
  message?: string;
  simdi?: { saat: number; gun: number; tarih: string; etiket: string };
  oyunlar: CikisOyunOzet[];
  oyun?: {
    kod: string;
    ad: string;
    tur: CikisTur;
    aciklama: string;
    carpanBps: number | null;
  };
  ogeler: CikisOge[];
  kurallar: CikisKural[];
  sira: CikisAdim[];
  onizleme: CikisOnizleme[];
};

async function rpc(name: string, args: Record<string, unknown>): Promise<CikisPano> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  const pano = (data ?? { ok: false, message: 'Boş yanıt' }) as CikisPano;
  if (!pano.ok) throw new Error(pano.message || 'Kayıt olmadı');
  return pano;
}

export function cikisPanoGetir(oyun: string | null) {
  return rpc('game_cikis_pano', { p_game: oyun });
}

export function cikisSiraKaydet(oyun: string, liste: string[]) {
  return rpc('game_cikis_sira_kaydet', { p_game: oyun, p_liste: liste });
}

export function cikisKuralEkle(
  oyun: string,
  anahtar: string,
  gun: string,
  saatBas: number,
  saatBit: number,
  agirlik: number,
  enFazla: number | null,
) {
  return rpc('game_cikis_kural_ekle', {
    p_game: oyun,
    p_anahtar: anahtar,
    p_gun: gun,
    p_saat_bas: saatBas,
    p_saat_bit: saatBit,
    p_agirlik: agirlik,
    p_en_fazla: enFazla,
  });
}

export function cikisKuralSil(id: string) {
  return rpc('game_cikis_kural_sil', { p_id: id });
}

export function cikisTabanKaydet(oyun: string, ogeler: Array<{ anahtar: string; agirlik: number }>) {
  return rpc('game_cikis_taban_kaydet', { p_game: oyun, p_ogeler: ogeler });
}

export function cikisBpsKaydet(oyun: string, bps: number) {
  return rpc('game_cikis_bps_kaydet', { p_game: oyun, p_bps: bps });
}
