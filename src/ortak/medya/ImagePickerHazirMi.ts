import { Platform } from 'react-native';
import i18n from '../../i18n';

type ImagePickerModul = typeof import('expo-image-picker');

let nativeHazir: boolean | null = null;
let modulOnbellek: ImagePickerModul | null = null;
let yuklemeSoz: Promise<
  { ok: true; ImagePicker: ImagePickerModul } | { ok: false; hata: string }
> | null = null;
/** true = granted biliniyor; false = reddedildi; null = henüz bilinmiyor */
let galeriIzni: boolean | null = null;
let kameraIzni: boolean | null = null;

/**
 * Expo Modules (SDK 50+) NativeModules'a yazmaz.
 * requireOptionalNativeModule ile gerçek bağlantıyı kontrol et.
 */
export function ImagePickerNativeHazirMi(): boolean {
  if (Platform.OS === 'web') return true;
  if (nativeHazir != null) return nativeHazir;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireOptionalNativeModule } = require('expo-modules-core') as {
      requireOptionalNativeModule: (name: string) => unknown;
    };
    nativeHazir = requireOptionalNativeModule('ExponentImagePicker') != null;
  } catch {
    nativeHazir = false;
  }
  return nativeHazir;
}

export async function ImagePickerModuluYukle(): Promise<
  | { ok: true; ImagePicker: ImagePickerModul }
  | { ok: false; hata: string }
> {
  if (modulOnbellek) return { ok: true, ImagePicker: modulOnbellek };
  if (yuklemeSoz) return yuklemeSoz;

  if (!ImagePickerNativeHazirMi()) {
    return {
      ok: false,
      hata: i18n.t('auth.medyaSeciciYok'),
    };
  }

  yuklemeSoz = (async () => {
    try {
      const ImagePicker = await import('expo-image-picker');
      modulOnbellek = ImagePicker;
      return { ok: true as const, ImagePicker };
    } catch {
      yuklemeSoz = null;
      return {
        ok: false as const,
        hata: i18n.t('auth.medyaSeciciYok'),
      };
    }
  })();

  return yuklemeSoz;
}

/**
 * Galeri açılmadan önce JS paketini + izin durumunu ısıtır.
 * Uygulama / medya ekranı mount’ta çağır — tıklamada await maliyeti sıfırlanır.
 * Varsayılan: izin dialog’u açmaz (izinIste: false).
 */
export function ImagePickerOnIsit(opts?: { izinIste?: boolean }): void {
  // Dinamik import’u hemen kick et (promise cache); izin ayrı await
  const yukleme = ImagePickerModuluYukle();
  void (async () => {
    const mod = await yukleme;
    if (!mod.ok) return;
    if (galeriIzni === true) return;
    try {
      const mevcut =
        await mod.ImagePicker.getMediaLibraryPermissionsAsync();
      if (mevcut.granted) {
        galeriIzni = true;
        return;
      }
      if (opts?.izinIste === true && mevcut.canAskAgain !== false) {
        const istenen =
          await mod.ImagePicker.requestMediaLibraryPermissionsAsync();
        galeriIzni = istenen.granted;
      }
      // izinIste değilse cache’e false yazma — video seçiminde request edilebilsin
    } catch {
      /* ısıtma sessiz */
    }
  })();
}

/**
 * İzin varsa cache’ten true; yoksa get→request. Zaten granted ise native çağrı yok.
 */
export async function ImagePickerGaleriIzniAl(
  ImagePicker: ImagePickerModul,
): Promise<boolean> {
  if (galeriIzni === true) return true;
  try {
    const mevcut = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (mevcut.granted) {
      galeriIzni = true;
      return true;
    }
    if (mevcut.canAskAgain === false) {
      galeriIzni = false;
      return false;
    }
    const istenen = await ImagePicker.requestMediaLibraryPermissionsAsync();
    galeriIzni = istenen.granted;
    return istenen.granted;
  } catch {
    return false;
  }
}

export type GaleriMedyaTipi = 'images' | 'videos';

export type GaleriAsset = {
  uri: string;
  mimeType?: string | null;
  type?: string | null;
  width?: number;
  height?: number;
  duration?: number | null;
};

export type GaleriSecimSonucu =
  | { ok: true; asset: GaleriAsset }
  | { ok: false; hata: string; iptal?: boolean };

export type GaleriCokluSecimSonucu =
  | { ok: true; assets: GaleriAsset[] }
  | { ok: false; hata: string; iptal?: boolean };

/** DM / galeri çoklu seçim üst sınırı */
export const GALERI_COKLU_LIMIT = 10;

function assetDonustur(a: {
  uri: string;
  mimeType?: string | null;
  type?: string | null;
  width?: number;
  height?: number;
  duration?: number | null;
}): GaleriAsset {
  return {
    uri: a.uri,
    mimeType: a.mimeType,
    type: a.type,
    width: a.width,
    height: a.height,
    duration: a.duration,
  };
}

export async function ImagePickerKameraIzniAl(
  ImagePicker: ImagePickerModul,
): Promise<boolean> {
  if (kameraIzni === true) return true;
  try {
    const mevcut = await ImagePicker.getCameraPermissionsAsync();
    if (mevcut.granted) {
      kameraIzni = true;
      return true;
    }
    if (mevcut.canAskAgain === false) {
      kameraIzni = false;
      return false;
    }
    const istenen = await ImagePicker.requestCameraPermissionsAsync();
    kameraIzni = istenen.granted;
    return istenen.granted;
  } catch {
    return false;
  }
}

/** Kamera ile foto / video çek → asset */
export async function KameraAc(opts: {
  mediaTypes: GaleriMedyaTipi[];
  quality?: number;
  videoMaxDuration?: number;
}): Promise<GaleriSecimSonucu> {
  const mod = await ImagePickerModuluYukle();
  if (!mod.ok) return { ok: false, hata: mod.hata };

  const { ImagePicker } = mod;
  const izinVar = await ImagePickerKameraIzniAl(ImagePicker);
  if (!izinVar) {
    return { ok: false, hata: i18n.t('auth.kameraIzni') };
  }

  const videoVar = opts.mediaTypes.includes('videos');
  try {
    const cameraType =
      ImagePicker.CameraType?.back ??
      ImagePicker.CameraType?.Back ??
      undefined;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: opts.mediaTypes,
      allowsEditing: false,
      quality: opts.quality ?? 1,
      videoMaxDuration: opts.videoMaxDuration ?? (videoVar ? 120 : undefined),
      ...(cameraType != null ? { cameraType } : {}),
    });
    if (result.canceled || !result.assets?.[0]) {
      return { ok: false, hata: i18n.t('auth.iptalEdildi'), iptal: true };
    }
    return { ok: true, asset: assetDonustur(result.assets[0]) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('ExponentImagePicker') || msg.includes('native module')) {
      return {
        ok: false,
        hata: i18n.t('auth.kameraYok'),
      };
    }
    return { ok: false, hata: i18n.t('auth.medyaYuklenemedi') };
  }
}

/**
 * Sistem galerisini mümkün olan en hızlı şekilde açar.
 *
 * - Foto: izin beklemez (PHPicker / Android Photo Picker).
 * - Video: önce açmayı dene; yalnızca native hata verirse izin iste (dialog
 *   picker’dan önce gelmesin). Isıtma (ImagePickerOnIsit) izin cache’ler.
 * - quality:1 + allowsEditing:false → iOS fast-path (decode/re-encode yok).
 * - selectionLimit > 1 → çoklu seçim (PHPicker / Android Photo Picker).
 */
export async function GaleriCokluAc(opts: {
  mediaTypes: GaleriMedyaTipi[];
  quality?: number;
  videoMaxDuration?: number;
  /** 1 = tekil; >1 çoklu. Varsayılan GALERI_COKLU_LIMIT */
  selectionLimit?: number;
  /**
   * true → JPEG uyumlu (profil/kapak). false/undefined → Current (HEIC, hızlı DM).
   * quality < 1 ile birlikte kullan; aksi halde 5MB storage limitini aşabilir.
   */
  uyumluFormat?: boolean;
  /** Profil/kapak: crop UI — yeniden encode tetikler, dosyayı küçültür */
  allowsEditing?: boolean;
  aspect?: [number, number];
}): Promise<GaleriCokluSecimSonucu> {
  const mod = await ImagePickerModuluYukle();
  if (!mod.ok) return { ok: false, hata: mod.hata };

  const { ImagePicker } = mod;
  const videoVar = opts.mediaTypes.includes('videos');
  const limit = Math.max(
    1,
    Math.min(opts.selectionLimit ?? GALERI_COKLU_LIMIT, GALERI_COKLU_LIMIT),
  );

  // Yalnız cache’te true ise atla; aksi halde get/request ile picker’ı geciktirme
  if (videoVar && galeriIzni === true) {
    /* izin hazır — launch’a geç */
  } else if (videoVar && Platform.OS === 'ios' && galeriIzni === false) {
    return { ok: false, hata: i18n.t('auth.galeriIzni') };
  }

  const launchOpts: Record<string, unknown> = {
    mediaTypes: opts.mediaTypes,
    allowsEditing: opts.allowsEditing === true,
    // <1 iOS’ta re-encode tetikler; fast-path için 1 şart
    quality: opts.quality ?? 1,
    selectionLimit: limit,
    allowsMultipleSelection: limit > 1,
    ...(opts.aspect ? { aspect: opts.aspect } : {}),
    ...(opts.videoMaxDuration != null
      ? { videoMaxDuration: opts.videoMaxDuration }
      : {}),
  };

  // Enum expo sürümünde yoksa ekleme — undefined.Current crash olmasın
  const modes = ImagePicker.UIImagePickerPreferredAssetRepresentationMode;
  const prefMode = opts.uyumluFormat
    ? (modes?.Compatible ?? modes?.Automatic)
    : (modes?.Current ?? modes?.Automatic);
  if (prefMode != null) {
    launchOpts.preferredAssetRepresentationMode = prefMode;
  }

  const birKezAc = async (): Promise<GaleriCokluSecimSonucu> => {
    if (typeof ImagePicker.launchImageLibraryAsync !== 'function') {
      return {
        ok: false,
        hata: i18n.t('auth.medyaSeciciYok'),
      };
    }
    const result = await ImagePicker.launchImageLibraryAsync(launchOpts);
    if (result.canceled || !result.assets?.length) {
      return {
        ok: false as const,
        hata: i18n.t('auth.iptalEdildi'),
        iptal: true as const,
      };
    }
    return {
      ok: true as const,
      assets: result.assets.slice(0, limit).map(assetDonustur),
    };
  };

  try {
    return await birKezAc();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('ExponentImagePicker') || msg.includes('native module')) {
      return {
        ok: false,
        hata: i18n.t('auth.medyaSeciciYok'),
      };
    }

    // İzin / limited library: bir kez isteyip tekrar aç (foto + video)
    const izinVar = await ImagePickerGaleriIzniAl(ImagePicker);
    if (!izinVar) {
      return { ok: false, hata: i18n.t('auth.galeriIzni') };
    }
    try {
      return await birKezAc();
    } catch {
      return {
        ok: false,
        hata: i18n.t('auth.medyaYuklenemedi'),
      };
    }
  }
}

export async function GaleriAc(opts: {
  mediaTypes: GaleriMedyaTipi[];
  quality?: number;
  videoMaxDuration?: number;
  uyumluFormat?: boolean;
  allowsEditing?: boolean;
  aspect?: [number, number];
}): Promise<GaleriSecimSonucu> {
  const sonuc = await GaleriCokluAc({ ...opts, selectionLimit: 1 });
  if (!sonuc.ok) return sonuc;
  const asset = sonuc.assets[0];
  if (!asset) {
    return { ok: false, hata: i18n.t('auth.iptalEdildi'), iptal: true };
  }
  return { ok: true, asset };
}
