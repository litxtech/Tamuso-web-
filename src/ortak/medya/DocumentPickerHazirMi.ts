import { Platform } from 'react-native';
import i18n from '../../i18n';

type DocumentPickerModul = typeof import('expo-document-picker');

let nativeHazir: boolean | null = null;
let modulOnbellek: DocumentPickerModul | null = null;

export function DocumentPickerNativeHazirMi(): boolean {
  if (Platform.OS === 'web') return true;
  if (nativeHazir != null) return nativeHazir;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireOptionalNativeModule } = require('expo-modules-core') as {
      requireOptionalNativeModule: (name: string) => unknown;
    };
    nativeHazir = requireOptionalNativeModule('ExpoDocumentPicker') != null;
  } catch {
    nativeHazir = false;
  }
  return nativeHazir;
}

async function modulYukle(): Promise<
  | { ok: true; DocumentPicker: DocumentPickerModul }
  | { ok: false; hata: string }
> {
  if (modulOnbellek) return { ok: true, DocumentPicker: modulOnbellek };
  if (!DocumentPickerNativeHazirMi()) {
    return {
      ok: false,
      hata: i18n.t('medyaYukle.dosyaSeciciBuildYok'),
    };
  }
  try {
    const DocumentPicker = await import('expo-document-picker');
    modulOnbellek = DocumentPicker;
    return { ok: true, DocumentPicker };
  } catch {
    return {
      ok: false,
      hata: i18n.t('medyaYukle.documentPickerYok'),
    };
  }
}

export type SesDosyasiSecim =
  | { ok: true; uri: string; name: string; mime: string | null; size: number | null }
  | { ok: false; iptal: true }
  | { ok: false; hata: string };

/**
 * Müzik / ses dosyası seç — mp3, wav, m4a, ogg, flac ve diğer yaygın tipler.
 */
export async function SesDosyasiSec(): Promise<SesDosyasiSecim> {
  const mod = await modulYukle();
  if (!mod.ok) return { ok: false, hata: mod.hata };

  try {
    const sonuc = await mod.DocumentPicker.getDocumentAsync({
      type: [
        'audio/*',
        'audio/mpeg',
        'audio/mp4',
        'audio/wav',
        'audio/x-wav',
        'audio/aac',
        'audio/ogg',
        'audio/flac',
        'audio/webm',
        'application/ogg',
        '*/*',
      ],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (sonuc.canceled || !sonuc.assets?.[0]) {
      return { ok: false, iptal: true };
    }

    const a = sonuc.assets[0];
    return {
      ok: true,
      uri: a.uri,
      name: a.name || 'muzik',
      mime: a.mimeType ?? null,
      size: a.size ?? null,
    };
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : i18n.t('medyaYukle.dosyaSecilemedi'),
    };
  }
}
