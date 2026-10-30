import { cevrimdisiOku, cevrimdisiYaz } from './CevrimdisiDeposu';
import { MedyaPinle } from './MedyaOnbellek';

export type KayitliIcerik = {
  id: string;
  url: string;
  tur: 'image' | 'video' | 'text' | 'audio';
  baslik: string;
  yerel: string | null;
  savedAt: string;
};

/**
 * Kullanıcının "çevrimdışı kaydet" kaydı.
 * `kayitli` alanı LRU listesine girmez. Medya dosyası pin olarak işaretlenir.
 */
export async function CevrimdisiIcerikKaydet(input: {
  userId: string;
  id: string;
  url?: string | null;
  tur: KayitliIcerik['tur'];
  baslik?: string | null;
}): Promise<{ ok: boolean; hata?: string }> {
  const url = (input.url ?? '').trim();
  let yerel: string | null = null;
  if ((input.tur === 'image' || input.tur === 'video') && /^https?:\/\//i.test(url)) {
    const pin = await MedyaPinle(input.userId, url, input.tur);
    if (!pin.ok) return { ok: false, hata: pin.hata };
    yerel = pin.yerel;
  }
  const ham = await cevrimdisiOku<unknown>(input.userId, 'kayitli', []);
  const liste = Array.isArray(ham) ? ham.filter(kayitGecerli) : [];
  const kayit: KayitliIcerik = {
    id: input.id,
    url,
    tur: input.tur,
    baslik: input.baslik ?? '',
    yerel,
    savedAt: new Date().toISOString(),
  };
  await cevrimdisiYaz(input.userId, 'kayitli', [
    kayit,
    ...liste.filter((k) => k.id !== kayit.id),
  ].slice(0, 200));
  return { ok: true };
}

function kayitGecerli(x: unknown): x is KayitliIcerik {
  if (!x || typeof x !== 'object') return false;
  const k = x as KayitliIcerik;
  return typeof k.id === 'string' && typeof k.savedAt === 'string';
}
