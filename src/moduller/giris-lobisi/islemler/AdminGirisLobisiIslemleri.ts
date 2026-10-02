import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import {
  DepoyaMedyaYukle,
  MedyaUzantisiCoz,
} from '../../../ortak/medya/DepoyaMedyaYukle';
import {
  GIRIS_LOBISI_BUCKET,
  type GirisLobisiAyar,
  type GirisLobisiMedyaTur,
  type GirisLobisiPublic,
} from '../tipler';
import { GirisLobisiPublicGet } from './GirisLobisiPublicGet';
import { GirisLobisiOnbellegeYaz } from '../onbellek/GirisLobisiOnbellek';

function parsePublic(data: unknown): GirisLobisiPublic {
  const payload = (data ?? {}) as { ayar?: GirisLobisiAyar; medya?: unknown };
  const giris = i18n.t('lobi.formBaslik') as string;
  const sonuc: GirisLobisiPublic = {
    ayar: {
      logo_goster: Boolean(payload.ayar?.logo_goster),
      logo_url: payload.ayar?.logo_url ?? null,
      logo_harf: (payload.ayar?.logo_harf ?? 'M').trim() || 'M',
      marka_goster: Boolean(payload.ayar?.marka_goster),
      marka_adi: payload.ayar?.marka_adi ?? null,
      slogan_goster: Boolean(payload.ayar?.slogan_goster),
      slogan: payload.ayar?.slogan ?? null,
      form_baslik: (payload.ayar?.form_baslik ?? giris).trim() || giris,
      form_alt: payload.ayar?.form_alt ?? null,
      ust_metin: payload.ayar?.ust_metin ?? null,
      sosyal_medya_gizle: Boolean(payload.ayar?.sosyal_medya_gizle),
      tum_butonlar_gizle: Boolean(payload.ayar?.tum_butonlar_gizle),
      updated_at: payload.ayar?.updated_at,
    },
    medya: Array.isArray(payload.medya)
      ? (payload.medya as GirisLobisiPublic['medya'])
      : [],
  };
  GirisLobisiOnbellegeYaz(sonuc);
  return sonuc;
}

export const AdminGirisLobisiIslemleri = {
  async getir(): Promise<GirisLobisiPublic> {
    const { data, error } = await supabase.rpc('admin_giris_lobisi_get');
    if (error) throw new Error(error.message);
    return parsePublic(data);
  },

  async ayarGuncelle(
    payload: Partial<GirisLobisiAyar>,
  ): Promise<GirisLobisiPublic> {
    const { data, error } = await supabase.rpc(
      'admin_giris_lobisi_ayar_guncelle',
      { p_payload: payload },
    );
    if (error) throw new Error(error.message);
    return parsePublic(data);
  },

  async medyaYukle(input: {
    uri: string;
    mime?: string | null;
    tur: GirisLobisiMedyaTur;
  }): Promise<GirisLobisiPublic> {
    const ext = MedyaUzantisiCoz(
      input.uri,
      input.mime,
      input.tur === 'video' ? 'mp4' : 'jpg',
    );
    const path = `aktif/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

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

    const { data, error } = await supabase.rpc('admin_giris_lobisi_medya_ekle', {
      p_tur: input.tur,
      p_public_url: urlData.publicUrl,
      p_storage_path: yukleme.path,
      p_mime_type: yukleme.contentType ?? input.mime ?? null,
      p_eskiyi_sil: true,
    });
    if (error) throw new Error(error.message);
    return parsePublic(data);
  },

  async medyaSil(id: string): Promise<GirisLobisiPublic> {
    const { data, error } = await supabase.rpc('admin_giris_lobisi_medya_sil', {
      p_id: id,
    });
    if (error) throw new Error(error.message);
    return parsePublic(data);
  },

  async medyaHepsiniSil(): Promise<GirisLobisiPublic> {
    const { data, error } = await supabase.rpc(
      'admin_giris_lobisi_medya_hepsini_sil',
    );
    if (error) throw new Error(error.message);
    return parsePublic(data);
  },

  /** Önizleme için public get */
  async publicOnizleme(): Promise<GirisLobisiPublic> {
    return GirisLobisiPublicGet();
  },
};
