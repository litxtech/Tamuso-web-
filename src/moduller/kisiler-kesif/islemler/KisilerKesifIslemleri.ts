import i18n from '../../../i18n';
import { supabase } from '../../../lib/supabase';
import type {
  KisilerAramaOnizleme,
  KisilerAyarlari,
  KisilerConfig,
  KisilerEffectiveFeatures,
  KisilerKesifFiltre,
  KisilerKesifKarti,
} from '../tipler';

const EMPTY_FEATURES: KisilerEffectiveFeatures = {
  people_discovery_enabled: false,
  personalized_enabled: false,
  gender_filter_enabled: false,
  country_filter_enabled: false,
  online_filter_enabled: false,
  price_filter_enabled: false,
  message_enabled: false,
  voice_call_enabled: false,
  video_call_enabled: false,
  paid_calling_enabled: false,
  show_prices: false,
  show_country_flags: false,
  show_online_indicators: false,
};

/** Tek merkezi effective feature resolver — UI dağınık boolean yazmasın */
export function kisilerEffectiveCoz(
  raw: Partial<KisilerEffectiveFeatures> | null | undefined,
): KisilerEffectiveFeatures {
  const master = !!raw?.people_discovery_enabled;
  if (!master) return { ...EMPTY_FEATURES };
  return {
    people_discovery_enabled: true,
    personalized_enabled: !!raw?.personalized_enabled,
    gender_filter_enabled: !!raw?.gender_filter_enabled,
    country_filter_enabled: !!raw?.country_filter_enabled,
    online_filter_enabled: !!raw?.online_filter_enabled,
    price_filter_enabled: !!raw?.price_filter_enabled,
    message_enabled: !!raw?.message_enabled,
    voice_call_enabled: !!raw?.voice_call_enabled,
    video_call_enabled: !!raw?.video_call_enabled,
    paid_calling_enabled: !!raw?.paid_calling_enabled,
    show_prices: !!raw?.show_prices,
    show_country_flags: !!raw?.show_country_flags,
    show_online_indicators: !!raw?.show_online_indicators,
  };
}

export async function KisilerConfigGetir(): Promise<KisilerConfig> {
  const { data, error } = await supabase.rpc('kisiler_config_getir');
  if (error) throw error;
  const raw = (data ?? {}) as Partial<KisilerConfig>;
  return {
    ...kisilerEffectiveCoz(raw),
    algorithm_version: raw.algorithm_version ?? 'v1',
    voice_price_min: Number(raw.voice_price_min ?? 25),
    voice_price_max: Number(raw.voice_price_max ?? 70),
    video_price_min: Number(raw.video_price_min ?? 25),
    video_price_max: Number(raw.video_price_max ?? 70),
    platform_call_fee: Number(raw.platform_call_fee ?? 0.2),
    billing_mode: (raw.billing_mode as KisilerConfig['billing_mode']) ?? 'per_second_ceil',
    free_call_seconds_grant: Number(raw.free_call_seconds_grant ?? 300),
    ring_timeout_sec: raw.ring_timeout_sec,
    online_window_sec: raw.online_window_sec,
    page_size: raw.page_size,
    weights: raw.weights,
    updated_at: raw.updated_at ?? null,
  };
}

export async function KisilerKesifGetir(
  filtre: KisilerKesifFiltre,
  cursor?: number | null,
  limit = 20,
): Promise<{
  ok: boolean;
  error?: string;
  message?: string;
  items: KisilerKesifKarti[];
  next_cursor: number | null;
  features: KisilerEffectiveFeatures;
  algorithm_version?: string;
}> {
  const { data, error } = await supabase.rpc('kisiler_kesif_getir', {
    p_tab: filtre.tab,
    p_gender: null,
    p_country_code: filtre.countryCode ?? null,
    p_online_only: !!filtre.onlineOnly,
    p_price_min: filtre.priceMin ?? null,
    p_price_max: filtre.priceMax ?? null,
    p_price_kind: filtre.priceKind ?? 'voice',
    p_query: filtre.query?.trim() || null,
    p_cursor: cursor ?? null,
    p_limit: limit,
  });

  if (error) {
    return {
      ok: false,
      error: error.message,
      message: i18n.t('kisilerX.yuklenemediBody'),
      items: [],
      next_cursor: null,
      features: EMPTY_FEATURES,
    };
  }

  const raw = (data ?? {}) as Record<string, unknown>;
  const features = kisilerEffectiveCoz(
    (raw.features as Partial<KisilerEffectiveFeatures>) ?? raw,
  );

  return {
    ok: raw.ok !== false,
    error: typeof raw.error === 'string' ? raw.error : undefined,
    message: typeof raw.message === 'string' ? raw.message : undefined,
    items: Array.isArray(raw.items) ? (raw.items as KisilerKesifKarti[]) : [],
    next_cursor:
      raw.next_cursor == null || raw.next_cursor === undefined
        ? null
        : Number(raw.next_cursor),
    features,
    algorithm_version:
      typeof raw.algorithm_version === 'string' ? raw.algorithm_version : undefined,
  };
}

export async function KisilerAyarlariGetir(): Promise<KisilerAyarlari> {
  const { data, error } = await supabase.rpc('kisiler_ayarlari_getir');
  if (error) throw error;
  return data as KisilerAyarlari;
}

export async function KisilerAyarlariGuncelle(
  patch: Partial<{
    discoverable: boolean;
    discovery_preference: string;
    show_country: boolean;
    show_online_status: boolean;
    calls_open: boolean;
    voice_calls_enabled: boolean;
    video_calls_enabled: boolean;
    call_permission: string;
    voice_price_per_minute: number;
    video_price_per_minute: number;
  }>,
): Promise<{ ok: true; ayar: KisilerAyarlari } | { ok: false; hata: string }> {
  const { data, error } = await supabase.rpc('kisiler_ayarlari_guncelle', {
    p: patch,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true, ayar: data as KisilerAyarlari };
}

function rpcGovde(data: unknown): Record<string, unknown> {
  if (typeof data === 'string') {
    try {
      const ayrik = JSON.parse(data) as unknown;
      if (ayrik && typeof ayrik === 'object') return ayrik as Record<string, unknown>;
    } catch {
      return {};
    }
    return {};
  }
  if (data && typeof data === 'object') return data as Record<string, unknown>;
  return {};
}

function sayiAlani(deger: unknown): number | undefined {
  if (deger == null || deger === '') return undefined;
  const n = Number(deger);
  return Number.isFinite(n) ? n : undefined;
}

export async function KisilerAramaOnizlemeGetir(
  calleeId: string,
  callType: 'audio' | 'video',
): Promise<KisilerAramaOnizleme> {
  await supabase.auth.getSession();
  const { data, error } = await supabase.rpc('kisiler_arama_onizleme', {
    p_callee_id: calleeId,
    p_call_type: callType,
  });
  if (error) {
    return {
      ok: false,
      error: error.message,
      message: error.message,
      can_start: false,
    };
  }
  const raw = rpcGovde(data);
  return {
    ...(raw as KisilerAramaOnizleme),
    ok: raw.ok !== false,
    caller_balance: sayiAlani(raw.caller_balance),
    price_per_minute: sayiAlani(raw.price_per_minute),
    free_seconds_remaining: sayiAlani(raw.free_seconds_remaining),
    can_start: raw.can_start === true,
  };
}

export async function KisilerAramaKapaliBildir(
  calleeId: string,
  callType: 'audio' | 'video',
): Promise<void> {
  try {
    await supabase.rpc('kisiler_arama_kapali_bildir', {
      p_callee_id: calleeId,
      p_call_type: callType,
    });
    const { PushWorkerTetikle } = await import(
      '../../bildirimler/kayit/PushWorkerTetikle'
    );
    PushWorkerTetikle(15);
  } catch {
    /* bildirim opsiyonel */
  }
}

export async function KisilerUcretliGorusmeBaslat(
  calleeId: string,
  callType: 'audio' | 'video',
): Promise<
  | { ok: true; call: Record<string, unknown>; price_per_minute: number | null; is_paid: boolean }
  | { ok: false; hata: string; error_code?: string }
> {
  const { data, error } = await supabase.rpc('kisiler_ucretli_gorusme_baslat', {
    p_callee_id: calleeId,
    p_call_type: callType,
  });
  if (error) return { ok: false, hata: error.message };
  const raw = (data ?? {}) as Record<string, unknown>;
  if (raw.ok === false) {
    return {
      ok: false,
      hata: String(raw.error ?? i18n.t('kisilerX.aramaBaslatilamadi')),
      error_code: typeof raw.error_code === 'string' ? raw.error_code : undefined,
    };
  }
  return {
    ok: true,
    call: (raw.call as Record<string, unknown>) ?? {},
    price_per_minute:
      raw.price_per_minute == null ? null : Number(raw.price_per_minute),
    is_paid: !!raw.is_paid,
  };
}

export async function KisilerBillingHeartbeat(callId: string): Promise<{
  continue: boolean;
  low_balance: boolean;
  ended?: boolean;
  estimated_remaining_sec?: number | null;
  free_seconds_remaining?: number | null;
}> {
  const { data, error } = await supabase.rpc('kisiler_gorusme_billing_heartbeat', {
    p_call_id: callId,
  });
  if (error) {
    return { continue: true, low_balance: false };
  }
  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    continue: raw.continue !== false,
    low_balance: !!raw.low_balance,
    ended: !!raw.ended,
    estimated_remaining_sec:
      raw.estimated_remaining_sec == null
        ? null
        : Number(raw.estimated_remaining_sec),
    free_seconds_remaining:
      raw.free_seconds_remaining == null
        ? null
        : Number(raw.free_seconds_remaining),
  };
}

export async function AdminKisilerConfigGuncelle(
  patch: Record<string, unknown>,
): Promise<KisilerConfig> {
  const { data, error } = await supabase.rpc('admin_kisiler_config_guncelle', {
    p: patch,
  });
  if (error) throw error;
  const raw = (data ?? {}) as Partial<KisilerConfig>;
  return {
    ...kisilerEffectiveCoz(raw),
    algorithm_version: raw.algorithm_version ?? 'v1',
    voice_price_min: Number(raw.voice_price_min ?? 25),
    voice_price_max: Number(raw.voice_price_max ?? 70),
    video_price_min: Number(raw.video_price_min ?? 25),
    video_price_max: Number(raw.video_price_max ?? 70),
    platform_call_fee: Number(raw.platform_call_fee ?? 0.2),
    billing_mode: (raw.billing_mode as KisilerConfig['billing_mode']) ?? 'per_second_ceil',
    free_call_seconds_grant: Number(raw.free_call_seconds_grant ?? 300),
    weights: raw.weights,
    updated_at: raw.updated_at ?? null,
  };
}
