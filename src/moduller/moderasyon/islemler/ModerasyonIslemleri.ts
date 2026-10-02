import { supabase } from '../../../lib/supabase';
import { OzellikBayragiAktifMiSunucu } from '../../ozellik-bayraklari/okuma/OzellikBayragiAktifMiSunucu';
import i18n from '../../../i18n';
import type { CeviriAnahtari } from '../../../i18n/useCeviri';

export type ModerasyonAksiyonu =
  | 'mute'
  | 'unmute'
  | 'mic_lock'
  | 'mic_unlock'
  | 'unseat'
  | 'kick'
  | 'ban'
  | 'unban';

export type EngellenenKullanici = {
  blocked_id: string;
  created_at: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  public_user_id: string | null;
};

export async function OdaModerasyonUygula(input: {
  roomId: string;
  targetUserId: string;
  action: ModerasyonAksiyonu;
  reason?: string;
}): Promise<{ ok: boolean; hata?: string }> {
  if (!(await OzellikBayragiAktifMiSunucu('moderation_enabled'))) {
    return { ok: false, hata: i18n.t('sesOda.moderasyonKapali') };
  }
  const { error } = await supabase.rpc('oda_moderasyon_uygula', {
    p_room_id: input.roomId,
    p_target_user_id: input.targetUserId,
    p_action: input.action,
    p_reason: input.reason ?? null,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

export async function KullaniciBildir(input: {
  reason: string;
  /** BILDIRME_SEBEPLERI id — çocuk koruma önceliği için */
  reasonCode?: string;
  targetUserId?: string;
  roomId?: string;
  details?: string;
  contentType?:
    | 'user'
    | 'dm_message'
    | 'room_chat'
    | 'live_chat'
    | 'room'
    | 'live'
    | 'profile'
    | 'status_post'
    | 'status_comment'
    | 'other';
  contentId?: string;
  context?: Record<string, unknown>;
}): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('kullanici_bildir', {
    p_reason: input.reason,
    p_target_user_id: input.targetUserId ?? null,
    p_room_id: input.roomId ?? null,
    p_details: input.details ?? null,
    p_content_type: input.contentType ?? null,
    p_content_id: input.contentId ?? null,
    p_context: {
      ...(input.context ?? {}),
      ...(input.reasonCode ? { reason_code: input.reasonCode } : {}),
    },
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

export async function KullaniciEngelle(
  blockedUserId: string,
): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('kullanici_engelle', {
    p_blocked_id: blockedUserId,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

export async function KullaniciEngeliKaldir(
  blockedUserId: string,
): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('kullanici_engeli_kaldir', {
    p_blocked_id: blockedUserId,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

export async function EngellenenKullanicilariGetir(
  limit = 100,
): Promise<EngellenenKullanici[]> {
  const { data, error } = await supabase.rpc('engellenen_kullanicilar_listesi', {
    p_limit: limit,
  });
  if (error) throw error;
  return (data as EngellenenKullanici[]) ?? [];
}

export async function KullanicilarEngelliMi(
  otherUserId: string,
): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid || !otherUserId) return false;
  const { data, error } = await supabase.rpc('kullanicilar_engelli_mi', {
    p_a: uid,
    p_b: otherUserId,
  });
  if (error) return false;
  return !!data;
}

/** Apple / Google standart rapor sebepleri */
const BILDIRME_SEBEP_ANAHTAR: Record<string, CeviriAnahtari> = {
  spam: 'moderasyon.sebepSpam',
  harassment: 'moderasyon.sebepHarassment',
  hate: 'moderasyon.sebepHate',
  sexual: 'moderasyon.sebepSexual',
  child_safety: 'moderasyon.sebepChildSafety',
  violence: 'moderasyon.sebepViolence',
  impersonation: 'moderasyon.sebepImpersonation',
  other: 'moderasyon.sebepOther',
};

export const BILDIRME_SEBEPLERI = [
  { id: 'spam' },
  { id: 'harassment' },
  { id: 'hate' },
  { id: 'sexual' },
  { id: 'child_safety' },
  { id: 'violence' },
  { id: 'impersonation' },
  { id: 'other' },
] as const;

export function BildirmeSebebiEtiketi(id: string): string {
  const key = BILDIRME_SEBEP_ANAHTAR[id];
  return key ? (i18n.t(key) as string) : id;
}

/** Rapor başarı alert / kart notu — 24 saat SLA */
export function RaporAlindiMesaj(): string {
  return i18n.t('guvenlik.raporAlindiMesaj') as string;
}

export function RaporAlindiMesajEngelle(): string {
  return i18n.t('guvenlik.raporAlindiEngelleMesaj') as string;
}

export function RaporAlindiMesajCocuk(): string {
  return i18n.t('guvenlik.raporAlindiCocukMesaj') as string;
}

export function RaporDurumKartNotuAcik(): string {
  return i18n.t('guvenlik.raporAlindiMesaj') as string;
}
