/**
 * React Native: fetch(uri).blob() sıkça type=text/plain döner.
 * Supabase Storage bunu reddeder. ArrayBuffer + açık contentType kullan.
 */

import i18n from '../../i18n';

const SES_UZANTILARI = [
  'mp3',
  'wav',
  'm4a',
  'aac',
  'ogg',
  'opus',
  'flac',
  'webm',
  'aiff',
  'aif',
  'mid',
  'midi',
  'caf',
  'wma',
] as const;

export function MedyaUzantisiCoz(
  uri: string,
  mime?: string | null,
  varsayilan: 'jpg' | 'mp4' | 'mp3' = 'jpg',
): string {
  const m = (mime ?? '').toLowerCase();
  if (m.includes('png')) return 'png';
  if (m.includes('webp')) return 'webp';
  if (m.includes('heic') || m.includes('heif')) return 'heic';
  if (m.includes('gif')) return 'gif';
  if (m.includes('quicktime')) return 'mov';
  if (m.includes('mpeg') || m === 'audio/mp3' || m.includes('mp3')) return 'mp3';
  if (m.includes('wav') || m.includes('wave')) return 'wav';
  if (m.includes('m4a') || m.includes('x-m4a')) return 'm4a';
  if (m.includes('aac')) return 'aac';
  if (m.includes('ogg') || m.includes('opus')) return m.includes('opus') ? 'opus' : 'ogg';
  if (m.includes('flac')) return 'flac';
  if (m.includes('aiff') || m.includes('aif')) return 'aiff';
  if (m.includes('midi') || m.includes('mid')) return 'midi';
  if (m.includes('mp4') && m.startsWith('audio/')) return 'm4a';
  if (m.includes('mp4')) return 'mp4';
  if (m.includes('webm')) return m.startsWith('audio/') ? 'webm' : 'webm';
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';

  const fromUri = uri.split('?')[0]?.split('.').pop()?.toLowerCase();
  if (
    fromUri &&
    [
      'jpg',
      'jpeg',
      'png',
      'webp',
      'heic',
      'heif',
      'gif',
      'mp4',
      'mov',
      'webm',
      ...SES_UZANTILARI,
    ].includes(fromUri)
  ) {
    if (fromUri === 'jpeg') return 'jpg';
    if (fromUri === 'heif') return 'heic';
    if (fromUri === 'aif') return 'aiff';
    if (fromUri === 'mid') return 'midi';
    return fromUri;
  }
  return varsayilan;
}

/** text/plain / boş mime → uzantıdan doğru tip */
export function GuvenliMimeTipi(
  mime: string | null | undefined,
  ext: string,
  tur: 'image' | 'video' | 'audio' = 'image',
): string {
  const m = (mime ?? '').trim().toLowerCase();
  if (
    m &&
    m !== 'text/plain' &&
    m !== 'application/octet-stream' &&
    m !== 'application/json' &&
    !m.startsWith('text/')
  ) {
    return m;
  }

  if (tur === 'video') {
    if (ext === 'mov') return 'video/quicktime';
    if (ext === 'webm') return 'video/webm';
    return 'video/mp4';
  }

  if (tur === 'audio') {
    switch (ext) {
      case 'wav':
        return 'audio/wav';
      case 'm4a':
        return 'audio/mp4';
      case 'aac':
        return 'audio/aac';
      case 'ogg':
        return 'audio/ogg';
      case 'opus':
        return 'audio/opus';
      case 'flac':
        return 'audio/flac';
      case 'webm':
        return 'audio/webm';
      case 'aiff':
        return 'audio/aiff';
      case 'midi':
        return 'audio/midi';
      case 'mp4':
        return 'audio/mp4';
      default:
        return 'audio/mpeg';
    }
  }

  switch (ext) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/jpeg';
  }
}

/**
 * Yerel dosya URI → Uint8Array (blob.type tuzağı yok).
 */
export async function YerelDosyayiBaytOku(
  uri: string,
): Promise<Uint8Array> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(i18n.t('medyaYukle.dosyaOkunamadi', { status: response.status }));
  }
  // arrayBuffer: RN'de blob.type=text/plain sorununu atlar
  const buf = await response.arrayBuffer();
  return new Uint8Array(buf);
}

export type DepoyaYukleGirdi = {
  bucket: string;
  path: string;
  uri: string;
  mime?: string | null;
  tur?: 'image' | 'video' | 'audio';
  upsert?: boolean;
  /** Aşılırsa yükleme yapılmaz (ör. profile-media 5 MiB) */
  maxBytes?: number;
};

export type DepoyaYukleSonuc =
  | { ok: true; path: string; contentType: string }
  | { ok: false; hata: string };

/**
 * Supabase Storage yükleme — doğru Content-Type ile.
 */
export async function DepoyaMedyaYukle(
  supabase: {
    storage: {
      from: (bucket: string) => {
        upload: (
          path: string,
          body: Uint8Array,
          opts: { contentType: string; upsert: boolean },
        ) => Promise<{ error: { message: string } | null }>;
      };
    };
  },
  girdi: DepoyaYukleGirdi,
): Promise<DepoyaYukleSonuc> {
  const tur = girdi.tur ?? 'image';
  const ext = MedyaUzantisiCoz(
    girdi.uri,
    girdi.mime,
    tur === 'video' ? 'mp4' : tur === 'audio' ? 'mp3' : 'jpg',
  );
  const contentType = GuvenliMimeTipi(girdi.mime, ext, tur);

  try {
    const bytes = await YerelDosyayiBaytOku(girdi.uri);
    if (bytes.byteLength === 0) {
      return { ok: false, hata: i18n.t('medyaYukle.dosyaBos') };
    }
    if (girdi.maxBytes != null && bytes.byteLength > girdi.maxBytes) {
      const mb = Math.max(1, Math.round(girdi.maxBytes / (1024 * 1024)));
      return {
        ok: false,
        hata: i18n.t('auth.medyaCokBuyuk', { mb }),
      };
    }

    const { error } = await supabase.storage.from(girdi.bucket).upload(
      girdi.path,
      bytes,
      {
        contentType,
        upsert: girdi.upsert ?? false,
      },
    );

    if (error) {
      return {
        ok: false,
        hata: /mime|text\/plain|not supported/i.test(error.message)
          ? i18n.t('medyaYukle.mimeReddedildi', { type: contentType })
          : error.message,
      };
    }

    return { ok: true, path: girdi.path, contentType };
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : i18n.t('medyaYukle.yuklemeBasarisiz'),
    };
  }
}
