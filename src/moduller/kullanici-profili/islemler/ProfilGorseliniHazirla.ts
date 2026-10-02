export type ProfilGorselHazirTur = 'avatar' | 'cover';

/**
 * Profil/kapak görselini JPEG’e çevirip küçültür.
 *
 * `expo-image-manipulator` native modül gerektirir. Kurulu dev client’ta
 * henüz yoksa import bile uygulama açılışını çökertir — bu yüzden şimdilik
 * no-op: çağıran picker kalitesi / HEIC kontrolüne güvenir.
 *
 * Native rebuild sonrası (`eas build --profile development`) buraya
 * `expo-image-manipulator` eklenebilir.
 */
export async function ProfilGorseliniHazirla(
  _uri: string,
  _tur: ProfilGorselHazirTur,
): Promise<{ uri: string; mimeType: 'image/jpeg' } | null> {
  return null;
}
