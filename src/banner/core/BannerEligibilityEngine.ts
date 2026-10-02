import type {
  BannerCampaign,
  BannerEligibilityResult,
  BannerUserContext,
  BannerUserState,
} from './BannerTypes';
import { UlkeKodunaNormalizeEt, UlkeMetniniKatla } from '../../ortak/ulke/UlkeKodunaNormalizeEt';

function parseTimeToMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const part = t.slice(0, 8);
  const [h, m, s] = part.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m + (Number.isFinite(s) ? s / 60 : 0);
}

function inDailyWindow(
  start: string | null | undefined,
  end: string | null | undefined,
  now: Date,
): boolean {
  const s = parseTimeToMinutes(start);
  const e = parseTimeToMinutes(end);
  if (s == null && e == null) return true;
  const cur = now.getHours() * 60 + now.getMinutes();
  if (s != null && e != null) {
    if (s <= e) return cur >= s && cur <= e;
    return cur >= s || cur <= e;
  }
  if (s != null) return cur >= s;
  if (e != null) return cur <= e;
  return true;
}

function matchesLocation(
  banner: BannerCampaign,
  ctx: BannerUserContext,
): boolean {
  const targets = banner.targets ?? [];
  if (targets.length === 0) return true;

  return targets.some((t) => {
    if (t.target_mode === 'ALL') return true;
    if (t.target_mode === 'COUNTRY') {
      const targetCode =
        UlkeKodunaNormalizeEt(t.country_code) ??
        UlkeKodunaNormalizeEt(t.country);
      const userCode =
        UlkeKodunaNormalizeEt(ctx.countryCode) ??
        UlkeKodunaNormalizeEt(ctx.country);
      if (!targetCode && !t.country && !t.country_code) return true;
      if (targetCode && userCode) return targetCode === userCode;
      // Kod çözülemezse katlanmış görünen ad ile gevşek eşle (eski veri)
      const code = UlkeMetniniKatla(t.country_code ?? t.country ?? '');
      const user = UlkeMetniniKatla(ctx.countryCode ?? ctx.country ?? '');
      if (!code) return true;
      return !!user && (user === code || user.includes(code) || code.includes(user));
    }
    if (t.target_mode === 'REGION') {
      if (!t.region_id && !t.region) return true;
      if (t.region_id && ctx.regionId) return t.region_id === ctx.regionId;
      if (t.region && ctx.regionId) return t.region === ctx.regionId;
      return false;
    }
    if (t.target_mode === 'CITY' || t.target_mode === 'CUSTOM') {
      if (!t.city) return true;
      const city = (ctx.city ?? '').toLowerCase();
      return !!city && city === t.city.toLowerCase();
    }
    return true;
  });
}

function matchesPlatform(
  banner: BannerCampaign,
  ctx: BannerUserContext,
): boolean {
  const targets = banner.targets ?? [];
  if (targets.length === 0) return true;
  return targets.some(
    (t) => t.platform === 'ALL' || t.platform === ctx.platform,
  );
}

function matchesLanguage(
  banner: BannerCampaign,
  ctx: BannerUserContext,
): boolean {
  const targets = banner.targets ?? [];
  const withLang = targets.filter((t) => !!t.language);
  if (withLang.length === 0) return true;
  return withLang.some(
    (t) =>
      (t.language ?? '').toLowerCase() === (ctx.language ?? '').toLowerCase(),
  );
}

function matchesSegment(
  banner: BannerCampaign,
  ctx: BannerUserContext,
): boolean {
  const targets = banner.targets ?? [];
  if (targets.length === 0) return true;

  return targets.some((t) => {
    switch (t.user_segment) {
      case 'ALL_USERS':
        return true;
      case 'GUEST':
        return ctx.isGuest;
      case 'REGISTERED':
        return !ctx.isGuest;
      case 'NEW_USER':
        return ctx.accountAgeDays <= 7;
      case 'ACTIVE_USER':
        return !ctx.isGuest && ctx.accountAgeDays > 7;
      case 'VIP':
        return !!ctx.isVip;
      case 'CREATOR':
        return !!ctx.isCreator || ctx.isHost;
      case 'ROOM_HOST':
        return ctx.isHost;
      case 'CUSTOM_SEGMENT':
        return true;
      default:
        return true;
    }
  });
}

function matchesLevel(
  banner: BannerCampaign,
  ctx: BannerUserContext,
): boolean {
  const targets = banner.targets ?? [];
  if (targets.length === 0) return true;
  return targets.some((t) => {
    if (t.min_level != null && ctx.level < t.min_level) return false;
    if (t.max_level != null && ctx.level > t.max_level) return false;
    if (
      t.min_account_age_days != null &&
      ctx.accountAgeDays < t.min_account_age_days
    ) {
      return false;
    }
    if (
      t.max_account_age_days != null &&
      ctx.accountAgeDays > t.max_account_age_days
    ) {
      return false;
    }
    return true;
  });
}

function frequencyOk(
  banner: BannerCampaign,
  state: BannerUserState | undefined,
  sessionId: string,
): boolean {
  if (banner.frequency_type === 'unlimited') return true;
  if (!state) return true;

  const sameSession = state.last_session_id === sessionId;

  switch (banner.frequency_type) {
    case '1_per_session':
      return !(sameSession && state.session_impressions >= 1);
    case '1_per_day':
      return state.impression_count_today < 1;
    case '3_per_day':
      return state.impression_count_today < 3;
    case '5_per_week':
      return state.impression_count_week < 5;
    case 'custom': {
      if (
        banner.max_session_impressions != null &&
        sameSession &&
        state.session_impressions >= banner.max_session_impressions
      ) {
        return false;
      }
      if (
        banner.max_daily_impressions != null &&
        state.impression_count_today >= banner.max_daily_impressions
      ) {
        return false;
      }
      if (
        banner.max_weekly_impressions != null &&
        state.impression_count_week >= banner.max_weekly_impressions
      ) {
        return false;
      }
      return true;
    }
    default:
      return true;
  }
}

/**
 * Tek eligibility kapısı — render öncesi tüm kurallar.
 */
export function isBannerEligible(
  banner: BannerCampaign,
  ctx: BannerUserContext,
  userState?: BannerUserState,
  placementKey?: string,
): BannerEligibilityResult {
  const reasons: string[] = [];
  const now = ctx.now ?? new Date();

  if (banner.status !== 'ACTIVE') {
    reasons.push(`status:${banner.status}`);
  }

  if (banner.start_at && new Date(banner.start_at) > now) {
    reasons.push('before_start');
  }
  if (banner.end_at && new Date(banner.end_at) < now) {
    reasons.push('after_end');
  }

  if (!inDailyWindow(banner.daily_start_time, banner.daily_end_time, now)) {
    reasons.push('outside_daily_window');
  }

  if (placementKey) {
    const placements = banner.placements ?? [];
    // Boş placement artık “her yer” değil — eşleşme zorunlu
    const ok = placements.some((p) => p.placement_key === placementKey);
    if (!ok) {
      reasons.push('placement_mismatch');
    }
  }

  if (!matchesPlatform(banner, ctx)) reasons.push('platform');
  if (!matchesLanguage(banner, ctx)) reasons.push('language');
  if (!matchesLocation(banner, ctx)) reasons.push('location');
  if (!matchesSegment(banner, ctx)) reasons.push('segment');
  if (!matchesLevel(banner, ctx)) reasons.push('level');

  if (userState?.dismissed_at) reasons.push('dismissed');
  if (!frequencyOk(banner, userState, ctx.sessionId)) {
    reasons.push('frequency_cap');
  }

  return { eligible: reasons.length === 0, reasons };
}
