import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import type { CeviriAnahtari } from '../../../i18n/useCeviri';
import { AjansGorusmeAnalitik } from '../analitik/AjansGorusmeAnalitik';
import type {
  AjansGorusmeAdminSatir,
  AjansGorusmeDavet,
  AjansGorusmeDetay,
  AjansGorusmeGizlilik,
  AjansGorusmeKart,
  AjansGorusmeKatilimci,
  AjansGorusmeMedya,
  AjansGorusmeMesaj,
  AjansGorusmeOdaTipi,
  AjansGorusmeOzet,
} from '../tipler';

function hataAnahtari(message: string): CeviriAnahtari {
  const m = message.toUpperCase();
  if (m.includes('NOT_VERIFIED')) return 'ajans.gorusmeDogrulanmamis';
  if (m.includes('PLATFORM_ACCOUNT_MISSING')) return 'ajans.gorusmeResmiYok';
  if (m.includes('INVITE_EXPIRED')) return 'ajans.gorusmeDavetDoldu';
  if (m.includes('CAPACITY')) return 'ajans.gorusmeKapasite';
  if (m.includes('BLOCKED')) return 'ajans.gorusmeEngelli';
  if (m.includes('BANNED') || m.includes('AGE')) return 'ajans.gorusmeErisim';
  if (m.includes('LOCKED')) return 'ajans.gorusmeKilitli';
  if (m.includes('NOT_STARTED')) return 'ajans.gorusmeYaklasan';
  if (m.includes('ENDED')) return 'ajans.gorusmeBitti';
  if (m.includes('NOT_FOUND')) return 'ajans.gorusmeHataYok';
  if (m.includes('DISABLED') || m.includes('SCHEMA CACHE') || m.includes('COULD NOT FIND')) {
    return 'ajans.gorusmeKapali';
  }
  if (m.includes('ACCESS_DENIED')) return 'ajans.gorusmeErisim';
  if (m.includes('TITLE')) return 'ajans.gorusmeAdGerekli';
  return 'ajans.gorusmeVideoHata';
}

function rpcHata(error: { message?: string } | null): never {
  const msg = error?.message ?? '';
  throw new Error(i18n.t(hataAnahtari(msg)));
}

function dizi<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

export async function AjansGorusmeOzetGetir(
  agencyId: string,
): Promise<AjansGorusmeOzet> {
  const { data, error } = await supabase.rpc('agency_meeting_ozet', {
    p_agency_id: agencyId,
  });
  if (error) rpcHata(error);
  const d = (data ?? {}) as Partial<AjansGorusmeOzet>;
  return {
    today: Number(d.today ?? 0),
    live: Number(d.live ?? 0),
    pending_invites: Number(d.pending_invites ?? 0),
    upcoming: Number(d.upcoming ?? 0),
  };
}

export async function AjansGorusmeListeGetir(
  agencyId: string,
  bucket: 'live' | 'upcoming' | 'past' | 'today' | 'all',
): Promise<AjansGorusmeKart[]> {
  const { data, error } = await supabase.rpc('agency_meeting_liste', {
    p_agency_id: agencyId,
    p_bucket: bucket,
    p_before: null,
    p_limit: 30,
  });
  if (error) rpcHata(error);
  return dizi<AjansGorusmeKart>(data);
}

export async function AjansGorusmeDetayGetir(
  meetingId: string,
): Promise<AjansGorusmeDetay> {
  const { data, error } = await supabase.rpc('agency_meeting_detay', {
    p_meeting_id: meetingId,
  });
  if (error) rpcHata(error);
  return data as AjansGorusmeDetay;
}

export async function AjansGorusmeKatilimcilariGetir(
  meetingId: string,
): Promise<AjansGorusmeKatilimci[]> {
  const { data, error } = await supabase.rpc('agency_meeting_katilimcilar', {
    p_meeting_id: meetingId,
  });
  if (error) rpcHata(error);
  return dizi<AjansGorusmeKatilimci>(data);
}

export async function AjansGorusmeMesajlariGetir(
  meetingId: string,
): Promise<AjansGorusmeMesaj[]> {
  const { data, error } = await supabase.rpc('agency_meeting_mesajlar', {
    p_meeting_id: meetingId,
    p_before: null,
    p_limit: 60,
  });
  if (error) rpcHata(error);
  return dizi<AjansGorusmeMesaj>(data);
}

export async function AjansGorusmeDavetlerimGetir(): Promise<AjansGorusmeDavet[]> {
  const { data, error } = await supabase.rpc('agency_meeting_davetlerim', {
    p_limit: 30,
  });
  if (error) rpcHata(error);
  return dizi<AjansGorusmeDavet>(data);
}

export async function AjansGorusmeBenResmiMiyim(): Promise<boolean> {
  const { data, error } = await supabase.rpc('agency_meeting_ben_resmi_miyim');
  if (error) return false;
  return data === true;
}

export async function AjansGorusmeOlustur(input: {
  agencyId: string | null;
  title: string;
  description: string;
  roomType: AjansGorusmeOdaTipi;
  mediaType: AjansGorusmeMedya;
  visibility: AjansGorusmeGizlilik;
  scheduledAt: string | null;
  durationMinutes: number;
  maxParticipants: number;
  usernames: string[];
  inviteOfficial: boolean;
}): Promise<AjansGorusmeDetay> {
  const { data, error } = await supabase.rpc('agency_meeting_olustur', {
    p_agency_id: input.agencyId,
    p_title: input.title,
    p_description: input.description,
    p_room_type: input.roomType,
    p_media_type: input.mediaType,
    p_visibility: input.visibility,
    p_scheduled_at: input.scheduledAt,
    p_duration_minutes: input.durationMinutes,
    p_max_participants: input.maxParticipants,
    p_invite_usernames: input.usernames,
    p_invite_official: input.inviteOfficial,
  });
  if (error) rpcHata(error);
  AjansGorusmeAnalitik('agency_meeting_created', {
    room_type: input.roomType,
    media_type: input.mediaType,
  });
  AjansGorusmeAnalitik('agency_room_created', { room_type: input.roomType });
  if (input.usernames.length) {
    AjansGorusmeAnalitik('agency_invitation_sent', {
      count: input.usernames.length,
    });
  }
  return data as AjansGorusmeDetay;
}

export async function AjansGorusmeDavetYanit(
  invitationId: string,
  accept: boolean,
): Promise<AjansGorusmeDetay> {
  const { data, error } = await supabase.rpc('agency_meeting_davet_yanit', {
    p_invitation_id: invitationId,
    p_accept: accept,
  });
  if (error) rpcHata(error);
  AjansGorusmeAnalitik(
    accept ? 'agency_invitation_accepted' : 'agency_invitation_declined',
  );
  return data as AjansGorusmeDetay;
}

export async function AjansGorusmeKatil(
  meetingId: string,
  inviteToken?: string | null,
): Promise<AjansGorusmeDetay> {
  const { data, error } = await supabase.rpc('agency_meeting_katil', {
    p_meeting_id: meetingId,
    p_invite_token: inviteToken ?? null,
  });
  if (error) rpcHata(error);
  const detay = data as AjansGorusmeDetay;
  AjansGorusmeAnalitik('agency_meeting_joined', {
    room_type: detay.room_type,
  });
  if (detay.status === 'live') {
    AjansGorusmeAnalitik('agency_meeting_started', { room_type: detay.room_type });
  }
  if (detay.room_type === 'creator_interview' && detay.status === 'live') {
    AjansGorusmeAnalitik('agency_recruitment_meeting_started');
  }
  if (detay.my_role === 'platform') {
    AjansGorusmeAnalitik('tamuso_official_meeting_joined');
  }
  return detay;
}

export async function AjansGorusmeAyril(meetingId: string): Promise<void> {
  const { error } = await supabase.rpc('agency_meeting_ayril', {
    p_meeting_id: meetingId,
  });
  if (error) rpcHata(error);
}

export async function AjansGorusmeBitir(
  meetingId: string,
): Promise<AjansGorusmeDetay> {
  const { data, error } = await supabase.rpc('agency_meeting_bitir', {
    p_meeting_id: meetingId,
  });
  if (error) rpcHata(error);
  AjansGorusmeAnalitik('agency_meeting_ended');
  return data as AjansGorusmeDetay;
}

export async function AjansGorusmeIptal(
  meetingId: string,
): Promise<AjansGorusmeDetay> {
  const { data, error } = await supabase.rpc('agency_meeting_iptal', {
    p_meeting_id: meetingId,
  });
  if (error) rpcHata(error);
  return data as AjansGorusmeDetay;
}

export async function AjansGorusmeYenidenPlanla(
  meetingId: string,
  scheduledAt: string,
): Promise<AjansGorusmeDetay> {
  const { data, error } = await supabase.rpc('agency_meeting_yeniden_planla', {
    p_meeting_id: meetingId,
    p_scheduled_at: scheduledAt,
  });
  if (error) rpcHata(error);
  return data as AjansGorusmeDetay;
}

export async function AjansGorusmeKilitle(
  meetingId: string,
  lock: boolean,
): Promise<AjansGorusmeDetay> {
  const { data, error } = await supabase.rpc('agency_meeting_kilitle', {
    p_meeting_id: meetingId,
    p_lock: lock,
  });
  if (error) rpcHata(error);
  return data as AjansGorusmeDetay;
}

export async function AjansGorusmeRolAta(
  meetingId: string,
  userId: string,
  role: 'co_host' | 'speaker' | 'listener',
): Promise<void> {
  const { error } = await supabase.rpc('agency_meeting_rol_ata', {
    p_meeting_id: meetingId,
    p_user_id: userId,
    p_role: role,
  });
  if (error) rpcHata(error);
}

export async function AjansGorusmeMedyaKapat(
  meetingId: string,
  userId: string,
  mic: boolean,
  camera: boolean,
): Promise<void> {
  const { error } = await supabase.rpc('agency_meeting_medya_kapat', {
    p_meeting_id: meetingId,
    p_user_id: userId,
    p_mic: mic,
    p_camera: camera,
  });
  if (error) rpcHata(error);
}

export async function AjansGorusmeCikar(
  meetingId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase.rpc('agency_meeting_cikar', {
    p_meeting_id: meetingId,
    p_user_id: userId,
  });
  if (error) rpcHata(error);
}

export async function AjansGorusmeSozIste(
  meetingId: string,
  raise: boolean,
): Promise<void> {
  const { error } = await supabase.rpc('agency_meeting_soz_iste', {
    p_meeting_id: meetingId,
    p_raise: raise,
  });
  if (error) rpcHata(error);
}

export async function AjansGorusmeMesajGonder(
  meetingId: string,
  body: string,
  kind: 'text' | 'emoji' = 'text',
): Promise<void> {
  const { error } = await supabase.rpc('agency_meeting_mesaj_gonder', {
    p_meeting_id: meetingId,
    p_body: body,
    p_kind: kind,
  });
  if (error) rpcHata(error);
  AjansGorusmeAnalitik('agency_room_message_sent');
}

export async function AjansGorusmeSonucKaydet(
  meetingId: string,
  outcome: 'evaluating' | 'accepted' | 'rejected' | 'follow_up',
): Promise<AjansGorusmeDetay> {
  const { data, error } = await supabase.rpc('agency_meeting_sonuc_kaydet', {
    p_meeting_id: meetingId,
    p_outcome: outcome,
  });
  if (error) rpcHata(error);
  return data as AjansGorusmeDetay;
}

export async function AjansGorusmeAdminListe(): Promise<AjansGorusmeAdminSatir[]> {
  const { data, error } = await supabase.rpc('admin_agency_meeting_liste', {
    p_limit: 40,
  });
  if (error) rpcHata(error);
  return dizi<AjansGorusmeAdminSatir>(data);
}

export async function AjansGorusmeForceEnd(
  meetingId: string,
  reason: string,
): Promise<void> {
  const { error } = await supabase.rpc('admin_agency_meeting_force_end', {
    p_meeting_id: meetingId,
    p_reason: reason,
  });
  if (error) rpcHata(error);
}

export async function AjansGorusmeCanliYetkiUygula(
  roomName: string,
  identity: string,
): Promise<void> {
  const { OrtamDegiskenleri } = await import('../../../yapilandirma/OrtamDegiskenleri');
  const edgeUrl =
    OrtamDegiskenleri.livekitTokenUrl ||
    process.env.EXPO_PUBLIC_LIVEKIT_TOKEN_URL ||
    '';
  if (!edgeUrl) return;
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  if (!jwt) return;
  await fetch(edgeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
      apikey: OrtamDegiskenleri.supabaseAnonAnahtari,
    },
    body: JSON.stringify({
      action: 'agency-sync',
      roomName,
      identity,
    }),
  }).catch(() => undefined);
}
