import { AgDurumMerkezi } from './AgDurumMerkezi';
import { CevrimdisiAyarOku, medyaOnbellekIzinliMi } from './AyarDeposu';
import { MedyaIndexEkle } from './AnlikGoruntu';
import { medyaKlasorYolu } from './MedyaDosya';
import { kotaHesapla } from './saf/KotaHesabi';

let sonIndirme = 0;
const AKTIF_LIMIT = 1;
let aktif = 0;

async function bosAlan(): Promise<number | null> {
  try {
    const FS = await import('expo-file-system/legacy');
    if (typeof FS.getFreeDiskStorageAsync !== 'function') return null;
    const n = await FS.getFreeDiskStorageAsync();
    return typeof n === 'number' ? n : null;
  } catch {
    return null;
  }
}

/**
 * Yalnızca sıradaki tek medya. Tüm tepsiyi indirmez.
 * Mobil veri kapalıysa ve Wi-Fi yoksa hiçbir şey yazmaz.
 */
export async function MedyaSonrakiniOnYukle(
  userId: string | null | undefined,
  url: string | null | undefined,
  tur: 'image' | 'video',
): Promise<void> {
  if (!userId || !url || !/^https?:\/\//i.test(url)) return;
  if (aktif >= AKTIF_LIMIT) return;
  if (Date.now() - sonIndirme < 800) return;
  const ayar = await CevrimdisiAyarOku(userId);
  const tip = AgDurumMerkezi.gorunum().agTipi;
  if (!medyaOnbellekIzinliMi(ayar, tip, tur)) return;
  const bos = await bosAlan();
  const kota = kotaHesapla(bos, false);
  if (bos != null && bos < 200 * 1024 * 1024) return;
  if (kota < 8 * 1024 * 1024) return;

  aktif += 1;
  sonIndirme = Date.now();
  try {
    const FS = await import('expo-file-system/legacy');
    const kok = FS.cacheDirectory;
    if (!kok) return;
    const klasor = medyaKlasorYolu(kok, userId);
    await FS.makeDirectoryAsync(klasor, { intermediates: true }).catch(() => undefined);
    const ad = `${tur}-${hashKisa(url)}`;
    const hedef = `${klasor}${ad}`;
    const bilgi = await FS.getInfoAsync(hedef);
    if (bilgi.exists) {
      await MedyaIndexEkle(
        userId,
        {
          id: `${tur}:${url}`,
          alan: tur === 'video' ? 'media' : 'story',
          bytes: bilgi.size ?? 0,
          lastUsedAt: Date.now(),
          url,
          yerel: hedef,
        },
        bos,
        false,
      );
      return;
    }
    const indir = await FS.downloadAsync(url, hedef);
    const sonra = await FS.getInfoAsync(indir.uri);
    await MedyaIndexEkle(
      userId,
      {
        id: `${tur}:${url}`,
        alan: tur === 'video' ? 'media' : 'story',
        bytes: sonra.exists ? (sonra.size ?? 0) : 0,
        lastUsedAt: Date.now(),
        url,
        yerel: indir.uri,
      },
      bos,
      false,
    );
  } catch {
    /* ön yükleme zorunlu değil */
  } finally {
    aktif -= 1;
  }
}

const DUSUK_DISK = 200 * 1024 * 1024;

/** Kullanıcı kaydı: hücresel politikayı atlar, boş alan tavanına uyar. */
export async function MedyaPinle(
  userId: string,
  url: string,
  tur: 'image' | 'video',
): Promise<{ ok: true; yerel: string } | { ok: false; hata: 'disk' | 'indirme' | 'adres' }> {
  if (!userId || !/^https?:\/\//i.test(url)) return { ok: false, hata: 'adres' };
  const bos = await bosAlan();
  if (bos != null && bos < DUSUK_DISK) return { ok: false, hata: 'disk' };
  if (kotaHesapla(bos, true) < 8 * 1024 * 1024) return { ok: false, hata: 'disk' };
  try {
    const FS = await import('expo-file-system/legacy');
    const kok = FS.cacheDirectory;
    if (!kok) return { ok: false, hata: 'indirme' };
    const klasor = medyaKlasorYolu(kok, userId);
    await FS.makeDirectoryAsync(klasor, { intermediates: true }).catch(() => undefined);
    const hedef = `${klasor}pin-${tur}-${hashKisa(url)}`;
    const bilgi = await FS.getInfoAsync(hedef);
    const yerel = bilgi.exists ? hedef : (await FS.downloadAsync(url, hedef)).uri;
    const sonra = await FS.getInfoAsync(yerel);
    await MedyaIndexEkle(
      userId,
      {
        id: `pin:${tur}:${url}`,
        alan: 'pin',
        bytes: sonra.exists ? (sonra.size ?? 0) : 0,
        lastUsedAt: Date.now(),
        url,
        yerel,
      },
      bos,
      true,
    );
    return { ok: true, yerel };
  } catch {
    return { ok: false, hata: 'indirme' };
  }
}

function hashKisa(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export async function BosDiskAlani(): Promise<number | null> {
  return bosAlan();
}
