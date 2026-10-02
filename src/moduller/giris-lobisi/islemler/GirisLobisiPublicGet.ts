import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import {
  GirisLobisiOnbellegeYaz,
  GirisLobisiOnbellekDisktenYukle,
  GirisLobisiOnbellektenAl,
} from '../onbellek/GirisLobisiOnbellek';
import {
  VARSAYILAN_GIRIS_LOBISI_AYAR,
  type GirisLobisiAyar,
  type GirisLobisiMedya,
  type GirisLobisiPublic,
} from '../tipler';

function ayarNormalize(raw: unknown): GirisLobisiAyar {
  const a = (raw ?? {}) as Partial<GirisLobisiAyar>;
  const giris = i18n.t('lobi.formBaslik');
  return {
    logo_goster: Boolean(a.logo_goster),
    logo_url: a.logo_url ?? null,
    logo_harf: (a.logo_harf ?? 'M').trim() || 'M',
    marka_goster: Boolean(a.marka_goster),
    marka_adi: a.marka_adi ?? null,
    slogan_goster: Boolean(a.slogan_goster),
    slogan: a.slogan ?? null,
    form_baslik: (a.form_baslik ?? giris).trim() || giris,
    form_alt: a.form_alt ?? null,
    ust_metin: a.ust_metin ?? null,
    sosyal_medya_gizle: Boolean(a.sosyal_medya_gizle),
    tum_butonlar_gizle: Boolean(a.tum_butonlar_gizle),
    updated_at: a.updated_at,
  };
}

function medyaNormalize(raw: unknown): GirisLobisiMedya[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((m) => {
      const row = m as Partial<GirisLobisiMedya>;
      if (!row.id || !row.public_url) return null;
      const tur = row.tur === 'image' ? 'image' : 'video';
      return {
        id: String(row.id),
        tur,
        public_url: String(row.public_url),
        storage_path: row.storage_path ?? null,
        mime_type: row.mime_type ?? null,
        aktif: row.aktif !== false,
        sira: Number(row.sira ?? 0),
        created_at: row.created_at,
      } satisfies GirisLobisiMedya;
    })
    .filter(Boolean) as GirisLobisiMedya[];
}

export async function GirisLobisiPublicGet(): Promise<GirisLobisiPublic> {
  try {
    const { data, error } = await supabase.rpc('giris_lobisi_public_get');
    if (error) throw error;
    const payload = (data ?? {}) as { ayar?: unknown; medya?: unknown };
    const sonuc: GirisLobisiPublic = {
      ayar: ayarNormalize(payload.ayar),
      medya: medyaNormalize(payload.medya),
    };
    GirisLobisiOnbellegeYaz(sonuc);
    return sonuc;
  } catch (e) {
    console.warn('[GirisLobisiPublicGet]', e);
    const cached =
      GirisLobisiOnbellektenAl() ?? (await GirisLobisiOnbellekDisktenYukle());
    if (cached) return cached;
    return { ayar: VARSAYILAN_GIRIS_LOBISI_AYAR, medya: [] };
  }
}

/** Oturum açıkken / açılışta çağır — çıkışta lobi medyası hazır olsun. */
export async function GirisLobisiOnbellekIsit(): Promise<void> {
  await GirisLobisiOnbellekDisktenYukle();
  await GirisLobisiPublicGet();
}
