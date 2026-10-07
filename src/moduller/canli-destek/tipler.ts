export const DESTEK_TEMSILCI_ALIAS = 'Toprak';
/** Mesaj yoksa oturum kapanma suresi (ms) */
export const DESTEK_IDLE_MS = 30 * 60 * 1000;

export type DestekOturumDurum =
  | 'waiting'
  | 'active'
  | 'closed'
  | 'idle_closed';

export type DestekOturum = {
  id: string;
  user_id: string;
  agent_id: string | null;
  status: DestekOturumDurum;
  opened_at: string;
  last_activity_at: string;
  closed_at: string | null;
  close_reason: string | null;
};

export type DestekMesaj = {
  id: string;
  session_id: string;
  sender_id: string | null;
  sender_role: 'user' | 'agent' | 'system';
  body: string;
  kaynak?: 'web' | 'uygulama' | null;
  created_at: string;
};

export type DestekOturumPaket = {
  session: DestekOturum;
  messages: DestekMesaj[];
  agent_alias: string;
};

export type DestekTemsilci = {
  user_id: string;
  is_active: boolean;
  alias: string;
  created_at: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export type DestekOturumListeSatiri = {
  id: string;
  user_id: string;
  agent_id: string | null;
  status: DestekOturumDurum;
  opened_at: string;
  last_activity_at: string;
  closed_at: string | null;
  close_reason: string | null;
  kullanici: {
    display_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  } | null;
  temsilci: {
    display_name?: string | null;
    username?: string | null;
  } | null;
  mesaj_sayisi: number;
};
