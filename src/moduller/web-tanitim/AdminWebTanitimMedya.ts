import { supabase } from '../../lib/supabase';
import {
  DepoyaMedyaYukle,
  MedyaUzantisiCoz,
} from '../../ortak/medya/DepoyaMedyaYukle';
import { GIRIS_LOBISI_BUCKET } from '../giris-lobisi/tipler';
import type { WebTanitimMedya } from './WebTanitimMedya';

function liste(data: unknown): WebTanitimMedya[] {
  return Array.isArray(data) ? (data as WebTanitimMedya[]) : [];
}

export const AdminWebTanitimMedya = {
  async listele(): Promise<WebTanitimMedya[]> {
    const { data, error } = await supabase.rpc('admin_web_tanitim_medya_listele');
    if (error) throw new Error(error.message);
    return liste(data);
  },

  async yukle(input: {
    uri: string;
    mime?: string | null;
    tur: 'video' | 'image';
    baslik?: string;
    lobi?: boolean;
  }): Promise<WebTanitimMedya[]> {
    const ext = MedyaUzantisiCoz(input.uri, input.mime, input.tur === 'video' ? 'mp4' : 'jpg');
    const path = `tanitim/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const yukleme = await DepoyaMedyaYukle(supabase, {
      bucket: GIRIS_LOBISI_BUCKET,
      path,
      uri: input.uri,
      mime: input.mime,
      tur: input.tur,
      upsert: true,
    });
    if (!yukleme.ok) throw new Error(yukleme.hata);
    const { data: urlData } = supabase.storage
      .from(GIRIS_LOBISI_BUCKET)
      .getPublicUrl(yukleme.path);
    const { data, error } = await supabase.rpc('admin_web_tanitim_medya_ekle', {
      p_tur: input.tur,
      p_public_url: urlData.publicUrl,
      p_storage_path: yukleme.path,
      p_mime_type: yukleme.contentType ?? input.mime ?? null,
      p_baslik: input.baslik ?? null,
      p_anasayfa: true,
      p_lobi: Boolean(input.lobi),
    });
    if (error) throw new Error(error.message);
    return liste(data);
  },

  async guncelle(
    id: string,
    alan: { anasayfa: boolean; lobi: boolean; aktif: boolean },
  ): Promise<WebTanitimMedya[]> {
    const { data, error } = await supabase.rpc('admin_web_tanitim_medya_guncelle', {
      p_id: id,
      p_anasayfa: alan.anasayfa,
      p_lobi: alan.lobi,
      p_aktif: alan.aktif,
    });
    if (error) throw new Error(error.message);
    return liste(data);
  },

  async sil(id: string): Promise<WebTanitimMedya[]> {
    const { data, error } = await supabase.rpc('admin_web_tanitim_medya_sil', {
      p_id: id,
    });
    if (error) throw new Error(error.message);
    return liste(data);
  },
};
