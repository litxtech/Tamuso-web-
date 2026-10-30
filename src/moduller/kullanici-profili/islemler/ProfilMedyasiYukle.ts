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

/** Storage bucket limiti (016_profil_medya) â€” 5 MiB */
const PROFIL_MEDYA_MAX_BAYT = 5 * 1024 * 1024;

/**
 * Galeriden profil gÃ¶rseli seÃ§er (yÃ¼klemez). KayÄ±t Ã¶ncesi Ã¶nizleme iÃ§in.
 * Kapak daha agresif sÄ±kÄ±ÅŸtÄ±rÄ±lÄ±r; crop ile yeniden encode tetiklenir.
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
 * Yerel URI'yi Supabase storage'a yÃ¼kler; profiles.avatar_url / cover_url gÃ¼nceller.
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
      '../../medya-yukleme/AdminSesOdasiIslemleri'
    );
    if (await YaptirimAktifMi('upload_ban')) {
      return {
        ok: false,
        hata: i18n.t('auth.yuklemeCezasi'),
      };
    }

    const hazir = await ProfilGorseliniHazirla(uri, tur);
    const yuklenecekUri = hazir?.uri ?? uri;
    const guvenliMime = hazir?.mimeType ?? mimeType ?? 'image/jpeg';
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

    const { data: pub } = supabase.storage.from('profile-media').getPublicUrl(up.path);
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
 * Galeriinden seÃ§ip Supabase storage'a yÃ¼kler; profiles.avatar_url / cover_url gÃ¼nceller.
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

