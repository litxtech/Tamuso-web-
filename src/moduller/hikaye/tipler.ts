/** Tamuso Hikaye (Stories) — sunucu sözleşmesi tipleri */

export type HikayeMedyaTuru = 'image' | 'video' | 'text';

export type HikayeGorunurluk = 'public' | 'followers' | 'close_friends';

export type HikayeOverlayTuru =
  | 'text'
  | 'mention'
  | 'hashtag'
  | 'location'
  | 'link'
  | 'sticker'
  | 'music'
  | 'poll'
  | 'countdown'
  | 'shared_post'
  | 'shared_profile'
  | 'shared_room'
  | 'shared_live'
  | 'shared_agency';

export type HikayeOverlay = {
  type: HikayeOverlayTuru;
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  text?: string;
  color?: string;
  ref_id?: string;
  url?: string;
  meta?: Record<string, unknown>;
};

/** Tepsi satırı — bir kullanıcının aktif hikaye grubu özeti */
export type HikayeTepsiOgesi = {
  user_id: string;
  story_id?: string | null;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  /** Son hikaye önizlemesi — tepsi/profil halkasında gösterilir */
  preview_url?: string | null;
  is_mine: boolean;
  has_unseen: boolean;
  item_count: number;
  latest_at: string | null;
};

export type HikayeOgesi = {
  id: string;
  story_id: string;
  user_id: string;
  media_type: HikayeMedyaTuru;
  media_url: string | null;
  thumbnail_url?: string | null;
  duration_ms: number;
  caption: string | null;
  background_color: string | null;
  text_style: Record<string, unknown> | null;
  overlays: HikayeOverlay[] | null;
  attachment?: Record<string, unknown> | null;
  visibility: HikayeGorunurluk;
  created_at: string;
  expires_at: string;
  /** Sunucu sayacı — client uydurmaz */
  view_count: number;
  my_reaction: string | null;
  is_seen: boolean;
};

export type HikayeGrup = {
  user_id: string;
  story_id?: string | null;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  is_mine: boolean;
  expires_at?: string | null;
  view_count?: number;
  items: HikayeOgesi[];
};

export type HikayeGoruntuleyen = {
  user_id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  viewed_at: string;
  reaction: string | null;
};

export type HikayeSessizOge = {
  user_id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  muted_at: string;
};

export type HikayeYakinArkadas = {
  user_id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
};

export type HikayeArsivOgesi = {
  id: string;
  story_id: string;
  media_type: HikayeMedyaTuru;
  media_url: string | null;
  caption: string | null;
  background_color: string | null;
  created_at: string;
  expires_at: string | null;
  view_count: number;
  item_count?: number;
};

export type HikayeDeeplinkSonuc = {
  user_id: string;
  item_id?: string | null;
  story_id?: string | null;
  deep_link?: string | null;
};

export type HikayeOlusturGirdi = {
  mediaType: HikayeMedyaTuru;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  caption?: string | null;
  durationMs?: number | null;
  backgroundColor?: string | null;
  textStyle?: Record<string, unknown> | null;
  overlays?: HikayeOverlay[] | null;
  attachment?: Record<string, unknown> | null;
  visibility?: HikayeGorunurluk;
  excludedUserIds?: string[] | null;
  idempotencyKey?: string | null;
};

export type HikayeIslemSonuc<T = void> =
  | { ok: true; data: T }
  | { ok: false; hata: string };

export type HikayePaylasKaynak =
  | {
      tur: 'status_post';
      id: string;
      previewUrl?: string | null;
      caption?: string | null;
    }
  | {
      tur: 'profile';
      userId: string;
      displayName?: string | null;
      avatarUrl?: string | null;
    }
  | {
      tur: 'room';
      roomId: string;
      title?: string | null;
      coverUrl?: string | null;
    }
  | {
      tur: 'live';
      sessionId: string;
      title?: string | null;
      coverUrl?: string | null;
    }
  | {
      tur: 'agency';
      agencyId: string;
      name?: string | null;
      logoUrl?: string | null;
    };
