import { useCallback, useRef, useState } from 'react';
import i18n from '../../../i18n';
import { TakipAnalitik } from '../analytics/TakipAnalytics';
import { TakipCache } from '../onbellek/TakipCache';
import { TakipServisi } from '../islemler/TakipServisi';
import type { TakipDurumu, TakipIliskiDurumu, TakipIslemSonucu } from '../TakipTipleri';

function sonrakiDurum(
  onceki: TakipIliskiDurumu | undefined,
  code: TakipIslemSonucu['code'],
): TakipIliskiDurumu {
  if (code === 'requested' || code === 'already_requested') return 'REQUEST_PENDING';
  if (code === 'followed' || code === 'already_following') {
    if (onceki === 'FOLLOWS_YOU' || onceki === 'MUTUAL') return 'MUTUAL';
    return 'FOLLOWING';
  }
  if (code === 'unfollowed' || code === 'cancelled' || code === 'removed') {
    if (onceki === 'MUTUAL' || onceki === 'FOLLOWS_YOU') return 'FOLLOWS_YOU';
    return 'NOT_FOLLOWING';
  }
  return onceki ?? 'NOT_FOLLOWING';
}

export function useTakipMutasyonu(input: {
  targetUserId: string;
  viewerId?: string | null;
  durum: TakipDurumu | null;
  setDurum: (d: TakipDurumu | null | ((prev: TakipDurumu | null) => TakipDurumu | null)) => void;
}) {
  const kilit = useRef(false);
  const [isleniyor, setIsleniyor] = useState(false);

  const calistir = useCallback(
    async (
      islem: 'follow' | 'unfollow' | 'cancel',
    ): Promise<TakipIslemSonucu> => {
      if (kilit.current) {
        return { ok: false, code: 'rate_limited', hata: i18n.t('takip.hataRateLimited') };
      }
      kilit.current = true;
      setIsleniyor(true);
      const onceki = input.durum;
      const optimisticState =
        islem === 'follow'
          ? input.durum?.is_private
            ? 'REQUEST_PENDING'
            : input.durum?.state === 'FOLLOWS_YOU'
              ? 'MUTUAL'
              : 'FOLLOWING'
          : input.durum?.state === 'MUTUAL'
            ? 'FOLLOWS_YOU'
            : 'NOT_FOLLOWING';

      if (onceki) {
        input.setDurum({
          ...onceki,
          state: optimisticState as TakipIliskiDurumu,
          followers_count:
            islem === 'follow' && !onceki.is_private
              ? onceki.followers_count + 1
              : islem === 'unfollow' &&
                  (onceki.state === 'FOLLOWING' || onceki.state === 'MUTUAL')
                ? Math.max(0, onceki.followers_count - 1)
                : onceki.followers_count,
        });
      }
      if (islem === 'follow') TakipAnalitik('follow_clicked');

      try {
        const r =
          islem === 'follow'
            ? await TakipServisi.takipEt(input.targetUserId)
            : islem === 'cancel'
              ? await TakipServisi.istekIptal(input.targetUserId)
              : await TakipServisi.takiptenCik(input.targetUserId);

        if (!r.ok) {
          input.setDurum(onceki);
          if (r.code === 'network' || r.code === 'timeout') {
            const { TakipKuyrugaAl } = await import('../../cevrimdisi/SosyalKuyruk');
            await TakipKuyrugaAl({
              userId: input.viewerId,
              hedefId: input.targetUserId,
              following: islem === 'follow',
            });
          }
          TakipAnalitik('follow_failed');
          return r;
        }

        if (input.viewerId) {
          TakipServisi.cacheInvalidatePair(input.viewerId, input.targetUserId);
        } else {
          TakipCache.invalidatePair('me', input.targetUserId);
        }

        input.setDurum((prev) => {
          const base = prev ?? onceki;
          if (!base) return prev;
          return {
            ...base,
            state: r.state ?? sonrakiDurum(base.state, r.code),
            request_id: r.request_id ?? base.request_id,
            followers_count: r.followers_count ?? base.followers_count,
            following_count: r.following_count ?? base.following_count,
            posts_count: r.posts_count ?? base.posts_count,
            pending_follow_requests_count:
              r.pending_follow_requests_count ?? base.pending_follow_requests_count,
          };
        });

        if (r.code === 'followed' || r.code === 'already_following') {
          TakipAnalitik('follow_success');
        } else if (r.code === 'requested' || r.code === 'already_requested') {
          TakipAnalitik('follow_request_sent');
        } else if (r.code === 'unfollowed' || r.code === 'cancelled') {
          TakipAnalitik('unfollow');
        }
        return r;
      } catch {
        input.setDurum(onceki);
        TakipAnalitik('follow_failed');
        return { ok: false, code: 'network', hata: i18n.t('takip.hataNetwork') };
      } finally {
        kilit.current = false;
        setIsleniyor(false);
      }
    },
    [input],
  );

  return { calistir, isleniyor };
}

export function useTakipEt(opts: Parameters<typeof useTakipMutasyonu>[0]) {
  const m = useTakipMutasyonu(opts);
  return {
    takipEt: () => m.calistir('follow'),
    isleniyor: m.isleniyor,
  };
}

export function useTakiptenCik(opts: Parameters<typeof useTakipMutasyonu>[0]) {
  const m = useTakipMutasyonu(opts);
  return {
    takiptenCik: () => m.calistir('unfollow'),
    istekIptal: () => m.calistir('cancel'),
    isleniyor: m.isleniyor,
  };
}
