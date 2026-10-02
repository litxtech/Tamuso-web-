import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import { OrtamDegiskenleri } from '../../../yapilandirma/OrtamDegiskenleri';
import {
  GaleriCokluAc,
  GALERI_COKLU_LIMIT,
  KameraAc,
  type GaleriAsset,
} from '../../../ortak/medya/ImagePickerHazirMi';
import {
  DepoyaMedyaYukle,
  MedyaUzantisiCoz,
} from '../../../ortak/medya/DepoyaMedyaYukle';

export type DmMedyaTuru = 'image' | 'video';
export type DmMedyaKaynak = 'galeri' | 'kamera';

export type DmMedyaTaslak = {
  /** Yerel önizleme kimliği */
  id: string;
  uri: string;
  tur: DmMedyaTuru;
  mimeType?: string | null;
  width?: number;
  height?: number;
  duration?: number | null;
};

function publicUrl(path: string): string {
  const base = OrtamDegiskenleri.supabaseUrl?.replace(/\/$/, '');
  return `${base}/storage/v1/object/public/dm-media/${path}`;
}

function taslakId(): string {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function assetToTaslak(asset: GaleriAsset, tur: DmMedyaTuru): DmMedyaTaslak {
  return {
    id: taslakId(),
    uri: asset.uri,
    tur,
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
    duration: asset.duration,
  };
}

async function uploadBanKontrol(): Promise<
  { ok: true } | { ok: false; hata: string }
> {
  const { YaptirimAktifMi } = await import(
    '../../admin/ses-odalari/AdminSesOdasiIslemleri'
  );
  if (await YaptirimAktifMi('upload_ban')) {
    return { ok: false, hata: i18n.t('durumX.uploadBan') };
  }
  return { ok: true };
}

/**
 * Galeri/kamera ile seç — yükleme yok (önizleme için).
 * Galeri: çoklu (max GALERI_COKLU_LIMIT). Kamera: tek.
 */
export async function DmMedyalariSec(
  tur: DmMedyaTuru,
  opts?: {
    kaynak?: DmMedyaKaynak;
    /** Kalan kota (mevcut önizleme + yeni). Varsayılan GALERI_COKLU_LIMIT */
    maxAdet?: number;
  },
): Promise<
  | { ok: true; items: DmMedyaTaslak[] }
  | { ok: false; hata: string; iptal?: boolean }
> {
  try {
    const kaynak = opts?.kaynak ?? 'galeri';
    const maxAdet = Math.max(
      1,
      Math.min(opts?.maxAdet ?? GALERI_COKLU_LIMIT, GALERI_COKLU_LIMIT),
    );
    const pickerOpts = {
      mediaTypes: (tur === 'video' ? ['videos'] : ['images']) as (
        | 'images'
        | 'videos'
      )[],
      videoMaxDuration: 120,
    };

    if (kaynak === 'kamera') {
      const secim = await KameraAc(pickerOpts);
      if (!secim.ok) return secim;
      return { ok: true, items: [assetToTaslak(secim.asset, tur)] };
    }

    const secim = await GaleriCokluAc({
      ...pickerOpts,
      selectionLimit: maxAdet,
    });
    if (!secim.ok) return secim;
    return {
      ok: true,
      items: secim.assets.map((a) => assetToTaslak(a, tur)),
    };
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : i18n.t('durumX.yuklemeBasarisiz'),
    };
  }
}

/** Yerel URI → dm-media (önizleme onayından sonra) */
export async function DmMedyaUriYukle(
  item: Pick<DmMedyaTaslak, 'uri' | 'tur' | 'mimeType'>,
): Promise<
  | { ok: true; url: string; messageType: DmMedyaTuru }
  | { ok: false; hata: string }
> {
  try {
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return { ok: false, hata: i18n.t('ortak.oturumYok') };

    const ban = await uploadBanKontrol();
    if (!ban.ok) return ban;

    const ext = MedyaUzantisiCoz(
      item.uri,
      item.mimeType,
      item.tur === 'video' ? 'mp4' : 'jpg',
    );
    const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const up = await DepoyaMedyaYukle(supabase, {
      bucket: 'dm-media',
      path,
      uri: item.uri,
      mime: item.mimeType,
      tur: item.tur,
      upsert: false,
    });

    if (!up.ok) return { ok: false, hata: up.hata };

    const { data: pub } = supabase.storage.from('dm-media').getPublicUrl(path);
    return {
      ok: true,
      url: pub?.publicUrl || publicUrl(path),
      messageType: item.tur,
    };
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : i18n.t('durumX.yuklemeBasarisiz'),
    };
  }
}

/** Galeri veya kamera: foto / video → dm-media bucket (eski tek adımlı API) */
export async function DmMedyasiSecVeYukle(
  tur: DmMedyaTuru,
  opts?: {
    kaynak?: DmMedyaKaynak;
    onYuklemeBasladi?: () => void;
  },
): Promise<
  | { ok: true; url: string; messageType: DmMedyaTuru }
  | { ok: false; hata: string; iptal?: boolean }
> {
  const secim = await DmMedyalariSec(tur, {
    kaynak: opts?.kaynak,
    maxAdet: 1,
  });
  if (!secim.ok) return secim;
  const item = secim.items[0];
  if (!item) {
    return { ok: false, hata: i18n.t('auth.iptalEdildi'), iptal: true };
  }
  const basladi = opts?.onYuklemeBasladi;
  if (typeof basladi === 'function') basladi();
  return await DmMedyaUriYukle(item);
}

/** Yerel ses dosyası (m4a/aac/mp4 audio) → dm-media */
export async function DmSesMedyasiYukle(
  uri: string,
  opts?: { mime?: string | null; durationMs?: number },
): Promise<
  | { ok: true; url: string; mime: string; messageType: 'voice' }
  | { ok: false; hata: string }
> {
  try {
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return { ok: false, hata: i18n.t('ortak.oturumYok') };

    const ban = await uploadBanKontrol();
    if (!ban.ok) return ban;

    const mime = opts?.mime ?? 'audio/mp4';
    const ext = MedyaUzantisiCoz(uri, mime, 'mp3');
    const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext === 'mp3' ? 'm4a' : ext}`;

    const up = await DepoyaMedyaYukle(supabase, {
      bucket: 'dm-media',
      path,
      uri,
      mime,
      tur: 'audio',
      upsert: false,
    });
    if (!up.ok) return { ok: false, hata: up.hata };

    const { data: pub } = supabase.storage.from('dm-media').getPublicUrl(path);
    return {
      ok: true,
      url: pub?.publicUrl || publicUrl(path),
      mime: up.contentType,
      messageType: 'voice',
    };
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : i18n.t('durumX.yuklemeBasarisiz'),
    };
  }
}
