import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import i18n from '../../../i18n';

/** Uzak URL → yerel cache dosyası */
export async function UzakDosyayiYerelIndir(
  url: string,
  fileName: string,
): Promise<string> {
  const FS = await import('expo-file-system/legacy');
  const safe = fileName.replace(/[^\w.\-]+/g, '_').slice(0, 80) || 'dosya.pdf';
  const dest = `${FS.cacheDirectory ?? ''}${Date.now()}-${safe}`;
  const res = await FS.downloadAsync(url, dest);
  if (!res?.uri) throw new Error(i18n.t('mesajlar.indirBasarisiz'));
  return res.uri;
}

/** Yerel PDF / medya paylaş veya kaydet (sistem paylaşım paneli) */
export async function YerelDosyayiPaylas(
  uri: string,
  opts?: { mimeType?: string; dialogTitle?: string; uti?: string },
): Promise<void> {
  const Sharing = await import('expo-sharing');
  const uygun = await Sharing.isAvailableAsync();
  if (!uygun) {
    // Yedek: bazı ortamlarda file:// aç
    await Linking.openURL(uri);
    return;
  }
  await Sharing.shareAsync(uri, {
    mimeType: opts?.mimeType ?? 'application/pdf',
    dialogTitle: opts?.dialogTitle ?? i18n.t('mesajlar.indir'),
    UTI: opts?.uti ?? 'com.adobe.pdf',
  });
}

export async function UzakDosyayiIndirVePaylas(
  url: string,
  fileName: string,
  opts?: { mimeType?: string; dialogTitle?: string },
): Promise<void> {
  const uri = await UzakDosyayiYerelIndir(url, fileName);
  await YerelDosyayiPaylas(uri, {
    mimeType: opts?.mimeType,
    dialogTitle: opts?.dialogTitle,
  });
}

export function DosyaMimeTahmin(fileName: string, mime?: string | null): string {
  if (mime && mime !== 'application/octet-stream') return mime;
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'mp4') return 'video/mp4';
  if (ext === 'm4a') return 'audio/mp4';
  return Platform.OS === 'ios' ? 'public.data' : 'application/octet-stream';
}
