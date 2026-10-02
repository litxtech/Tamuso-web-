import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import { OrtamDegiskenleri } from '../../../yapilandirma/OrtamDegiskenleri';
import { GaleriAc } from '../../../ortak/medya/ImagePickerHazirMi';
import {
  DepoyaMedyaYukle,
  MedyaUzantisiCoz,
} from '../../../ortak/medya/DepoyaMedyaYukle';

export type FikirEk = {
  storage_path: string;
  public_url: string;
  mime_type: string;
};

/** Kullanıcı başlatmalı galeri seçimi → feedback-media */
export async function FikirGorseliSecVeYukle(opts?: {
  onYuklemeBasladi?: () => void;
}): Promise<
  { ok: true; ek: FikirEk } | { ok: false; hata: string; iptal?: boolean }
> {
  try {
    const secim = await GaleriAc({ mediaTypes: ['images'] });
    if (!secim.ok) return secim;

    opts?.onYuklemeBasladi?.();

    const asset = secim.asset;
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return { ok: false, hata: i18n.t('ortak.oturumYok') as string };

    const ext = MedyaUzantisiCoz(asset.uri, asset.mimeType, 'jpg');
    const path = `${uid}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const up = await DepoyaMedyaYukle(supabase, {
      bucket: 'feedback-media',
      path,
      uri: asset.uri,
      mime: asset.mimeType,
      tur: 'image',
    });
    if (!up.ok) return { ok: false, hata: up.hata };

    const base = OrtamDegiskenleri.supabaseUrl?.replace(/\/$/, '') ?? '';
    const public_url = `${base}/storage/v1/object/public/feedback-media/${path}`;

    return {
      ok: true,
      ek: {
        storage_path: path,
        public_url,
        mime_type: up.contentType,
      },
    };
  } catch (e) {
    return {
      ok: false,
      hata:
        e instanceof Error
          ? e.message
          : (i18n.t('fikirler.gorselYuklenemedi') as string),
    };
  }
}
