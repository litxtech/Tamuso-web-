import i18n from '../../../i18n';
import { supabase } from '../../../lib/supabase';
import { GaleriAc } from '../../../ortak/medya/ImagePickerHazirMi';
import { DepoyaMedyaYukle } from '../../../ortak/medya/DepoyaMedyaYukle';
import { ProfilGorseliniHazirla } from './ProfilGorseliniHazirla';

export type ProfilMedyaTuru = 'avatar' | 'cover';

export type SecilenProfilMedya = {
  uri: string;
  mimeType?: string | null;
};

/** Storage bucket limiti (016_profil_medya) — 5 MiB */
const PROFIL_MEDYA_MAX_BAYT = 5 * 1024 * 1024;

/**
 * Galeriden profil görseli seçer (yüklemez). Kayıt öncesi önizleme için.
 * Kapak daha agresif sıkıştırılır; crop ile yeniden encode tetiklenir.
 */
export async function ProfilMedyasiSec(
  tur: ProfilMedyaTuru,
): Promise<
  | { ok: true; medya: SecilenProfilMedya }
  | { ok: false; hata: string; iptal?: boolean }
> {
  const secim = await GaleriAc({
    mediaTypes: ['images'],
    quality: tur === 'cover' ? 0.55 : 0.65,
    uyumluFormat: true,
    allowsEditing: true,
    aspect: tur === 'cover' ? [3, 1] : [1, 1],
  });
  if (!secim.ok) {
    if (secim.hata.includes('build') || secim.hata.includes('native')) {
      return {
        ok: false,
        hata: i18n.t('auth.fotoSeciciYok'),
        iptal: secim.iptal,
      };
    }
    return secim;
  }

  return {
    ok: true,
    medya: { uri: secim.asset.uri, mimeType: secim.asset.mimeType },
  };
}

/**
 * Yerel URI'yi Supabase storage'a yükler; profiles.avatar_url / cover_url günceller.
 */
export async function ProfilMedyasiUriIleYukle(
  tur: ProfilMedyaTuru,
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
        hata: i18n.t('auth.yuklemeCezasi'),
      };
    }

    // Gerçek JPEG + boyut küçültme (HEIC’i jpeg diye yaftalamak yetmez)
    const hazir = await ProfilGorseliniHazirla(uri, tur);
    const yuklenecekUri = hazir?.uri ?? uri;
    const hamMime = (hazir?.mimeType ?? mimeType ?? '').toLowerCase();
    const heicMi =
      !hazir &&
      (hamMime.includes('heic') ||
        hamMime.includes('heif') ||
        /\.heic($|\?)/i.test(uri) ||
        /\.heif($|\?)/i.test(uri));
    if (heicMi) {
      return {
        ok: false,
        hata: i18n.t('auth.medyaHeicDesteklenmiyor'),
      };
    }

    const guvenliMime = hazir?.mimeType ?? 'image/jpeg';
    const path = `${uid}/${tur}-${Date.now()}.jpg`;

    const up = await DepoyaMedyaYukle(supabase, {
      bucket: 'profile-media',
      path,
      uri: yuklenecekUri,
      mime: guvenliMime,
      tur: 'image',
      upsert: true,
      maxBytes: PROFIL_MEDYA_MAX_BAYT,
    });

    if (!up.ok) {
      return {
        ok: false,
        hata: up.hata || i18n.t('auth.medyaYuklenemedi'),
      };
    }

    const { data: pub } = supabase.storage.from('profile-media').getPublicUrl(path);
    const url = `${pub.publicUrl}?t=${Date.now()}`;
    const column = tur === 'avatar' ? 'avatar_url' : 'cover_url';

    const { error: dbErr } = await supabase
      .from('profiles')
      .update({ [column]: url })
      .eq('id', uid);

    if (dbErr) {
      return {
        ok: false,
        hata: dbErr.message || i18n.t('auth.medyaYuklenemedi'),
      };
    }

    return { ok: true, url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    return {
      ok: false,
      hata: msg || i18n.t('auth.medyaYuklenemedi'),
    };
  }
}

/**
 * Galeriinden seçip Supabase storage'a yükler; profiles.avatar_url / cover_url günceller.
 */
export async function ProfilMedyasiYukle(
  tur: ProfilMedyaTuru,
): Promise<{ ok: true; url: string } | { ok: false; hata: string; iptal?: boolean }> {
  const secim = await ProfilMedyasiSec(tur);
  if (!secim.ok) return secim;

  const yukleme = await ProfilMedyasiUriIleYukle(
    tur,
    secim.medya.uri,
    secim.medya.mimeType,
  );
  if (!yukleme.ok) return yukleme;
  return yukleme;
}
