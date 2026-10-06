import {
  MedyaUriGuvenli,
  MedyaUriKucuk,
} from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv|avi)($|\?)/i;

/** Story önizleme Image için uygun mu (video URI’leri reddet) */
export function HikayeOnizlemeGorselMi(uri: string | null | undefined): boolean {
  const safe = MedyaUriGuvenli(uri);
  if (!safe) return false;
  return !VIDEO_EXT.test(safe);
}

/**
 * Avatar / tepsi dairesi için kare, cover-kırpılmış URL.
 * Story preview varsa onu, yoksa / video ise profil resmini kullanır.
 */
export function HikayeAvatarDaireUri(
  previewUrl: string | null | undefined,
  avatarUrl: string | null | undefined,
  px: number,
): string | null {
  const boyut = Math.max(48, Math.min(512, Math.round(px)));
  const adaylar = [previewUrl, avatarUrl];
  for (const aday of adaylar) {
    if (!HikayeOnizlemeGorselMi(aday)) continue;
    const safe = MedyaUriGuvenli(aday)!;
    return MedyaUriKucuk(safe, { w: boyut, h: boyut }) ?? safe;
  }
  const profil = MedyaUriGuvenli(avatarUrl);
  if (!profil || VIDEO_EXT.test(profil)) return null;
  return MedyaUriKucuk(profil, { w: boyut, h: boyut }) ?? profil;
}
