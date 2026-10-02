import type { DirektMesaj, MesajLinkOnizleme } from '../okuma/MesajlariGetir';
import { MesajLinkOnizlemeIste } from './MesajLinkOnizlemeIste';
import { MesajIlkUrl } from '../yardimcilar/MesajUrlAyikla';
import { OzellikBayragiAktifMi } from '../../ozellik-bayraklari/OzellikBayragiAktifMi';

const devamEden = new Set<string>();

/**
 * link_url / gövde URL'si var, preview yoksa sunucudan doldur.
 * Aynı mesaj için paralel çağrıları tekilleştirir.
 */
export async function MesajLinkOnizlemeDoldur(
  mesaj: Pick<DirektMesaj, 'id' | 'body' | 'link_url' | 'link_preview' | 'message_type'>,
): Promise<MesajLinkOnizleme | null> {
  if (!OzellikBayragiAktifMi('link_preview_enabled')) return null;
  if (mesaj.link_preview?.title || mesaj.link_preview?.image_url) {
    return mesaj.link_preview;
  }

  const url =
    mesaj.link_url ||
    (mesaj.message_type === 'text' || mesaj.body
      ? MesajIlkUrl(mesaj.body)
      : null);
  if (!url) return null;

  const key = `${mesaj.id}:${url}`;
  if (devamEden.has(key)) return null;
  devamEden.add(key);
  try {
    const lp = await MesajLinkOnizlemeIste({
      url,
      messageId: mesaj.link_url ? mesaj.id : undefined,
    });
    if (!lp.ok) {
      // Minimal fallback — kart yine de hostname gösterir
      return { url, title: null, description: null, image_url: null, site_name: null };
    }
    return lp.preview;
  } finally {
    devamEden.delete(key);
  }
}
