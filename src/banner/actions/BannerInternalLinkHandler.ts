import { router } from 'expo-router';
import type { BannerActionType } from '../core/BannerTypes';
import { OrtamDegiskenleri } from '../../yapilandirma/OrtamDegiskenleri';
import { isGameVisible } from '../../moduller/oyunlar/ortak/servisler/OyunKontrolServisi';
import { oyunKartKimligi } from '../../moduller/oyunlar/ortak/katalog/OyunKartKatalogu';
import type { GameCode } from '../../moduller/oyunlar/ortak/tipler/OyunTipleri';
import i18n from '../../i18n';
import { SesOdasinaGit } from '../../moduller/ses-odalari/navigasyon/SesOdasinaGit';

/**
 * Deep link standardı:
 * tamuso://profile/USER_ID
 * tamuso://room/ROOM_ID
 * tamuso://game/GAME_ID
 * tamuso://post/POST_ID
 * tamuso://live/LIVE_ID
 * (şema: muta veya EXPO_PUBLIC_APP_SCHEME)
 */
export function parseTamusoDeepLink(raw: string): {
  kind: string;
  id: string;
} | null {
  const scheme = OrtamDegiskenleri.uygulamaSemasi || 'muta';
  const normalized = raw
    .replace(/^tamuso:\/\//i, '')
    .replace(new RegExp(`^${scheme}:\\/\\/`, 'i'), '')
    .replace(/^\//, '');

  const [kind, id, ...rest] = normalized.split('/').filter(Boolean);
  if (!kind) return null;
  const fullId = rest.length ? [id, ...rest].join('/') : id;
  return { kind: kind.toLowerCase(), id: fullId ?? '' };
}

export function handleInternalLink(
  type: BannerActionType | 'CUSTOM_DEEP_LINK',
  target?: string | null,
): { ok: boolean; error?: string } {
  if (!target) return { ok: false, error: i18n.t('banner.hedefIdYok') };

  if (
    type === 'CUSTOM_DEEP_LINK' ||
    target.includes('://') ||
    target.startsWith('tamuso:') ||
    target.startsWith('muta:')
  ) {
    const parsed = parseTamusoDeepLink(target);
    if (!parsed) return { ok: false, error: i18n.t('banner.gecersizDeepLink') };
    return navigateByKind(parsed.kind, parsed.id);
  }

  switch (type) {
    case 'INTERNAL_PROFILE':
      return navigateByKind('profile', target);
    case 'INTERNAL_ROOM':
      return navigateByKind('room', target);
    case 'INTERNAL_GAME':
      return navigateByKind('game', target);
    case 'INTERNAL_POST':
      return navigateByKind('post', target);
    case 'INTERNAL_LIVE':
      return navigateByKind('live', target);
    default:
      return { ok: false, error: 'Desteklenmeyen internal tip' };
  }
}

function navigateByKind(kind: string, id: string): { ok: boolean; error?: string } {
  switch (kind) {
    case 'profile':
    case 'user':
    case 'kullanici':
      router.push(`/kullanici/${id}` as never);
      return { ok: true };
    case 'room':
    case 'oda':
      void SesOdasinaGit({ roomId: id });
      return { ok: true };
    case 'live':
    case 'canli':
      router.push(`/canli/${id}` as never);
      return { ok: true };
    case 'game':
    case 'oyun':
      // Kapalı oyun deep link'i uygulamada hiçbir yere götürmez
      void (async () => {
        const acik = await isGameVisible(id as GameCode);
        if (!acik) return;
        const kart = oyunKartKimligi(id as GameCode);
        if (kart?.href) {
          router.push(kart.href as never);
          return;
        }
        router.push({ pathname: '/platform', params: { gameId: id } } as never);
      })();
      return { ok: true };
    case 'post':
    case 'durum':
      router.push(`/durum/${id}` as never);
      return { ok: true };
    case 'lobi':
      router.push(`/lobi/${id}` as never);
      return { ok: true };
    default:
      return { ok: false, error: `Bilinmeyen deep link: ${kind}` };
  }
}
