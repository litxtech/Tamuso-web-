/** Image / expo-video için güvenli uzak URI — boş, göreli, junk → false */
export function MedyaUriGecerliMi(
  uri: string | null | undefined,
): uri is string {
  return typeof uri === 'string' && /^https?:\/\//i.test(uri.trim());
}

export function MedyaUriGuvenli(
  uri: string | null | undefined,
): string | null {
  return MedyaUriGecerliMi(uri) ? uri.trim() : null;
}

/**
 * Tam ekran / galeri önizleme — https + yerel picker (file/content/ph).
 * Video / uzak feed için MedyaUriGuvenli kullan.
 */
export function MedyaUriOnizlemeGuvenli(
  uri: string | null | undefined,
): string | null {
  if (typeof uri !== 'string') return null;
  const t = uri.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^(file|content|ph|assets-library):/i.test(t)) return t;
  return null;
}

/**
 * Liste / profil küçük önizleme — Supabase public object URL'sini
 * render/image ile küçültür (dev JPEG telefon fotoğrafları RN Image'de boş kalabiliyor).
 * HEIC transform desteklenmez → orijinal URL.
 */
export function MedyaUriKucuk(
  uri: string | null | undefined,
  opts?: { w?: number; h?: number },
): string | null {
  const safe = MedyaUriOnizlemeGuvenli(uri);
  if (!safe) return null;
  if (!/^https?:\/\//i.test(safe)) return safe; // file:// yerel önizleme

  if (/\.heic($|\?)/i.test(safe) || /\.heif($|\?)/i.test(safe)) {
    return safe;
  }
  // Video dosyaları render/image ile kırpılmaz
  if (/\.(mp4|mov|m4v|webm|mkv|avi)($|\?)/i.test(safe)) {
    return null;
  }

  // Zaten render/image ise olduğu gibi bırak
  if (/\/storage\/v1\/render\/image\//i.test(safe)) {
    return safe;
  }

  const m = safe.match(
    /^(https?:\/\/[^/?#]+)\/storage\/v1\/object\/public\/([^?#]+)/i,
  );
  if (!m) return safe;

  const origin = m[1];
  const path = m[2];
  const w = Math.max(32, Math.min(2048, Math.round(opts?.w ?? 800)));
  const h = Math.max(32, Math.min(2048, Math.round(opts?.h ?? 800)));
  return `${origin}/storage/v1/render/image/public/${path}?width=${w}&height=${h}&resize=cover`;
}
