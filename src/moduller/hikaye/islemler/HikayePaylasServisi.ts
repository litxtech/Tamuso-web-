import i18n from '../../../i18n';
import { OzellikBayragiAktifMiSunucu } from '../../ozellik-bayraklari/okuma/OzellikBayragiAktifMiSunucu';
import { HIKAYE_OZELLIK_BAYRAGI } from '../sabitler';
import type {
  HikayeIslemSonuc,
  HikayeOgesi,
  HikayeOverlay,
  HikayePaylasKaynak,
} from '../tipler';
import { HikayeOlustur } from './HikayeIslemleri';
import { HikayeAnalitik } from './HikayeAnalitik';

/**
 * Profil / gönderi / oda / canlı / ajans → hikaye paylaşımı.
 * Medya yoksa metin + overlay kartı; previewUrl varsa görsel hikaye.
 */
export async function HikayePaylasServisi(input: {
  kaynak: HikayePaylasKaynak;
  caption?: string | null;
  backgroundColor?: string | null;
}): Promise<HikayeIslemSonuc<HikayeOgesi>> {
  if (!(await OzellikBayragiAktifMiSunucu(HIKAYE_OZELLIK_BAYRAGI))) {
    return { ok: false, hata: i18n.t('hikaye.ozellikKapali') };
  }

  const { kaynak } = input;
  let overlays: HikayeOverlay[] = [];
  let mediaUrl: string | null = null;
  let caption = (input.caption ?? '').trim() || null;
  let mediaType: 'image' | 'text' = 'text';

  switch (kaynak.tur) {
    case 'status_post': {
      mediaUrl = kaynak.previewUrl ?? null;
      caption = caption ?? kaynak.caption ?? null;
      let meta: Record<string, unknown> = { status_id: kaynak.id };
      // Oyun kazancı / durum özeti — yer kaplamayan rozet için
      try {
        const { supabase } = await import('../../../lib/supabase');
        const { data } = await supabase
          .from('status_posts')
          .select('post_kind, payload, media_url, caption')
          .eq('id', kaynak.id)
          .maybeSingle();
        if (data) {
          meta = {
            ...meta,
            post_kind: data.post_kind,
            payload: data.payload,
          };
          if (!mediaUrl && typeof data.media_url === 'string') {
            mediaUrl = data.media_url;
          }
          if (!caption && typeof data.caption === 'string') {
            caption = data.caption;
          }
        }
      } catch {
        /* */
      }
      overlays = [
        {
          type: 'shared_post',
          ref_id: kaynak.id,
          meta,
        },
      ];
      break;
    }
    case 'profile':
      mediaUrl = kaynak.avatarUrl ?? null;
      overlays = [
        {
          type: 'shared_profile',
          ref_id: kaynak.userId,
          text: kaynak.displayName ?? undefined,
          meta: { user_id: kaynak.userId },
        },
      ];
      break;
    case 'room':
      mediaUrl = kaynak.coverUrl ?? null;
      overlays = [
        {
          type: 'shared_room',
          ref_id: kaynak.roomId,
          text: kaynak.title ?? undefined,
          meta: { room_id: kaynak.roomId },
        },
      ];
      break;
    case 'live':
      mediaUrl = kaynak.coverUrl ?? null;
      overlays = [
        {
          type: 'shared_live',
          ref_id: kaynak.sessionId,
          text: kaynak.title ?? undefined,
          meta: { session_id: kaynak.sessionId },
        },
      ];
      break;
    case 'agency':
      mediaUrl = kaynak.logoUrl ?? null;
      overlays = [
        {
          type: 'shared_agency',
          ref_id: kaynak.agencyId,
          text: kaynak.name ?? undefined,
          meta: { agency_id: kaynak.agencyId },
        },
      ];
      break;
  }

  if (mediaUrl && /^https?:\/\//i.test(mediaUrl)) {
    mediaType = 'image';
  } else {
    mediaUrl = null;
    mediaType = 'text';
    if (!caption) {
      caption = i18n.t('hikaye.paylasimVarsayilan');
    }
  }

  const sonuc = await HikayeOlustur({
    mediaType,
    mediaUrl,
    caption,
    backgroundColor: input.backgroundColor ?? '#1A0B14',
    overlays,
    attachment: overlays[0]
      ? {
          type: overlays[0].type,
          ref_id: overlays[0].ref_id,
          ...(overlays[0].meta ?? {}),
        }
      : null,
    visibility: 'public',
  });

  if (sonuc.ok) {
    HikayeAnalitik('story_share_to', { kind: kaynak.tur });
  }
  return sonuc;
}
