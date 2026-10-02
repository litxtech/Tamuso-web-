import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import { OzellikBayragiAktifMiSunucu } from '../../ozellik-bayraklari/okuma/OzellikBayragiAktifMiSunucu';
import { PushWorkerTetikle } from '../../bildirimler/kayit/PushWorkerTetikle';
import type { DirektMesaj, MesajMediaMeta } from '../okuma/MesajlariGetir';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type MesajGonderGirdi = {
  threadId: string;
  body?: string;
  messageType?: 'text' | 'image' | 'video' | 'voice' | 'music' | 'emoji' | 'gift';
  mediaUrl?: string | null;
  clientId?: string;
  replyToId?: string | null;
  musicTrackId?: string | null;
  viewOnce?: boolean;
  mediaMeta?: MesajMediaMeta | null;
};

export async function MesajGonder(
  input: MesajGonderGirdi,
): Promise<
  | { ok: true; mesaj: DirektMesaj }
  | { ok: false; hata: string }
> {
  if (!(await OzellikBayragiAktifMiSunucu('messages_enabled'))) {
    return { ok: false, hata: i18n.t('durumX.mesajlasmaKapali') };
  }

  const clientId =
    input.clientId && UUID_RE.test(input.clientId) ? input.clientId : null;

  const { data, error } = await supabase.rpc('mesaj_gonder', {
    p_thread_id: input.threadId,
    p_body: input.body ?? '',
    p_message_type: input.messageType ?? 'text',
    p_media_url: input.mediaUrl ?? null,
    p_client_id: clientId,
    p_reply_to_id: input.replyToId ?? null,
    p_music_track_id: input.musicTrackId ?? null,
    p_view_once: input.viewOnce ?? false,
    p_media_meta: input.mediaMeta ?? null,
  });

  if (error) return { ok: false, hata: error.message };
  PushWorkerTetikle(30);
  return { ok: true, mesaj: data as DirektMesaj };
}

export async function MesajDosyaGonder(input: {
  threadId: string;
  mediaUrl: string;
  body?: string;
  fileName?: string;
  mime?: string;
  clientId?: string;
  mediaMeta?: MesajMediaMeta | null;
}): Promise<
  | { ok: true; mesaj: DirektMesaj }
  | { ok: false; hata: string }
> {
  if (!(await OzellikBayragiAktifMiSunucu('messages_enabled'))) {
    return { ok: false, hata: i18n.t('durumX.mesajlasmaKapali') };
  }
  const clientId =
    input.clientId && UUID_RE.test(input.clientId) ? input.clientId : null;
  const { data, error } = await supabase.rpc('mesaj_dosya_gonder', {
    p_thread_id: input.threadId,
    p_media_url: input.mediaUrl,
    p_body: input.body ?? '',
    p_file_name: input.fileName ?? 'dosya.pdf',
    p_mime: input.mime ?? 'application/pdf',
    p_client_id: clientId,
    p_media_meta: input.mediaMeta ?? {},
  });
  if (error) return { ok: false, hata: error.message };
  PushWorkerTetikle(30);
  return { ok: true, mesaj: data as DirektMesaj };
}

export async function OzelSohbetAcVeyaGetir(
  otherUserId: string,
): Promise<{ ok: true; threadId: string } | { ok: false; hata: string }> {
  const { data, error } = await supabase.rpc('ozel_sohbet_ac_veya_getir', {
    p_other_user_id: otherUserId,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true, threadId: data as string };
}

/** Ajans adına sohbet — karşı tarafta ajans adı görünür (sahip adı değil) */
export async function AjansSohbetAcVeyaGetir(
  agencyId: string,
): Promise<{ ok: true; threadId: string } | { ok: false; hata: string }> {
  const { data, error } = await supabase.rpc('ajans_sohbet_ac_veya_getir', {
    p_agency_id: agencyId,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true, threadId: data as string };
}

export async function MesajThreadOkundu(threadId: string): Promise<void> {
  await supabase.rpc('mesaj_thread_okundu', { p_thread_id: threadId });
}

/** Karsi tarafin last_read_at — gonderenin "goruldu" tikleri */
export async function MesajPeerLastReadGet(
  threadId: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc('mesaj_peer_last_read_get', {
    p_thread_id: threadId,
  });
  if (error) return null;
  return (data as string | null) ?? null;
}

export async function MesajThreadArsivle(
  threadId: string,
  arsiv = true,
): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('mesaj_thread_arsivle', {
    p_thread_id: threadId,
    p_arsiv: arsiv,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

/** Sohbeti benden tamamen sil (liste + gecmis). Karsi tarafi etkilemez. */
export async function MesajSohbetSil(
  threadId: string,
): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('mesaj_sohbet_sil', {
    p_thread_id: threadId,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

export async function MesajSil(
  messageId: string,
  kapsam: 'me' | 'everyone' = 'me',
): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('mesaj_sil', {
    p_message_id: messageId,
    p_kapsam: kapsam,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}
