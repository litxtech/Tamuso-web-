import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import { GaleriAc } from '../../../ortak/medya/ImagePickerHazirMi';
import {
  DepoyaMedyaYukle,
  MedyaUzantisiCoz,
} from '../../../ortak/medya/DepoyaMedyaYukle';

/**
 * Galeriden ses odası kapak görseli seçer (yüklemez).
 */
export async function OdaKapakSec(): Promise<
  | { ok: true; uri: string; mimeType?: string | null }
  | { ok: false; hata: string; iptal?: boolean }
> {
  const secim = await GaleriAc({ mediaTypes: ['images'] });
  if (!secim.ok) {
    if (secim.hata.includes('build') || secim.hata.includes('native')) {
      return {
        ok: false,
        hata: i18n.t('sesOda.fotoSeciciBuildYok'),
        iptal: secim.iptal,
      };
    }
    return secim;
  }
  return {
    ok: true,
    uri: secim.asset.uri,
    mimeType: secim.asset.mimeType,
  };
}

/**
 * Kapak görselini storage'a yükler; public URL döner.
 * rooms.cover_url güncellemesi çağıran tarafta yapılır.
 */
export async function OdaKapakUriIleYukle(
  uri: string,
  mimeType?: string | null,
): Promise<{ ok: true; url: string } | { ok: false; hata: string }> {
  try {
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return { ok: false, hata: i18n.t('ortak.oturumYok') };

    const { YaptirimAktifMi } = await import(
      '../../admin/ses-odalari/AdminSesOdasiIslemleri'
    );
    if (await YaptirimAktifMi('upload_ban')) {
      return {
        ok: false,
        hata: i18n.t('durumX.uploadBan'),
      };
    }

    const ext = MedyaUzantisiCoz(uri, mimeType, 'jpg');
    const path = `${uid}/room-cover-${Date.now()}.${ext}`;

    const up = await DepoyaMedyaYukle(supabase, {
      bucket: 'profile-media',
      path,
      uri,
      mime: mimeType,
      tur: 'image',
      upsert: true,
    });

    if (!up.ok) {
      return {
        ok: false,
        hata: up.hata.includes('Bucket')
          ? i18n.t('sesOda.medyaDeposuHazirDegil')
          : up.hata,
      };
    }

    const { data: pub } = supabase.storage.from('profile-media').getPublicUrl(path);
    return { ok: true, url: `${pub.publicUrl}?t=${Date.now()}` };
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : i18n.t('sesOda.kapakYuklenemediKisa'),
    };
  }
}
