export type AjansGorusmeOdaTipi =
  | 'private_meeting'
  | 'creator_interview'
  | 'group_meeting'
  | 'agency_meeting'
  | 'announcement_room'
  | 'platform_meeting'
  | 'custom';

export type AjansGorusmeMedya = 'audio' | 'video' | 'audio_video';

export type AjansGorusmeGizlilik =
  | 'private'
  | 'agency_members'
  | 'invited'
  | 'link';

export type AjansGorusmeDurumu =
  | 'draft'
  | 'scheduled'
  | 'waiting'
  | 'live'
  | 'ended'
  | 'cancelled';

export type AjansOdaRolu = 'host' | 'co_host' | 'speaker' | 'listener' | 'platform';

export type AjansGorusmeOzet = {
  today: number;
  live: number;
  pending_invites: number;
  upcoming: number;
};

export type AjansGorusmeKart = {
  id: string;
  title: string;
  room_type: AjansGorusmeOdaTipi;
  media_type: AjansGorusmeMedya;
  visibility: AjansGorusmeGizlilik;
  status: AjansGorusmeDurumu;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number;
  max_participants: number;
  locked_at: string | null;
  recruitment_outcome: string | null;
  agency_name: string | null;
  is_verified: boolean | null;
  participant_count: number;
};

export type AjansGorusmeDetay = {
  id: string;
  agency_id: string | null;
  agency_name: string | null;
  agency_verified: boolean;
  agency_logo: string | null;
  title: string;
  description: string;
  room_type: AjansGorusmeOdaTipi;
  media_type: AjansGorusmeMedya;
  visibility: AjansGorusmeGizlilik;
  status: AjansGorusmeDurumu;
  scheduled_at: string | null;
  duration_minutes: number;
  started_at: string | null;
  ended_at: string | null;
  max_participants: number;
  locked: boolean;
  livekit_room_name: string;
  invite_token: string | null;
  recruitment_outcome: string | null;
  my_role: AjansOdaRolu | null;
  can_manage: boolean;
  participant_count: number;
};

export type AjansGorusmeKatilimci = {
  user_id: string;
  role: AjansOdaRolu;
  status: string;
  can_speak: boolean;
  can_video: boolean;
  hand_raised: boolean;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_platform_official: boolean;
};

export type AjansGorusmeMesaj = {
  id: string;
  sender_id: string | null;
  kind: 'text' | 'emoji' | 'system';
  body: string;
  created_at: string;
  display_name: string | null;
};

export type AjansGorusmeDavet = {
  invitation_id: string;
  status: string;
  expires_at: string | null;
  created_at: string;
  meeting_id: string;
  title: string;
  room_type: AjansGorusmeOdaTipi;
  meeting_status: AjansGorusmeDurumu;
  scheduled_at: string | null;
  duration_minutes: number;
  media_type: AjansGorusmeMedya;
  agency_name: string | null;
  is_verified: boolean | null;
};

export type AjansGorusmeAdminSatir = {
  id: string;
  title: string;
  status: AjansGorusmeDurumu;
  room_type: AjansGorusmeOdaTipi;
  started_at: string | null;
  scheduled_at: string | null;
  locked: boolean;
  agency_name: string | null;
  participant_count: number;
  host_name: string | null;
};
