import { supabase } from '../../../lib/supabase';
import type { DurumMuzikPayload } from '../../ai-muzik/tipler';
import i18n from '../../../i18n';

export type DurumPostKind = 'media' | 'game_win' | 'music';

export type DurumOyunKazanciPayload = {
  game_code: string;
  game_title: string;
  round_id: string;
  total_win: number;
  base_win: number;
  bet_amount: number;
  total_multiplier: number;
  win_tier: string;
};

export type DurumOggesi = {
  id: string;
  user_id: string;
  media_type: 'image' | 'video' | 'card' | 'text' | 'audio';
  /** Boş string olabilir (metin / oyun kartı) — UI null uri ile Image açmaz */
  media_url: string;
  caption: string | null;
  like_count: number;
  comment_count: number;
  gift_count: number;
  view_count: number;
  share_count?: number;
  post_kind: DurumPostKind;
  payload: DurumOyunKazanciPayload | Record<string, unknown> | null;
  created_at: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  public_user_id: string | null;
  is_verified?: boolean;
  selected_title_id?: string | null;
  liked_by_me: boolean;
  is_mine: boolean;
};

function normalizeDurum(row: DurumOggesi): DurumOggesi {
  if (!row || typeof row !== 'object') {
    throw new Error(i18n.t('durum.bulunamadi'));
  }
  const mediaUrl =
    typeof row.media_url === 'string' ? row.media_url.trim() : '';
  return {
    ...row,
    media_url: mediaUrl,
    gift_count: Number(row.gift_count ?? 0),
    view_count: Number(row.view_count ?? 0),
    share_count: Number(row.share_count ?? 0),
    post_kind: (row.post_kind as DurumPostKind) || 'media',
    payload: (row.payload as DurumOggesi['payload']) ?? {},
  };
}

export function DurumMuzikPayloadAl(oge: DurumOggesi): DurumMuzikPayload | null {
  if (oge.post_kind !== 'music' || !oge.payload) return null;
  const p = oge.payload as Partial<DurumMuzikPayload>;
  if (!p.track_id || !p.title) return null;
  return {
    track_id: String(p.track_id),
    version_id: p.version_id ?? null,
    title: String(p.title),
    duration_ms: p.duration_ms ?? null,
    cover_url: p.cover_url ?? null,
    audio_url: p.audio_url ?? null,
    public_track_code: p.public_track_code ?? null,
  };
}

export function DurumSesPayloadAl(
  oge: Pick<DurumOggesi, 'media_type' | 'payload'>,
): { duration_ms: number } | null {
  if (oge.media_type !== 'audio') return null;
  const p = (oge.payload ?? {}) as { duration_ms?: number };
  const ms = Number(p.duration_ms ?? 0);
  return { duration_ms: Number.isFinite(ms) ? Math.max(0, ms) : 0 };
}

export function DurumOyunKazanciPayloadAl(
  oge: DurumOggesi,
): DurumOyunKazanciPayload | null {
  if (oge.post_kind !== 'game_win' || !oge.payload) return null;
  const p = oge.payload as Partial<DurumOyunKazanciPayload>;
  if (!p.round_id && p.total_win == null) return null;
  return {
    game_code: String(p.game_code ?? 'kozmik_kaskad'),
    game_title: String(p.game_title ?? 'Realm of Storms'),
    round_id: String(p.round_id ?? ''),
    total_win: Number(p.total_win ?? 0),
    base_win: Number(p.base_win ?? p.total_win ?? 0),
    bet_amount: Number(p.bet_amount ?? 0),
    total_multiplier: Number(p.total_multiplier ?? 1),
    win_tier: String(p.win_tier ?? 'STORM'),
  };
}

export function DurumMedyaHttpsMi(url: string | null | undefined): boolean {
  return typeof url === 'string' && /^https?:\/\//i.test(url.trim());
}

/**
 * Caption/mood vb. — görüntülenebilir https medya yok.
 * Lightbox / siyah medya sahnesi açılmamalı.
 */
export function DurumMetinGonderisiMi(oge: DurumOggesi): boolean {
  if (DurumOyunKazanciPayloadAl(oge)) return false;
  if (DurumMuzikPayloadAl(oge)) return false;
  if (oge.media_type === 'audio') return false;
  if ((oge.media_type as string) === 'text') return true;
  return !DurumMedyaHttpsMi(oge.media_url);
}

export type DurumYorum = {
  id: string;
  user_id: string;
  body: string;
  parent_id: string | null;
  media_url: string | null;
  like_count: number;
  liked_by_me: boolean;
  created_at: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  public_user_id: string | null;
  is_verified?: boolean;
  selected_title_id?: string | null;
  is_mine: boolean;
};

export type DurumBegenen = {
  user_id: string;
  created_at: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  public_user_id: string | null;
};

export async function DurumAkisiniGetir(
  limit = 40,
  before: string | null = null,
): Promise<DurumOggesi[]> {
  const { data, error } = await supabase.rpc('durum_akisi', {
    p_limit: limit,
    p_before: before,
  });
  if (error) throw error;
  return ((data as DurumOggesi[]) ?? []).map(normalizeDurum);
}

export async function DurumTakipAkisiniGetir(
  limit = 40,
  before: string | null = null,
): Promise<DurumOggesi[]> {
  const { data, error } = await supabase.rpc('durum_akisi_takip', {
    p_limit: limit,
    p_before: before,
  });
  if (error) throw error;
  return ((data as DurumOggesi[]) ?? []).map(normalizeDurum);
}

export async function DurumDetayGetir(id: string): Promise<DurumOggesi> {
  const { data, error } = await supabase.rpc('durum_detay', { p_status_id: id });
  if (error) throw error;
  if (!data || typeof data !== 'object') {
    throw new Error(i18n.t('durum.bulunamadi'));
  }
  return normalizeDurum(data as DurumOggesi);
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

export async function DurumOlustur(input: {
  mediaType: 'image' | 'video' | 'text' | 'audio';
  mediaUrl?: string | null;
  caption?: string;
  durationMs?: number | null;
}): Promise<{ ok: boolean; id?: string; hata?: string }> {
  const { data, error } = await supabase.rpc('durum_olustur', {
    p_media_type: input.mediaType,
    p_media_url: input.mediaUrl ?? null,
    p_caption: input.caption ?? null,
    p_duration_ms:
      input.mediaType === 'audio' ? Math.round(input.durationMs ?? 0) : null,
  });
  if (error) return { ok: false, hata: error.message };
  const row = data as { ok?: boolean; id?: string };
  return { ok: !!row?.ok, id: row?.id };
}

export async function DurumOyunKazanciOlustur(input: {
  gameCode: string;
  roundId: string;
  caption?: string;
}): Promise<{ ok: boolean; id?: string; already?: boolean; hata?: string }> {
  const { data, error } = await supabase.rpc('durum_oyun_kazanci_olustur', {
    p_game_code: input.gameCode,
    p_round_id: input.roundId,
    p_caption: input.caption ?? null,
  });
  if (error) return { ok: false, hata: error.message };
  const row = data as { ok?: boolean; id?: string; already?: boolean };
  return {
    ok: !!row?.ok,
    id: row?.id,
    already: !!row?.already,
  };
}

export async function DurumSil(
  id: string,
): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('durum_sil', { p_status_id: id });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

/**
 * Gönderi detayı açılınca çağır.
 * Her hesap en fazla 1 kez sayılır; sahip kendi gönderisini artırmaz.
 */
export async function DurumGoruntulemeKaydet(
  id: string,
): Promise<{ ok: boolean; counted?: boolean; view_count?: number; hata?: string }> {
  const { data, error } = await supabase.rpc('durum_goruntuleme_kaydet', {
    p_status_id: id,
  });
  if (error) return { ok: false, hata: error.message };
  const row = data as {
    ok?: boolean;
    counted?: boolean;
    view_count?: number;
  };
  return {
    ok: !!row?.ok,
    counted: !!row?.counted,
    view_count: Number(row?.view_count ?? 0),
  };
}

export async function DurumGuncelle(
  id: string,
  caption?: string,
): Promise<{ ok: boolean; caption?: string | null; hata?: string }> {
  const { data, error } = await supabase.rpc('durum_guncelle', {
    p_status_id: id,
    p_caption: caption ?? null,
  });
  if (error) return { ok: false, hata: error.message };
  const row = data as { ok?: boolean; caption?: string | null };
  return { ok: !!row?.ok, caption: row?.caption ?? null };
}

export async function DurumKullanicisiniGetir(
  userId: string,
  limit = 40,
): Promise<DurumOggesi[]> {
  const { data, error } = await supabase.rpc('durum_kullanicisi', {
    p_user_id: userId,
    p_limit: limit,
    p_before: null,
  });
  if (error) throw error;
  return ((data as DurumOggesi[]) ?? []).flatMap((row) => {
    try {
      return [normalizeDurum(row)];
    } catch {
      return [];
    }
  });
}

export async function DurumBegeniToggle(
  id: string,
): Promise<{ ok: boolean; liked?: boolean; like_count?: number; hata?: string }> {
  const { data, error } = await supabase.rpc('durum_begeni_toggle', {
    p_status_id: id,
  });
  if (error) return { ok: false, hata: error.message };
  const row = data as { ok?: boolean; liked?: boolean; like_count?: number };
  return {
    ok: !!row?.ok,
    liked: row?.liked,
    like_count: row?.like_count,
  };
}

export async function DurumBegenenleriGetir(
  id: string,
): Promise<DurumBegenen[]> {
  const { data, error } = await supabase.rpc('durum_begenenler', {
    p_status_id: id,
    p_limit: 50,
  });
  if (error) throw error;
  return (data as DurumBegenen[]) ?? [];
}

export async function DurumYorumlariGetir(id: string): Promise<DurumYorum[]> {
  const { data, error } = await supabase.rpc('durum_yorumlari', {
    p_status_id: id,
    p_limit: 120,
  });
  if (error) throw error;
  return ((data as DurumYorum[]) ?? []).map((y) => ({
    ...y,
    parent_id: y.parent_id ?? null,
    media_url: y.media_url ?? null,
    like_count: Number(y.like_count ?? 0),
    liked_by_me: !!y.liked_by_me,
  }));
}

export async function DurumYorumEkle(
  id: string,
  body: string,
  opts?: { parentId?: string | null; mediaUrl?: string | null },
): Promise<{ ok: boolean; id?: string; hata?: string }> {
  const { data, error } = await supabase.rpc('durum_yorum_ekle', {
    p_status_id: id,
    p_body: body || null,
    p_parent_id: opts?.parentId ?? null,
    p_media_url: opts?.mediaUrl ?? null,
  });
  if (error) return { ok: false, hata: error.message };
  const row = data as { ok?: boolean; id?: string };
  return { ok: !!row?.ok, id: row?.id };
}

export async function DurumYorumSil(
  commentId: string,
): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('durum_yorum_sil', {
    p_comment_id: commentId,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

export async function DurumYorumBegeniToggle(
  commentId: string,
): Promise<{ ok: boolean; liked?: boolean; like_count?: number; hata?: string }> {
  const { data, error } = await supabase.rpc('durum_yorum_begeni_toggle', {
    p_comment_id: commentId,
  });
  if (error) return { ok: false, hata: error.message };
  const row = data as { ok?: boolean; liked?: boolean; like_count?: number };
  return {
    ok: !!row?.ok,
    liked: row?.liked,
    like_count: row?.like_count,
  };
}
