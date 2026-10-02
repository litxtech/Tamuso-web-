import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import type {
  AiMuzikAdminBakiyeKullanici,
  AiMuzikAdminCreator,
  AiMuzikAdminDashboard,
  AiMuzikAdminTrackSatir,
  AiMuzikBakiye,
  AiMuzikConfig,
  AiMuzikGenre,
  AiMuzikLedgerSatir,
  AiMuzikJobDurum,
  AiMuzikModeration,
  AiMuzikOlusturIstek,
  AiMuzikOlusturSonuc,
  AiMuzikProduct,
  AiMuzikRoomLibraryItem,
  AiMuzikTaste,
  AiMuzikTrackDetay,
  AiMuzikTrackOzet,
  SatinAlmaGecmisSatir,
} from '../tipler';

let urunOnbellek: AiMuzikProduct[] | null = null;
let urunOnbellekAt = 0;
const URUN_ONBELLEK_MS = 60_000;

function edgeUrl(path: string): string {
  const base =
    process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ??
    'https://placeholder.supabase.co';
  return `${base}/functions/v1/${path}`;
}

async function jwtAl(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function rpcJson<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args ?? {});
  if (error) throw error;
  return data as T;
}

export async function AiMuzikWelcomeGrant(): Promise<{
  ok: boolean;
  granted?: boolean;
  seconds?: number;
}> {
  const row = await rpcJson<Record<string, unknown>>('ai_music_welcome_grant');
  return { ok: !!row?.ok, granted: !!row?.granted, seconds: Number(row?.seconds ?? 0) };
}

export async function AiMuzikBakiyeGetir(): Promise<AiMuzikBakiye> {
  const row = await rpcJson<AiMuzikBakiye>('ai_music_balance_get');
  return {
    available_seconds: Number(row?.available_seconds ?? 0),
    reserved_seconds: Number(row?.reserved_seconds ?? 0),
    lifetime_granted_seconds: Number(row?.lifetime_granted_seconds ?? 0),
    lifetime_purchased_seconds: Number(row?.lifetime_purchased_seconds ?? 0),
    lifetime_welcome_seconds: Number(row?.lifetime_welcome_seconds ?? 0),
    lifetime_consumed_seconds: Number(row?.lifetime_consumed_seconds ?? 0),
  };
}

export async function AiMuzikConfigGetir(): Promise<AiMuzikConfig> {
  return rpcJson<AiMuzikConfig>('ai_music_config_get');
}

export async function AiMuzikUrunleriListele(
  opts?: { force?: boolean },
): Promise<AiMuzikProduct[]> {
  const now = Date.now();
  if (
    !opts?.force &&
    urunOnbellek &&
    now - urunOnbellekAt < URUN_ONBELLEK_MS
  ) {
    return urunOnbellek;
  }
  const data = await rpcJson<AiMuzikProduct[]>('ai_music_products_list');
  const list = Array.isArray(data) ? data : [];
  urunOnbellek = list;
  urunOnbellekAt = now;
  return list;
}

/** Katalogu arka planda ısıt — sheet anında açılsın. */
export function AiMuzikUrunOnbellekIsit(): void {
  void AiMuzikUrunleriListele().catch(() => undefined);
}

export async function AiMuzikTurAra(
  query?: string,
  limit = 40,
): Promise<AiMuzikGenre[]> {
  const data = await rpcJson<AiMuzikGenre[]>('ai_music_genres_search', {
    p_query: query ?? null,
    p_limit: limit,
  });
  return Array.isArray(data) ? data : [];
}

export async function AiMuzikHaklariKabul(
  policyVersion: string,
): Promise<{ ok: boolean }> {
  const row = await rpcJson<{ ok?: boolean }>('ai_music_rights_accept', {
    p_policy_version: policyVersion,
  });
  return { ok: !!row?.ok };
}

export async function AiMuzikHaklariDurumu(): Promise<{
  accepted: boolean;
  policy_version: string;
}> {
  const row = await rpcJson<{ accepted?: boolean; policy_version?: string }>(
    'ai_music_rights_status',
  );
  return {
    accepted: !!row?.accepted,
    policy_version: String(row?.policy_version ?? ''),
  };
}

export async function AiMuzikParcalariGetir(opts?: {
  tab?: string;
  query?: string;
  sort?: string;
  limit?: number;
  before?: string | null;
}): Promise<AiMuzikTrackOzet[]> {
  const data = await rpcJson<AiMuzikTrackOzet[]>('ai_music_my_tracks', {
    p_tab: opts?.tab ?? 'all',
    p_query: opts?.query ?? null,
    p_sort: opts?.sort ?? 'new',
    p_limit: opts?.limit ?? 40,
    p_before: opts?.before ?? null,
  });
  return Array.isArray(data) ? data : [];
}

export async function AiMuzikParcaDetay(trackId: string): Promise<AiMuzikTrackDetay> {
  return rpcJson<AiMuzikTrackDetay>('ai_music_track_detail', {
    p_track_id: trackId,
  });
}

export async function AiMuzikParcaYenidenAdlandir(
  trackId: string,
  title: string,
): Promise<{ ok: boolean; title?: string; hata?: string }> {
  const { data, error } = await supabase.rpc('ai_music_track_rename', {
    p_track_id: trackId,
    p_title: title,
  });
  if (error) return { ok: false, hata: error.message };
  const row = data as { ok?: boolean; title?: string };
  return { ok: !!row?.ok, title: row?.title };
}

export async function AiMuzikParcaSil(
  trackId: string,
): Promise<{ ok: boolean; hata?: string }> {
  const { data, error } = await supabase.rpc('ai_music_track_soft_delete', {
    p_track_id: trackId,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: !!(data as { ok?: boolean })?.ok };
}

export async function AiMuzikFavoriToggle(
  trackId: string,
): Promise<{ ok: boolean; is_favorite?: boolean }> {
  const row = await rpcJson<{ ok?: boolean; is_favorite?: boolean }>(
    'ai_music_favorite_toggle',
    { p_track_id: trackId },
  );
  return { ok: !!row?.ok, is_favorite: row?.is_favorite };
}

export async function AiMuzikKutuphaneyeEkle(
  trackId: string,
): Promise<{ ok: boolean; hata?: string }> {
  const { data, error } = await supabase.rpc('ai_music_library_add', {
    p_track_id: trackId,
  });
  if (error) return { ok: false, hata: error.message };
  const row = data as { ok?: boolean; hata?: string };
  return { ok: !!row?.ok, hata: row?.hata };
}

export async function AiMuzikKutuphanedenCikar(
  trackId: string,
): Promise<{ ok: boolean; hata?: string }> {
  const { data, error } = await supabase.rpc('ai_music_library_remove', {
    p_track_id: trackId,
  });
  if (error) return { ok: false, hata: error.message };
  const row = data as { ok?: boolean; hata?: string };
  return { ok: !!row?.ok, hata: row?.hata };
}

export async function AiMuzikDefterGetir(limit = 50): Promise<AiMuzikLedgerSatir[]> {
  const data = await rpcJson<AiMuzikLedgerSatir[]>('ai_music_ledger_mine', {
    p_limit: limit,
  });
  return Array.isArray(data) ? data : [];
}

/** Coin + AI müzik (ve ileride diğer) satın alma geçmişi. */
export async function SatinAlmaGecmisiniGetir(
  limit = 50,
): Promise<SatinAlmaGecmisSatir[]> {
  const data = await rpcJson<SatinAlmaGecmisSatir[]>('satin_alma_gecmisim', {
    p_limit: limit,
  });
  return Array.isArray(data) ? data : [];
}

export async function AiMuzikOdaKutuphanesi(
  query?: string,
  limit = 40,
): Promise<AiMuzikRoomLibraryItem[]> {
  const data = await rpcJson<AiMuzikRoomLibraryItem[]>('ai_music_room_library', {
    p_query: query ?? null,
    p_limit: limit,
  });
  return Array.isArray(data) ? data : [];
}

export async function DurumMuzikOlustur(
  trackId: string,
  caption?: string,
): Promise<{ ok: boolean; id?: string; hata?: string }> {
  const { data, error } = await supabase.rpc('durum_muzik_olustur', {
    p_track_id: trackId,
    p_caption: caption ?? null,
  });
  if (error) return { ok: false, hata: error.message };
  const row = data as { ok?: boolean; id?: string; hata?: string };
  return { ok: !!row?.ok, id: row?.id, hata: row?.hata };
}

export async function AiMuzikOlustur(
  body: AiMuzikOlusturIstek,
): Promise<AiMuzikOlusturSonuc> {
  const jwt = await jwtAl();
  if (!jwt) return { ok: false, error: 'UNAUTHORIZED', message: i18n.t('aiMuzik.oturumGerekli') };

  try {
    const res = await fetch(edgeUrl('ai-music-create'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
        'x-idempotency-key': body.idempotency_key,
      },
      body: JSON.stringify({
        prompt: body.prompt,
        duration_seconds: body.duration_seconds,
        genre_code: body.genre_code,
        mood: body.mood,
        tempo: body.tempo,
        bpm: body.bpm,
        language_code: body.language_code,
        instruments: body.instruments,
        structure_hint: body.structure_hint,
        lyrics_mode: body.lyrics_mode,
        lyrics: body.lyrics,
        voice_gender: body.voice_gender ?? null,
        idempotency_key: body.idempotency_key,
        revise_track_id: body.revise_track_id ?? null,
        reference_storage_path: body.reference_storage_path ?? null,
      }),
    });
    const json = (await res.json()) as AiMuzikOlusturSonuc & Record<string, unknown>;
    if (!res.ok && json.ok !== false) {
      return {
        ok: false,
        error: String(json.error ?? res.status),
        message: String(json.message ?? i18n.t('aiMuzik.uretimBasarisizMesaj')),
        available_seconds: Number(json.available_seconds ?? 0),
      };
    }
    return json;
  } catch (e) {
    return {
      ok: false,
      error: 'NETWORK',
      message: e instanceof Error ? e.message : i18n.t('aiMuzik.agHatasi'),
    };
  }
}

export async function AiMuzikJobDurumuGetir(
  jobId: string,
): Promise<{ ok: boolean; job?: AiMuzikJobDurum }> {
  const jwt = await jwtAl();
  if (!jwt) return { ok: false };

  try {
    const url = `${edgeUrl('ai-music-job-status')}?job_id=${encodeURIComponent(jobId)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const json = (await res.json()) as { ok?: boolean; job?: AiMuzikJobDurum };
    if (!res.ok || !json.ok) return { ok: false };
    return { ok: true, job: json.job };
  } catch {
    return { ok: false };
  }
}

export async function AiMuzikAdminDashboardGetir(): Promise<AiMuzikAdminDashboard> {
  return rpcJson<AiMuzikAdminDashboard>('ai_music_admin_dashboard');
}

export async function AiMuzikAdminConfigGuncelle(
  payload: Record<string, unknown>,
): Promise<AiMuzikConfig> {
  return rpcJson<AiMuzikConfig>('ai_music_admin_config_update', {
    p_payload: payload,
  });
}

export async function AiMuzikAdminUrunKaydet(
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; id?: string }> {
  const row = await rpcJson<{ ok?: boolean; id?: string }>(
    'ai_music_admin_product_upsert',
    { p_payload: payload },
  );
  return { ok: !!row?.ok, id: row?.id };
}

export async function AiMuzikAdminBakiyeAyarla(
  userId: string,
  secondsDelta: number,
  reason: string,
): Promise<{
  ok: boolean;
  available_seconds?: number;
  seconds_applied?: number;
  hata?: string;
}> {
  try {
    const row = await rpcJson<{
      ok?: boolean;
      available_seconds?: number;
      seconds_applied?: number;
      hata?: string;
    }>('ai_music_admin_adjust', {
      p_user_id: userId,
      p_seconds: secondsDelta,
      p_reason: reason,
    });
    return {
      ok: !!row?.ok,
      available_seconds: row?.available_seconds,
      seconds_applied: row?.seconds_applied,
      hata: row?.hata,
    };
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : i18n.t('aiMuzik.ayarlanamadi'),
    };
  }
}

export async function AiMuzikAdminBakiyeTopluAyarla(
  userIds: string[],
  secondsDelta: number,
  reason: string,
): Promise<{
  ok: boolean;
  success_count: number;
  fail_count: number;
  results: Array<{
    user_id: string | null;
    ok: boolean;
    available_seconds?: number;
    seconds_applied?: number;
    hata?: string;
  }>;
  hata?: string;
}> {
  try {
    const row = await rpcJson<{
      ok?: boolean;
      success_count?: number;
      fail_count?: number;
      results?: Array<{
        user_id: string | null;
        ok: boolean;
        available_seconds?: number;
        seconds_applied?: number;
        hata?: string;
      }>;
    }>('ai_music_admin_adjust_bulk', {
      p_user_ids: userIds,
      p_seconds: secondsDelta,
      p_reason: reason,
    });
    return {
      ok: !!row?.ok,
      success_count: Number(row?.success_count ?? 0),
      fail_count: Number(row?.fail_count ?? 0),
      results: Array.isArray(row?.results) ? row.results : [],
    };
  } catch (e) {
    return {
      ok: false,
      success_count: 0,
      fail_count: userIds.length,
      results: [],
      hata: e instanceof Error ? e.message : i18n.t('aiMuzik.topluIslemBasarisiz'),
    };
  }
}

export async function AiMuzikAdminKullaniciAra(opts?: {
  query?: string;
  limit?: number;
}): Promise<AiMuzikAdminBakiyeKullanici[]> {
  const data = await rpcJson<AiMuzikAdminBakiyeKullanici[]>(
    'ai_music_admin_user_search',
    {
      p_query: opts?.query ?? null,
      p_limit: opts?.limit ?? 40,
    },
  );
  return Array.isArray(data) ? data : [];
}

export async function AiMuzikAdminKullaniciBakiyesi(
  userId: string,
): Promise<{
  ok: boolean;
  available_seconds?: number;
  reserved_seconds?: number;
  hata?: string;
}> {
  const row = await rpcJson<{
    ok?: boolean;
    available_seconds?: number;
    reserved_seconds?: number;
    hata?: string;
  }>('ai_music_admin_user_balance', { p_user_id: userId });
  return {
    ok: !!row?.ok,
    available_seconds: Number(row?.available_seconds ?? 0),
    reserved_seconds: Number(row?.reserved_seconds ?? 0),
    hata: row?.hata,
  };
}

export async function AiMuzikTatGetir(): Promise<AiMuzikTaste> {
  const row = await rpcJson<Record<string, unknown>>('ai_music_my_taste');
  const titles = Array.isArray(row?.recent_titles) ? row.recent_titles : [];
  const genres = Array.isArray(row?.recent_genres)
    ? (row.recent_genres as string[])
    : [];
  const moods = Array.isArray(row?.recent_moods)
    ? (row.recent_moods as string[])
    : [];
  return {
    recent_genres: genres,
    recent_moods: moods,
    recent_tempos: Array.isArray(row?.recent_tempos)
      ? (row.recent_tempos as string[])
      : [],
    recent_languages: Array.isArray(row?.recent_languages)
      ? (row.recent_languages as string[])
      : [],
    recent_titles: titles as AiMuzikTaste['recent_titles'],
    last_prompt: (row?.last_prompt as string) ?? null,
    last_settings: (row?.last_settings as Record<string, unknown>) ?? {},
    generation_count: Number(row?.generation_count ?? 0),
  };
}

export async function AiMuzikModerasyonum(): Promise<AiMuzikModeration> {
  const row = await rpcJson<AiMuzikModeration>('ai_music_my_moderation');
  return {
    create_blocked: !!row?.create_blocked,
    library_blocked: !!row?.library_blocked,
    warn_count: Number(row?.warn_count ?? 0),
    last_warn_message: row?.last_warn_message ?? null,
    last_warn_at: row?.last_warn_at ?? null,
  };
}

export async function AiMuzikAdminCreatorsGetir(opts?: {
  query?: string;
  limit?: number;
}): Promise<AiMuzikAdminCreator[]> {
  const data = await rpcJson<AiMuzikAdminCreator[]>('ai_music_admin_creators', {
    p_query: opts?.query ?? null,
    p_limit: opts?.limit ?? 40,
    p_offset: 0,
  });
  return Array.isArray(data) ? data : [];
}

export async function AiMuzikAdminKullaniciParcalari(
  userId: string,
): Promise<{
  ok: boolean;
  user?: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    public_user_id: string | null;
  };
  moderation?: AiMuzikModeration;
  tracks?: AiMuzikAdminTrackSatir[];
  hata?: string;
}> {
  const row = await rpcJson<{
    ok?: boolean;
    user?: {
      id: string;
      username: string | null;
      display_name: string | null;
      avatar_url: string | null;
      public_user_id: string | null;
    };
    moderation?: AiMuzikModeration;
    tracks?: AiMuzikAdminTrackSatir[];
    hata?: string;
  }>('ai_music_admin_user_tracks', {
    p_user_id: userId,
    p_limit: 80,
    p_offset: 0,
  });
  return {
    ok: !!row?.ok,
    user: row?.user,
    moderation: row?.moderation,
    tracks: Array.isArray(row?.tracks) ? row.tracks : [],
    hata: row?.hata,
  };
}

export async function AiMuzikAdminParcaKaldir(
  trackId: string,
  reason?: string,
): Promise<{ ok: boolean; hata?: string }> {
  const { data, error } = await supabase.rpc('ai_music_admin_track_remove', {
    p_track_id: trackId,
    p_reason: reason ?? null,
  });
  if (error) return { ok: false, hata: error.message };
  const row = data as { ok?: boolean; hata?: string };
  return { ok: !!row?.ok, hata: row?.hata };
}

export async function AiMuzikAdminParcaGeriAl(
  trackId: string,
): Promise<{ ok: boolean; hata?: string }> {
  const { data, error } = await supabase.rpc('ai_music_admin_track_restore', {
    p_track_id: trackId,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: !!(data as { ok?: boolean })?.ok };
}

export async function AiMuzikAdminModerasyonAyarla(
  userId: string,
  opts: {
    create_blocked?: boolean | null;
    library_blocked?: boolean | null;
    warn_message?: string | null;
    notes?: string | null;
  },
): Promise<{ ok: boolean; hata?: string } & Partial<AiMuzikModeration>> {
  const { data, error } = await supabase.rpc(
    'ai_music_admin_user_moderation_set',
    {
      p_user_id: userId,
      p_create_blocked: opts.create_blocked ?? null,
      p_library_blocked: opts.library_blocked ?? null,
      p_warn_message: opts.warn_message ?? null,
      p_notes: opts.notes ?? null,
    },
  );
  if (error) return { ok: false, hata: error.message };
  const row = data as AiMuzikModeration & { ok?: boolean };
  return {
    ok: !!row?.ok,
    create_blocked: row?.create_blocked,
    library_blocked: row?.library_blocked,
    warn_count: row?.warn_count,
    last_warn_message: row?.last_warn_message,
  };
}

export async function AiMuzikKapakYukle(
  trackId: string,
): Promise<{ ok: boolean; hata?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, hata: i18n.t('ortak.oturumYok') };

  const { ProfilMedyasiSec } = await import(
    '../../kullanici-profili/islemler/ProfilMedyasiYukle'
  );
  const { DepoyaMedyaYukle } = await import('../../../ortak/medya/DepoyaMedyaYukle');

  const secim = await ProfilMedyasiSec('cover');
  if (!secim.ok) {
    return { ok: false, hata: secim.iptal ? i18n.t('ortak.iptal') : secim.hata };
  }

  const path = `${user.id}/${trackId}-${Date.now()}.jpg`;
  try {
    const yukleme = await DepoyaMedyaYukle(supabase, {
      bucket: 'ai-music-covers',
      path,
      uri: secim.medya.uri,
      mime: secim.medya.mimeType ?? 'image/jpeg',
      tur: 'image',
      upsert: true,
    });
    if (!yukleme.ok) return { ok: false, hata: yukleme.hata };

    const { data: signed } = await supabase.storage
      .from('ai-music-covers')
      .createSignedUrl(yukleme.path, 60 * 60 * 24 * 30);
    const url = signed?.signedUrl;
    if (!url) return { ok: false, hata: i18n.t('aiMuzik.urlOlusturulamadi') };

    const row = await rpcJson<{ ok?: boolean }>('ai_music_track_set_cover', {
      p_track_id: trackId,
      p_cover_path: yukleme.path,
      p_cover_url: url,
    });
    return { ok: !!row?.ok };
  } catch (e) {
    return { ok: false, hata: e instanceof Error ? e.message : i18n.t('aiMuzik.kapakYuklenemedi') };
  }
}

export async function AiMuzikKirp(
  trackId: string,
  startMs: number,
  endMs: number,
): Promise<{ ok: boolean; hata?: string }> {
  try {
    const row = await rpcJson<{ ok?: boolean }>('ai_music_track_trim', {
      p_track_id: trackId,
      p_start_ms: startMs,
      p_end_ms: endMs,
    });
    return { ok: !!row?.ok };
  } catch (e) {
    return { ok: false, hata: e instanceof Error ? e.message : i18n.t('aiMuzik.kirpmaBasarisiz') };
  }
}

export function AiMuzikIdempotencyAnahtari(): string {
  const r =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  return `ai_music_gen_${r}`;
}

/** Referans ses/video → ai-music-temp (edge ElevenLabs’e iletir) */
export async function AiMuzikReferansYukle(opts: {
  uri: string;
  mime: string;
  name: string;
}): Promise<{ ok: true; path: string } | { ok: false; hata: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, hata: i18n.t('ortak.oturumYok') };

  const ext =
    opts.name.split('.').pop()?.toLowerCase() ||
    (opts.mime.includes('video') ? 'mp4' : 'mp3');
  const path = `${user.id}/ref-${Date.now()}.${ext}`;

  try {
    const { DepoyaMedyaYukle } = await import(
      '../../../ortak/medya/DepoyaMedyaYukle'
    );
    const yukleme = await DepoyaMedyaYukle(supabase, {
      bucket: 'ai-music-temp',
      path,
      uri: opts.uri,
      mime: opts.mime || 'audio/mpeg',
      tur: opts.mime.startsWith('video/') ? 'video' : 'audio',
      upsert: true,
    });
    if (!yukleme.ok) return { ok: false, hata: yukleme.hata };
    return { ok: true, path: yukleme.path };
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : i18n.t('aiMuzik.referansYuklenemedi'),
    };
  }
}
