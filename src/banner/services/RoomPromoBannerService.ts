import { supabase } from '../../lib/supabase';
import {
  AUTO_ROOM_PROMO_PLACEMENTS,
  BANNER_ROOM_CARD_ASPECT,
  BANNER_ROOM_CARD_TAG,
} from '../core/BannerConstants';
import type { BannerCampaign } from '../core/BannerTypes';
import {
  CoinSkoruFormatla,
  LiderlikSiralamasiniGetir,
  LiderlikSiralamasiniYenile,
  type SiralamaSatiri,
} from '../../moduller/liderlik-siralamalari/okuma/LiderlikSiralamasiniGetir';
import i18n from '../../i18n';

export type OdaPromoTur = 'games' | 'coins';

export type OdaPromoAday = {
  tur: OdaPromoTur;
  room_id: string;
  room_title: string | null;
  room_cover_url: string | null;
  room_is_live: boolean;
  score: number;
  rank: number;
};

const CACHE_TTL_MS = 90_000;
let cache: { at: number; items: OdaPromoAday[] } | null = null;

function nowIso(): string {
  return new Date().toISOString();
}

function syntheticId(tur: OdaPromoTur, roomId: string): string {
  // UUID olmayan id — tracking RPC’si başarısız olabilir; feed gösterimi için yeterli
  return `auto-room-${tur}-${roomId}`;
}

function odaAdi(aday: OdaPromoAday): string {
  return aday.room_title?.trim() || i18n.t('banner.promoSesOdasi');
}

function siralamadanAday(
  tur: OdaPromoTur,
  row: SiralamaSatiri,
  rank: number,
): OdaPromoAday | null {
  if (!row.room_id) return null;
  return {
    tur,
    room_id: row.room_id,
    room_title: row.room_title ?? row.display_name ?? null,
    room_cover_url: row.room_cover_url ?? row.avatar_url ?? null,
    room_is_live: Boolean(row.room_is_live),
    score: Number(row.score) || 0,
    rank,
  };
}

async function coinAdaylariniGetir(limit: number): Promise<OdaPromoAday[]> {
  let liste = await LiderlikSiralamasiniGetir({
    board: 'room',
    period: 'weekly',
    limit,
  });
  if (liste.length === 0) {
    await LiderlikSiralamasiniYenile('room', 'weekly');
    liste = await LiderlikSiralamasiniGetir({
      board: 'room',
      period: 'weekly',
      limit,
    });
  }
  return liste
    .map((row, i) => siralamadanAday('coins', row, i + 1))
    .filter((x): x is OdaPromoAday => !!x);
}

async function oyunAdaylariniGetir(limit: number): Promise<OdaPromoAday[]> {
  const { data, error } = await supabase.rpc('oda_oyun_promo_siralamasi', {
    p_limit: limit,
    p_days: 7,
  });

  if (!error && Array.isArray(data) && data.length > 0) {
    return (data as Array<Record<string, unknown>>).map((row, i) => ({
      tur: 'games' as const,
      room_id: String(row.room_id),
      room_title: (row.room_title as string | null) ?? null,
      room_cover_url: (row.room_cover_url as string | null) ?? null,
      room_is_live: Boolean(row.room_is_live),
      score: Number(row.score) || 0,
      rank: Number(row.rank) || i + 1,
    }));
  }

  // RPC yoksa / boşsa: canlı odalar (dinleyici yoğunluğu ile tanıtım)
  const { data: odalar } = await supabase
    .from('rooms')
    .select('id, title, cover_url, is_live, listener_count, total_coins_earned')
    .eq('is_live', true)
    .order('listener_count', { ascending: false })
    .limit(limit);

  return ((odalar as Array<Record<string, unknown>> | null) ?? []).map(
    (r, i) => ({
      tur: 'games' as const,
      room_id: String(r.id),
      room_title: (r.title as string | null) ?? null,
      room_cover_url: (r.cover_url as string | null) ?? null,
      room_is_live: true,
      score: Number(r.listener_count) || 0,
      rank: i + 1,
    }),
  );
}

/** Haftalık en çok oyun / en çok coin odalarını getirir (cache’li). */
export async function OdaPromoAdaylariniGetir(
  limit = 3,
): Promise<OdaPromoAday[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.items;
  }

  const [games, coins] = await Promise.all([
    oyunAdaylariniGetir(limit).catch(() => [] as OdaPromoAday[]),
    coinAdaylariniGetir(limit).catch(() => [] as OdaPromoAday[]),
  ]);

  const items = [...games, ...coins];
  cache = { at: Date.now(), items };
  return items;
}

export function OdaPromoBannerinaDonustur(
  aday: OdaPromoAday,
  placementKey: string,
): BannerCampaign {
  const ad = odaAdi(aday);
  const canli = aday.room_is_live;
  const oyunMu = aday.tur === 'games';
  const skorMetin = oyunMu
    ? i18n.t('banner.promoOyunSkor', { n: aday.score })
    : i18n.t('banner.promoCoinSkor', {
        skor: CoinSkoruFormatla(aday.score),
      });

  return {
    id: syntheticId(aday.tur, aday.room_id),
    name: `auto-${aday.tur}-${aday.room_id}`,
    internal_name: `auto_room_promo_${aday.tur}`,
    title: ad,
    subtitle: oyunMu
      ? i18n.t('banner.promoOyunAlt', { skor: skorMetin })
      : i18n.t('banner.promoCoinAlt', { skor: skorMetin }),
    description: null,
    badge: canli
      ? i18n.t('banner.promoCanli')
      : oyunMu
        ? i18n.t('banner.promoOyunBadge')
        : i18n.t('banner.promoTrend'),
    label: oyunMu
      ? i18n.t('banner.promoEnCokOyun')
      : i18n.t('banner.promoEnCokCoin'),
    media_type: aday.room_cover_url ? 'IMAGE_TEXT' : 'GRADIENT',
    media_url: aday.room_cover_url,
    thumbnail_url: aday.room_cover_url,
    media_alt: ad,
    gradient_json: {
      colors: oyunMu
        ? ['#1A0F2E', '#3D1F6E']
        : ['#1A1208', '#6B3A12'],
    },
    size_type: 'CUSTOM',
    aspect_ratio: BANNER_ROOM_CARD_ASPECT,
    priority: 900 + (oyunMu ? 20 : 10) - aday.rank,
    status: 'ACTIVE',
    start_at: null,
    end_at: null,
    daily_start_time: null,
    daily_end_time: null,
    dismissible: false,
    frequency_type: 'unlimited',
    max_daily_impressions: null,
    max_weekly_impressions: null,
    max_session_impressions: null,
    shimmer_enabled: false,
    autoplay_video: false,
    loop_video: false,
    carousel_auto_slide_ms: 5500,
    tags: [
      BANNER_ROOM_CARD_TAG,
      'PROMOTION',
      canli ? 'LIVE' : oyunMu ? 'GAME' : 'HOT',
    ],
    created_by: null,
    created_at: nowIso(),
    updated_at: nowIso(),
    placements: [
      {
        screen_key: placementKey.startsWith('HOME') ? 'HOME' : 'FEED',
        placement_key: placementKey,
        sort_order: 0,
      },
    ],
    targets: [
      {
        target_mode: 'ALL',
        platform: 'ALL',
        user_segment: 'ALL_USERS',
      },
    ],
    actions: [
      {
        slot: 0,
        action_type: 'INTERNAL_ROOM',
        button_text: canli
          ? i18n.t('banner.promoOdayaGir')
          : i18n.t('banner.promoOdayiAc'),
        target: aday.room_id,
      },
    ],
  };
}

/**
 * Placement’a göre otomatik oda tanıtım banner’ı üretir.
 * Admin kampanyalarının yanına eklenir; aynı oda iki slotta tekrarlanmaz.
 */
export async function OdaPromoBannerlariniUret(
  placement: string,
): Promise<BannerCampaign[]> {
  const odaKey = AUTO_ROOM_PROMO_PLACEMENTS.oda;
  const canliKey = AUTO_ROOM_PROMO_PLACEMENTS.canli;
  const oyunKey = AUTO_ROOM_PROMO_PLACEMENTS.oyun;

  if (
    placement !== odaKey &&
    placement !== canliKey &&
    placement !== oyunKey
  ) {
    return [];
  }

  const adaylar = await OdaPromoAdaylariniGetir(3);
  if (adaylar.length === 0) return [];

  const games = adaylar.filter((a) => a.tur === 'games');
  const coins = adaylar.filter((a) => a.tur === 'coins');
  const kullanilan = new Set<string>();

  const al = (liste: OdaPromoAday[]): OdaPromoAday | null => {
    for (const a of liste) {
      if (kullanilan.has(a.room_id)) continue;
      kullanilan.add(a.room_id);
      return a;
    }
    return null;
  };

  if (placement === odaKey) {
    const a = al(games) ?? al(coins);
    return a ? [OdaPromoBannerinaDonustur(a, placement)] : [];
  }

  if (placement === canliKey) {
    const a = al(coins) ?? al(games);
    return a ? [OdaPromoBannerinaDonustur(a, placement)] : [];
  }

  // HOME_BOTTOM (oyun): carousel — önce oyun lideri, sonra coin lideri
  const sonuc: BannerCampaign[] = [];
  const g = al(games);
  const c = al(coins);
  if (g) sonuc.push(OdaPromoBannerinaDonustur(g, placement));
  if (c) sonuc.push(OdaPromoBannerinaDonustur(c, placement));
  return sonuc;
}

export function OdaPromoOnbellegiTemizle(): void {
  cache = null;
}
