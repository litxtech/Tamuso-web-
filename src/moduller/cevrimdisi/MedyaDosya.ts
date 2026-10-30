export type MedyaDiskOzet = {
  image: number;
  video: number;
  pin: number;
  toplam: number;
};

const BOS: MedyaDiskOzet = { image: 0, video: 0, pin: 0, toplam: 0 };

export function medyaKlasorYolu(kok: string, userId: string): string {
  const ayir = kok.endsWith('/') ? '' : '/';
  return `${kok}${ayir}tamuso-offline/${userId}/`;
}

function turAyir(ad: string): 'image' | 'video' | 'pin' | 'diger' {
  if (ad.startsWith('pin-')) return 'pin';
  if (ad.startsWith('image-')) return 'image';
  if (ad.startsWith('video-')) return 'video';
  return 'diger';
}

async function fsModulu() {
  return import('expo-file-system/legacy');
}

/** İndirilen dosyaların gerçek boyutu. Disk yoksa sıfır döner. */
export async function MedyaDiskOlc(userId: string): Promise<MedyaDiskOzet> {
  if (!userId) return { ...BOS };
  try {
    const FS = await fsModulu();
    const kok = FS.cacheDirectory;
    if (!kok || typeof FS.readDirectoryAsync !== 'function' || typeof FS.getInfoAsync !== 'function') {
      return { ...BOS };
    }
    const klasor = medyaKlasorYolu(kok, userId);
    const bilgi = await FS.getInfoAsync(klasor);
    if (!bilgi.exists) return { ...BOS };
    const adlar = await FS.readDirectoryAsync(klasor);
    const ozet: MedyaDiskOzet = { image: 0, video: 0, pin: 0, toplam: 0 };
    for (const ad of adlar) {
      const dosya = await FS.getInfoAsync(`${klasor}${ad}`);
      const boyut = dosya.exists ? Math.max(0, dosya.size ?? 0) : 0;
      const tur = turAyir(ad);
      if (tur === 'image') ozet.image += boyut;
      else if (tur === 'video') ozet.video += boyut;
      else if (tur === 'pin') ozet.pin += boyut;
      ozet.toplam += boyut;
    }
    return ozet;
  } catch {
    return { ...BOS };
  }
}

export async function MedyaYollariSil(yollar: Array<string | null | undefined>): Promise<void> {
  const liste = yollar.filter((y): y is string => !!y);
  if (liste.length === 0) return;
  try {
    const FS = await fsModulu();
    if (typeof FS.deleteAsync !== 'function') return;
    for (const yol of liste) {
      await FS.deleteAsync(yol, { idempotent: true }).catch(() => undefined);
    }
  } catch {
    /* indeks yine de düşer */
  }
}

/** Otomatik fotoğraf/video önbelleği. pin- dosyalarına dokunmaz. */
export async function MedyaTurDosyalariniSil(
  userId: string,
  tur: 'image' | 'video',
): Promise<void> {
  if (!userId) return;
  try {
    const FS = await fsModulu();
    const kok = FS.cacheDirectory;
    if (!kok || typeof FS.readDirectoryAsync !== 'function' || typeof FS.deleteAsync !== 'function') {
      return;
    }
    const klasor = medyaKlasorYolu(kok, userId);
    const bilgi = await FS.getInfoAsync(klasor);
    if (!bilgi.exists) return;
    const adlar = await FS.readDirectoryAsync(klasor);
    const onek = `${tur}-`;
    for (const ad of adlar) {
      if (!ad.startsWith(onek)) continue;
      await FS.deleteAsync(`${klasor}${ad}`, { idempotent: true }).catch(() => undefined);
    }
  } catch {
    /* */
  }
}
