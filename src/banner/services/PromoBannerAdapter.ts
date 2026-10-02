/**
 * Otomatik tanıtım bannerları — admin kampanyası yazmadan
 * en popüler ses odası / canlı yayın / coin harcanan oyunu tanıtır.
 */

import { supabase } from '../../lib/supabase';
import { OYUN_KART_KATALOGU } from '../../moduller/oyunlar/ortak/katalog/OyunKartKatalogu';
import type { BannerCampaign } from '../core/BannerTypes';
import {
  AUTO_ROOM_PROMO_PLACEMENTS,
  BANNER_ROOM_CARD_ASPECT,
  BANNER_ROOM_CARD_TAG,
} from '../core/BannerConstants';
import { RenkTokenlari } from '../../tasarim-sistemi/RenkTokenlari';

const PROMO_PLACEMENTS = [
  { screen_key: 'FEED', placement_key: AUTO_ROOM_PROMO_PLACEMENTS.oda, sort_order: 0 },
  { screen_key: 'FEED', placement_key: AUTO_ROOM_PROMO_PLACEMENTS.canli, sort_order: 0 },
  { screen_key: 'HOME', placement_key: AUTO_ROOM_PROMO_PLACEMENTS.oyun, sort_order: 5 },
] as const;

function basePromo(partial: Partial<BannerCampaign> & Pick<BannerCampaign, 'id' | 'name'>): BannerCampaign {
  const now = new Date().toISOString();
  return {
    title: null,
    internal_name: partial.name,
    subtitle: null,
    description: null,
    badge: null,
    label: null,
    media_type: 'GRADIENT',
    media_url: null,
    thumbnail_url: null,
    media_alt: null,
    gradient_json: {
      colors: [RenkTokenlari.deepPlum, RenkTokenlari.primary],
    },
    size_type: 'SMALL',
    aspect_ratio: '4:1',
    priority: 40,
    status: 'ACTIVE',
    start_at: null,
    end_at: null,
    daily_start_time: null,
    daily_end_time: null,
    dismissible: true,
    frequency_type: '3_per_day',
    max_daily_impressions: 3,
    max_weekly_impressions: null,
    max_session_impressions: 1,
    shimmer_enabled: false,
    autoplay_video: false,
    loop_video: false,
    carousel_auto_slide_ms: 3000,
    tags: [],
    created_by: null,
    created_at: now,
    updated_at: now,
    placements: PROMO_PLACEMENTS.map((p) => ({ ...p })),
    targets: [],
    actions: [],
    ...partial,
  };
}

function httpsMedyaMi(url: string | null | undefined): string | null {
  const u = (url ?? '').trim();
  if (!u.startsWith('https://')) return null;
  try {
    const parsed = new URL(u);
    return parsed.hostname ? parsed.toString() : null;
  } catch {
    return null;
  }
}

async function enPopulerOdaBanner(): Promise<BannerCampaign | null> {
  const { data } = await supabase
    .from('rooms')
    .select('id, title, cover_url, listener_count, total_coins_earned, host:profiles!rooms_host_id_fkey(display_name, avatar_url)')
    .eq('is_live', true)
    .order('listener_count', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.id) return null;
  const hostRaw = data.host as
    | { display_name?: string | null; avatar_url?: string | null }
    | { display_name?: string | null; avatar_url?: string | null }[]
    | null;
  const host = Array.isArray(hostRaw) ? hostRaw[0] : hostRaw;
  const medya = httpsMedyaMi(data.cover_url) ?? httpsMedyaMi(host?.avatar_url);

  return basePromo({
    id: `promo-oda-${data.id}`,
    name: 'auto_oda',
    title: data.title?.trim() || null,
    subtitle: null,
    badge: 'LIVE',
    tags: [BANNER_ROOM_CARD_TAG, 'LIVE', 'PROMOTION'],
    media_type: medya ? 'IMAGE_TEXT' : 'GRADIENT',
    media_url: medya,
    size_type: 'CUSTOM',
    aspect_ratio: BANNER_ROOM_CARD_ASPECT,
    gradient_json: { colors: ['#0F3A36', '#3DCFB0'] },
    priority: 55,
    carousel_auto_slide_ms: 3000,
    actions: [
      {
        slot: 0,
        action_type: 'INTERNAL_ROOM',
        button_text: null,
        target: data.id,
      },
    ],
  });
}

async function enPopulerCanliBanner(): Promise<BannerCampaign | null> {
  const { data } = await supabase
    .from('live_sessions')
    .select(
      'id, title, viewer_count, total_coins_earned, host:profiles!live_sessions_host_id_fkey(display_name, avatar_url)',
    )
    .eq('is_live', true)
    .order('viewer_count', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.id) return null;
  const hostRaw = data.host as
    | { display_name?: string | null; avatar_url?: string | null }
    | { display_name?: string | null; avatar_url?: string | null }[]
    | null;
  const host = Array.isArray(hostRaw) ? hostRaw[0] : hostRaw;
  const medya = httpsMedyaMi(host?.avatar_url);

  return basePromo({
    id: `promo-canli-${data.id}`,
    name: 'auto_canli',
    title: null,
    subtitle: null,
    badge: null,
    tags: [],
    media_type: medya ? 'IMAGE' : 'GRADIENT',
    media_url: medya,
    gradient_json: { colors: ['#3A1A38', '#E84091'] },
    priority: 52,
    carousel_auto_slide_ms: 3000,
    actions: [
      {
        slot: 0,
        action_type: 'INTERNAL_LIVE',
        button_text: null,
        target: data.id,
      },
    ],
  });
}

async function enCokCoinOyunBanner(): Promise<BannerCampaign | null> {
  // Son 7 günde oturum sayısı / entry coin — en aktif oyun
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('game_sessions')
    .select('game_code, entry_amount')
    .gte('created_at', since)
    .limit(200);

  const skor = new Map<string, number>();
  for (const row of data ?? []) {
    const kod = String((row as { game_code?: string }).game_code ?? '');
    if (!kod) continue;
    const entry = Number((row as { entry_amount?: number }).entry_amount ?? 0);
    skor.set(kod, (skor.get(kod) ?? 0) + 1 + entry / 10);
  }

  let enIyi: string | null = null;
  let enSkor = 0;
  for (const [kod, s] of skor) {
    if (s > enSkor) {
      enSkor = s;
      enIyi = kod;
    }
  }

  // Veri yoksa katalogdan Zeus / Kaskad sırayla
  const kod =
    enIyi && (enIyi === 'zeus' || enIyi === 'kozmik_kaskad')
      ? enIyi
      : skor.has('zeus')
        ? 'zeus'
        : skor.has('kozmik_kaskad')
          ? 'kozmik_kaskad'
          : 'zeus';

  const kart = OYUN_KART_KATALOGU[kod as 'zeus' | 'kozmik_kaskad'];
  if (!kart) return null;

  // Yerel asset URI webview/https kontrolüne takılmasın — degrade kullan
  return basePromo({
    id: `promo-oyun-${kod}`,
    name: 'auto_oyun',
    title: null,
    subtitle: null,
    badge: null,
    tags: [],
    media_type: 'GRADIENT',
    media_url: null,
    gradient_json: { colors: [...kart.cta] },
    priority: 48,
    carousel_auto_slide_ms: 3000,
    actions: [
      {
        slot: 0,
        action_type: 'INTERNAL_GAME',
        button_text: null,
        target: kart.kod,
      },
    ],
  });
}

let cache: { at: number; banners: BannerCampaign[] } | null = null;
const CACHE_MS = 45_000;

/** Placement için otomatik promo listesi (cache’li) */
export async function OtomatikPromoBannerlariGetir(): Promise<BannerCampaign[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.banners;

  const [oda, canli, oyun] = await Promise.all([
    enPopulerOdaBanner().catch(() => null),
    enPopulerCanliBanner().catch(() => null),
    enCokCoinOyunBanner().catch(() => null),
  ]);

  const banners = [oda, canli, oyun].filter(Boolean) as BannerCampaign[];
  cache = { at: Date.now(), banners };
  return banners;
}

export function OtomatikPromoCacheTemizle(): void {
  cache = null;
}
