/**
 * Remote özellik bayrağı + kill switch bellek cache.
 * Yerel defaults yalnızca ağ yokken fallback.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import type {
  KillSwitchAnahtari,
  OzellikBayragiAnahtari,
} from './OzellikBayragiAnahtarlari';
import {
  KillSwitchAnahtarlari,
  OzellikBayragiAnahtarlari,
} from './OzellikBayragiAnahtarlari';

const STORAGE_KEY = 'ozellik_bayrak_cache_v1';

export const YEREL_BAYRAKLAR: Record<OzellikBayragiAnahtari, boolean> = {
  voice_rooms_enabled: true,
  live_enabled: true,
  video_enabled: true,
  gifts_enabled: true,
  pk_enabled: true,
  agency_enabled: true,
  agency_verification_v2_enabled: false,
  agency_verification_financial_locks: false,
  agency_verification_sync_wallet_kyc: false,
  withdrawals_enabled: false,
  wallet_exchange_enabled: false,
  wallet_sell_enabled: false,
  wallet_withdraw_enabled: false,
  city_league_enabled: true,
  city_battles_enabled: true,
  city_elections_enabled: true,
  country_league_enabled: true,
  country_league_weekly_enabled: true,
  country_league_all_time_enabled: true,
  country_league_contributors_enabled: true,
  country_league_city_integration_enabled: true,
  country_league_badges_enabled: true,
  country_league_rank_notifications_enabled: false,
  messages_enabled: true,
  message_reply_enabled: true,
  message_edit_enabled: true,
  message_pin_enabled: true,
  voice_message_enabled: true,
  music_message_enabled: true,
  conversation_mute_enabled: true,
  view_once_enabled: true,
  offline_outbox_enabled: true,
  link_preview_enabled: true,
  events_enabled: true,
  missions_enabled: true,
  announcements_enabled: true,
  auto_promo_banners_enabled: true,
  auto_event_banners_enabled: true,
  policies_enabled: true,
  moderation_enabled: true,
  analytics_enabled: true,
  certification_hub_enabled: true,
  low_end_mode_enabled: false,
  graceful_degradation_enabled: true,
  stress_tools_enabled: true,
  iap_enabled: true,
  stripe_enabled: false,
  games_enabled: true,
  fruit_wheel_enabled: true,
  kozmik_kaskad_enabled: true,
  zeus_enabled: true,
  nox_reels_enabled: true,
  stories_enabled: false,
  story_creation_enabled: false,
  story_video_enabled: false,
  story_links_enabled: false,
  story_gifts_enabled: false,
  story_discovery_enabled: false,
  story_official_promotions_enabled: false,
  voice_room_music_enabled: true,
  music_ducking_enabled: true,
  music_playlists_enabled: true,
  music_favorites_enabled: true,
  ai_music_enabled: true,
  ai_music_reference_enabled: true,
  ai_music_status_share_enabled: true,
  ai_music_voice_room_enabled: true,
  ai_music_export_enabled: true,
  ai_assistant_enabled: true,
  live_chat_translation_enabled: true,
  transaction_volume_enabled: true,
  transaction_volume_profile_enabled: true,
  transaction_volume_tiers_enabled: true,
  transaction_volume_leaderboard_enabled: true,
  transaction_volume_effects_enabled: true,
  people_discovery_enabled: true,
  people_personalized_enabled: true,
  people_gender_filter_enabled: true,
  people_country_filter_enabled: true,
  people_online_filter_enabled: true,
  people_price_filter_enabled: true,
  people_message_enabled: true,
  people_voice_call_enabled: true,
  people_video_call_enabled: true,
  people_paid_calling_enabled: true,
  people_show_prices_enabled: true,
  people_show_country_flags: true,
  people_show_online_indicators: true,
  user_titles_enabled: true,
  title_animations_enabled: true,
  studio_enabled: false,
  studio_menu_visible: false,
  new_game_creation_enabled: false,
  game_testing_enabled: false,
  game_submission_enabled: false,
  game_publishing_enabled: false,
  ai_generation_enabled: false,
  meshy_enabled: false,
  elevenlabs_enabled: false,
  playcanvas_enabled: false,
  creator_rewards_enabled: false,
  ios_dynamic_island_enabled: true,
  live_activity_enabled: true,
  callkit_enabled: true,
  voice_room_live_activity_enabled: true,
  live_stream_activity_enabled: true,
  upload_activity_enabled: true,
  ai_music_activity_enabled: true,
  tournament_activity_enabled: false,
};

export const YEREL_KILL: Record<KillSwitchAnahtari, boolean> = {
  kill_coin_purchase: false,
  kill_gift_send: false,
  kill_withdrawal: false,
  kill_agency_coin_transfer: false,
  kill_live: false,
  kill_pk: false,
  kill_moderation: false,
  kill_heavy_animations: false,
  kill_livekit_reconnect: false,
  kill_games: false,
  kill_game_coin: false,
  kill_ai_music_generation: false,
  kill_ai_assistant: false,
  kill_live_chat_translation: false,
  kill_transaction_volume_display: false,
  kill_country_league_display: false,
  kill_people_discovery: false,
  kill_people_paid_calls: false,
  kill_offline_outbox: false,
  kill_stories: false,
};

type Snapshot = {
  flags: Partial<Record<string, boolean>>;
  kills: Partial<Record<string, boolean>>;
  updatedAt: string | null;
  remote: boolean;
};

type Listener = () => void;

let snapshot: Snapshot = {
  flags: { ...YEREL_BAYRAKLAR },
  kills: { ...YEREL_KILL },
  updatedAt: null,
  remote: false,
};

const listeners = new Set<Listener>();
let yukleniyor = false;
let realtimeKurulu = false;

function bildir() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      /* ignore */
    }
  });
}

export function OzellikBayrakCacheAbone(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function OzellikBayrakCacheSurum(): string {
  return `${snapshot.remote ? 'r' : 'l'}:${snapshot.updatedAt ?? '0'}:${Object.keys(snapshot.flags).length}`;
}

export function CacheBayrakOku(anahtar: OzellikBayragiAnahtari): boolean {
  if (Object.prototype.hasOwnProperty.call(snapshot.flags, anahtar)) {
    return !!snapshot.flags[anahtar];
  }
  return YEREL_BAYRAKLAR[anahtar] ?? false;
}

export function CacheKillOku(anahtar: KillSwitchAnahtari): boolean {
  if (Object.prototype.hasOwnProperty.call(snapshot.kills, anahtar)) {
    return !!snapshot.kills[anahtar];
  }
  return YEREL_KILL[anahtar] ?? false;
}

function uygula(
  flags: Partial<Record<string, boolean>>,
  kills: Partial<Record<string, boolean>>,
  remote: boolean,
) {
  snapshot = {
    flags: { ...YEREL_BAYRAKLAR, ...flags },
    kills: { ...YEREL_KILL, ...kills },
    updatedAt: new Date().toISOString(),
    remote,
  };
  bildir();
  void AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      flags: snapshot.flags,
      kills: snapshot.kills,
      updatedAt: snapshot.updatedAt,
    }),
  ).catch(() => undefined);
}

export async function OzellikBayrakCacheDisktenYukle(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      flags?: Partial<Record<string, boolean>>;
      kills?: Partial<Record<string, boolean>>;
    };
    if (parsed.flags || parsed.kills) {
      uygula(parsed.flags ?? {}, parsed.kills ?? {}, false);
    }
  } catch {
    /* ignore */
  }
}

export async function OzellikBayraklariniYukle(): Promise<void> {
  if (yukleniyor) return;
  yukleniyor = true;
  try {
    const { data, error } = await supabase.rpc('ozellik_bayraklari_snapshot');
    if (error) throw error;
    const row = (data ?? {}) as {
      flags?: Record<string, boolean>;
      kills?: Record<string, boolean>;
    };
    uygula(row.flags ?? {}, row.kills ?? {}, true);
  } catch {
    /* yerel / disk kalır */
  } finally {
    yukleniyor = false;
  }
}

/** Tek bayrak admin toggle sonrası anında local yansıt */
export function OzellikBayrakCacheOptimistic(
  anahtar: string,
  enabled: boolean,
  tur: 'flag' | 'kill' = 'flag',
) {
  if (tur === 'kill') {
    uygula(snapshot.flags, { ...snapshot.kills, [anahtar]: enabled }, snapshot.remote);
  } else {
    uygula({ ...snapshot.flags, [anahtar]: enabled }, snapshot.kills, snapshot.remote);
  }
}

export function OzellikBayrakRealtimeKur(): () => void {
  if (realtimeKurulu) return () => undefined;
  realtimeKurulu = true;

  const kanal = supabase
    .channel('ozellik-bayrak-live')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'feature_flags' },
      () => {
        void OzellikBayraklariniYukle();
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'kill_switches' },
      () => {
        void OzellikBayraklariniYukle();
      },
    )
    .subscribe();

  return () => {
    realtimeKurulu = false;
    void supabase.removeChannel(kanal);
  };
}

/** Bilinen anahtar listeleri — seed/debug */
export function BilinenBayrakAnahtarlari(): readonly OzellikBayragiAnahtari[] {
  return OzellikBayragiAnahtarlari;
}

export function BilinenKillAnahtarlari(): readonly KillSwitchAnahtari[] {
  return KillSwitchAnahtarlari;
}
