import type { BannerCampaign } from './BannerTypes';
import { isBannerEligible } from './BannerEligibilityEngine';
import type { BannerUserContext, BannerUserState } from './BannerTypes';
import { BANNER_ROOM_CARD_TAG } from './BannerConstants';

/** Placement bazlı filtre + priority sıralama */
export function filterBannersForPlacement(
  banners: BannerCampaign[],
  placementKey: string,
  ctx: BannerUserContext,
  userStates: Map<string, BannerUserState>,
): BannerCampaign[] {
  return banners
    .filter((b) => {
      // Boş placement = her yerde değil (ses odasına sızmasın)
      const placements = b.placements ?? [];
      if (placements.length === 0) return false;
      const hasPlacement = placements.some(
        (p) => p.placement_key === placementKey,
      );
      if (!hasPlacement) return false;
      return isBannerEligible(
        b,
        ctx,
        userStates.get(b.id),
        placementKey,
      ).eligible;
    })
    .sort((a, b) => b.priority - a.priority || a.created_at.localeCompare(b.created_at));
}

/** Feed içi "N. post sonrası" slotları — index 0-based post sırası */
export function resolveFeedInlinePlacement(
  postIndexZeroBased: number,
): string | null {
  const n = postIndexZeroBased + 1;
  if (n === 3) return 'FEED_AFTER_POST_3';
  if (n === 6) return 'FEED_AFTER_POST_6';
  if (n === 8) return 'FEED_AFTER_POST_8';
  if (n === 14) return 'FEED_AFTER_POST_14';
  return null;
}

export function extractAfterPostIndex(placementKey: string): number | null {
  const m = /^FEED_AFTER_POST_(\d+)$/.exec(placementKey);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Otomatik / manuel oda kartı boyutunda mı? */
export function bannerOdaKartMi(banner: BannerCampaign): boolean {
  if (banner.id.startsWith('auto-room-')) return true;
  if (banner.id.startsWith('promo-oda-')) return true;
  return (banner.tags ?? []).includes(BANNER_ROOM_CARD_TAG);
}
