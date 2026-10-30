import { supabase } from '../../lib/supabase';
import { OrtamDegiskenleri } from '../../yapilandirma/OrtamDegiskenleri';
import {
  DepoyaMedyaYukle,
  MedyaUzantisiCoz,
} from '../../ortak/medya/DepoyaMedyaYukle';
import { DurumOlustur } from '../durum/islemler/DurumIslemleri';
import { TaslakSil, TaslaklariGetir } from './TaslakDeposu';

function yerelMi(u: string): boolean {
  return /^(file|content|ph|assets-library):/i.test(u);
}

function httpsMi(u: string | null | undefined): u is string {
  return typeof u === 'string' && /^https?:\/\//i.test(u);
}

/** Otomatik paylaşım kapalı kalır. Yalnızca kullanıcının bastığı taslak gider. */
export async function TaslakSimdiPaylas(
  userId: string,
  id: string,
): Promise<{ ok: boolean; hata?: string }> {
  const taslak = (await TaslaklariGetir(userId)).find((t) => t.id === id);
  if (!taslak || taslak.type !== 'post') return { ok: false, hata: 'taslak' };

  let mediaType: 'image' | 'video' | 'text' = 'text';
  let mediaUrl: string | null = null;
  const video = taslak.video;
  const gorsel = taslak.images[0] ?? null;
  const yerelVideo = video && yerelMi(video) ? video : null;
  const yerelGorsel = gorsel && yerelMi(gorsel) ? gorsel : null;
  const yerel = yerelVideo || yerelGorsel;

  if (yerel) {
    mediaType = yerelVideo ? 'video' : 'image';
    const ext = MedyaUzantisiCoz(yerel, null, mediaType === 'video' ? 'mp4' : 'jpg');
    const path = `${userId}/${Date.now()}-taslak.${ext}`;
    const up = await DepoyaMedyaYukle(supabase, {
      bucket: 'status-media',
      path,
      uri: yerel,
      tur: mediaType,
    });
    if (!up.ok) return { ok: false, hata: up.hata };
    const { data: pub } = supabase.storage.from('status-media').getPublicUrl(up.path);
    const base = OrtamDegiskenleri.supabaseUrl?.replace(/\/$/, '');
    mediaUrl =
      pub?.publicUrl || `${base}/storage/v1/object/public/status-media/${up.path}`;
  } else if (httpsMi(video) || httpsMi(gorsel)) {
    mediaType = httpsMi(video) ? 'video' : 'image';
    mediaUrl = httpsMi(video) ? video : gorsel;
  }

  const r = await DurumOlustur({
    mediaType,
    mediaUrl,
    caption: taslak.text,
  });
  if (!r.ok) return { ok: false, hata: r.hata };
  await TaslakSil(userId, id);
  return { ok: true };
}
