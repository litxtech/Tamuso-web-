/**
 * Oda arka plan müziği — tip güvenli RPC sarmalayıcıları.
 */
import { supabase } from '../../../lib/supabase';
import {
  DepoyaMedyaYukle,
  MedyaUzantisiCoz,
} from '../../../ortak/medya/DepoyaMedyaYukle';
import { SesDosyasiSec } from '../../../ortak/medya/DocumentPickerHazirMi';
import { ProfilMedyasiSec } from '../../kullanici-profili/islemler/ProfilMedyasiYukle';
import i18n from '../../../i18n';

export const MUSIC_AUDIO_BUCKET = 'music-audio';
export const MUSIC_COVER_BUCKET = 'music-covers';

export type MusicTrackRow = {
  id: string;
  title: string;
  artist_name: string | null;
  description: string | null;
  cover_url: string | null;
  audio_url: string | null;
  duration_ms: number | null;
  mime_type: string | null;
  file_ext: string | null;
  category_id: string | null;
  tags: string[];
  status: string;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  rights_ack: boolean;
  rights_status: string;
  license_type: string | null;
  license_valid_until: string | null;
  play_count?: number;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type MusicLibraryItem = {
  id: string;
  title: string;
  artist_name: string | null;
  description: string | null;
  cover_url: string | null;
  audio_url: string | null;
  duration_ms: number | null;
  category_id: string | null;
  category_name?: string | null;
  tags: string[];
  is_featured: boolean;
  sort_order: number;
  is_favorite: boolean;
  play_count?: number;
};

export type RoomMusicSession = {
  room_id: string;
  track_id: string | null;
  state: 'STOPPED' | 'LOADING' | 'PLAYING' | 'PAUSED' | 'ENDED' | 'ERROR' | string;
  position_ms: number;
  started_at: string | null;
  paused_at: string | null;
  leader_user_id: string | null;
  volume: number;
  ducking_enabled: boolean;
  normal_volume: number;
  ducked_volume: number;
  repeat_mode: 'off' | 'all' | 'one' | string;
  shuffle_enabled: boolean;
  version: number;
  updated_at?: string;
  error_message?: string | null;
  track: {
    id: string;
    title: string;
    artist_name: string | null;
    cover_url: string | null;
    audio_url: string | null;
    duration_ms: number | null;
  } | null;
  queue: Array<{
    id: string;
    track_id: string;
    sort_order: number;
    title: string;
    artist_name: string | null;
    cover_url: string | null;
    audio_url: string | null;
    duration_ms: number | null;
  }>;
  can_manage: boolean;
};

export type MusicRuntimeConfig = {
  default_normal_volume: number;
  default_ducked_volume: number;
  duck_attack_ms: number;
  duck_hold_ms: number;
  max_music_volume: number;
};

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

/** Optimistic lock — eşzamanlı komut / stale React version */
export function OdaMuzikVersionConflictMi(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return /version conflict/i.test(msg);
}

/**
 * Taze session version ile komut çalıştırır.
 * Conflict olursa bir kez daha dener (çift tap / realtime yarışı).
 */
export async function RoomMusicKomutCalistir(
  roomId: string,
  komut: (expectedVersion: number) => Promise<RoomMusicSession>,
): Promise<RoomMusicSession> {
  const first = await RoomMusicSessionGet(roomId);
  try {
    return await komut(first.version);
  } catch (e) {
    if (!OdaMuzikVersionConflictMi(e)) throw e;
    const again = await RoomMusicSessionGet(roomId);
    return await komut(again.version);
  }
}

export async function MusicAdminDashboard() {
  return rpc<Record<string, number>>('music_admin_dashboard');
}

export async function MusicAdminList(status?: string | null) {
  return rpc<MusicTrackRow[]>('music_admin_list', { p_status: status ?? null });
}

export async function MusicAdminCreate(payload: Record<string, unknown>) {
  return rpc<{ ok: boolean; id: string }>('music_admin_create', { p_payload: payload });
}

export async function MusicAdminUpdate(trackId: string, payload: Record<string, unknown>) {
  return rpc<{ ok: boolean }>('music_admin_update', {
    p_track_id: trackId,
    p_payload: payload,
  });
}

export async function MusicAdminPublish(trackId: string, active = true) {
  return rpc<{ ok: boolean }>('music_admin_publish', {
    p_track_id: trackId,
    p_active: active,
  });
}

export async function MusicAdminSetActive(trackId: string, active: boolean) {
  return rpc<{ ok: boolean }>('music_admin_set_active', {
    p_track_id: trackId,
    p_active: active,
  });
}

export async function MusicAdminArchive(trackId: string) {
  return rpc<{ ok: boolean }>('music_admin_archive', { p_track_id: trackId });
}

export async function MusicCategories() {
  return rpc<Array<{ id: string; code: string; name: string; sort_order: number }>>(
    'music_admin_categories',
  );
}

export async function MusicCategoryUpsert(input: {
  code: string;
  name: string;
  sortOrder?: number;
}) {
  return rpc<{ ok: boolean; id: string }>('music_admin_category_upsert', {
    p_code: input.code,
    p_name: input.name,
    p_sort_order: input.sortOrder ?? 0,
    p_is_active: true,
  });
}

export async function MusicLibraryList(opts?: {
  query?: string;
  tab?: 'all' | 'featured' | 'new' | 'popular' | 'favorites';
  limit?: number;
}) {
  return rpc<MusicLibraryItem[]>('music_library_list', {
    p_query: opts?.query ?? null,
    p_tab: opts?.tab ?? 'all',
    p_limit: opts?.limit ?? 50,
  });
}

export async function MusicFavoriteToggle(trackId: string) {
  return rpc<{ ok: boolean; is_favorite: boolean }>('music_favorite_toggle', {
    p_track_id: trackId,
  });
}

export async function MusicRuntimeConfigGet() {
  return rpc<MusicRuntimeConfig>('music_runtime_config_get');
}

export async function RoomMusicSessionGet(roomId: string) {
  return rpc<RoomMusicSession>('room_music_session_get', { p_room_id: roomId });
}

export async function RoomMusicSet(roomId: string, trackId: string, expectedVersion?: number) {
  return rpc<RoomMusicSession>('room_music_set', {
    p_room_id: roomId,
    p_track_id: trackId,
    p_expected_version: expectedVersion ?? null,
  });
}

export async function RoomMusicPause(
  roomId: string,
  positionMs?: number,
  expectedVersion?: number,
) {
  return rpc<RoomMusicSession>('room_music_pause', {
    p_room_id: roomId,
    p_position_ms: positionMs ?? null,
    p_expected_version: expectedVersion ?? null,
  });
}

export async function RoomMusicResume(roomId: string, expectedVersion?: number) {
  return rpc<RoomMusicSession>('room_music_resume', {
    p_room_id: roomId,
    p_expected_version: expectedVersion ?? null,
  });
}

export async function RoomMusicStop(roomId: string, expectedVersion?: number) {
  return rpc<RoomMusicSession>('room_music_stop', {
    p_room_id: roomId,
    p_expected_version: expectedVersion ?? null,
  });
}

export async function RoomMusicSkip(
  roomId: string,
  direction = 1,
  expectedVersion?: number,
) {
  return rpc<RoomMusicSession>('room_music_skip', {
    p_room_id: roomId,
    p_direction: direction,
    p_expected_version: expectedVersion ?? null,
  });
}

export async function RoomMusicSeek(
  roomId: string,
  positionMs: number,
  expectedVersion?: number,
) {
  return rpc<RoomMusicSession>('room_music_seek', {
    p_room_id: roomId,
    p_position_ms: positionMs,
    p_expected_version: expectedVersion ?? null,
  });
}

export async function RoomMusicSetVolume(
  roomId: string,
  volume: number,
  expectedVersion?: number,
) {
  return rpc<RoomMusicSession>('room_music_set_volume', {
    p_room_id: roomId,
    p_volume: volume,
    p_expected_version: expectedVersion ?? null,
  });
}

export async function RoomMusicQueueAdd(roomId: string, trackId: string) {
  return rpc<RoomMusicSession>('room_music_queue_add', {
    p_room_id: roomId,
    p_track_id: trackId,
  });
}

const SES_UZANTILARI = new Set([
  'mp3',
  'mpeg',
  'mpga',
  'm4a',
  'aac',
  'wav',
  'wave',
  'ogg',
  'oga',
  'opus',
  'flac',
  'webm',
  'aiff',
  'aif',
  'caf',
  'wma',
  'amr',
  '3gp',
  '3gpp',
]);

function SesDosyasiMi(uri: string, mime: string | null, name?: string): boolean {
  const m = (mime || '').toLowerCase().trim();
  if (m.startsWith('audio/')) return true;
  if (m === 'application/ogg' || m === 'application/octet-stream' || !m) {
    const ham = `${name || ''} ${uri}`.toLowerCase();
    const ext = ham.split('?')[0].split('.').pop() || '';
    return SES_UZANTILARI.has(ext);
  }
  return false;
}

export async function MusicAdminAudioYukle(onProgress?: (pct: number) => void): Promise<{
  audioUrl: string;
  storagePath: string;
  mimeType: string;
  fileExt: string;
  suggestedTitle: string;
}> {
  const secim = await SesDosyasiSec();
  if (!secim.ok) {
    if ('iptal' in secim && secim.iptal) throw new Error('IPTAL');
    throw new Error(
      'hata' in secim ? secim.hata : i18n.t('odaMuzik.dosyaSecilemedi'),
    );
  }
  if (!SesDosyasiMi(secim.uri, secim.mime, secim.name)) {
    throw new Error(i18n.t('odaMuzik.desteklenenSes'));
  }
  onProgress?.(10);
  const ext = MedyaUzantisiCoz(secim.uri, secim.mime, 'mp3');
  const path = `tracks/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  onProgress?.(35);
  const yukleme = await DepoyaMedyaYukle(supabase, {
    bucket: MUSIC_AUDIO_BUCKET,
    path,
    uri: secim.uri,
    mime: secim.mime,
    tur: 'audio',
    upsert: false,
  });
  if (!yukleme.ok) throw new Error(yukleme.hata);
  onProgress?.(90);
  const { data: urlData } = supabase.storage
    .from(MUSIC_AUDIO_BUCKET)
    .getPublicUrl(yukleme.path);
  onProgress?.(100);
  return {
    audioUrl: urlData.publicUrl,
    storagePath: yukleme.path,
    mimeType: yukleme.contentType ?? secim.mime ?? 'audio/mpeg',
    fileExt: ext,
    suggestedTitle: secim.name.replace(/\.[^.]+$/, '').trim() || i18n.t('odaMuzik.varsayilanBaslik'),
  };
}

export async function MusicAdminCoverYukle(): Promise<{
  coverUrl: string;
  storagePath: string;
} | null> {
  const secim = await ProfilMedyasiSec('cover');
  if (!secim.ok) {
    if (secim.iptal) return null;
    throw new Error(secim.hata);
  }
  const ext = MedyaUzantisiCoz(secim.medya.uri, secim.medya.mimeType, 'jpg');
  const path = `covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const yukleme = await DepoyaMedyaYukle(supabase, {
    bucket: MUSIC_COVER_BUCKET,
    path,
    uri: secim.medya.uri,
    mime: secim.medya.mimeType,
    tur: 'image',
    upsert: false,
  });
  if (!yukleme.ok) throw new Error(yukleme.hata);
  const { data: urlData } = supabase.storage
    .from(MUSIC_COVER_BUCKET)
    .getPublicUrl(yukleme.path);
  return { coverUrl: urlData.publicUrl, storagePath: yukleme.path };
}

export function msMetni(ms: number | null | undefined) {
  const t = Math.max(0, Math.floor((ms || 0) / 1000));
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
