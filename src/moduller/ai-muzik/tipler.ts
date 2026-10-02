export type AiMuzikBakiye = {
  available_seconds: number;
  reserved_seconds: number;
  lifetime_granted_seconds: number;
  lifetime_purchased_seconds: number;
  lifetime_welcome_seconds: number;
  lifetime_consumed_seconds: number;
};

export type AiMuzikConfig = {
  enabled: boolean;
  welcome_seconds: number;
  min_track_seconds: number;
  max_track_seconds: number;
  max_concurrent_per_user: number;
  daily_generation_limit: number;
  prompt_max_length: number;
  lyrics_max_length: number;
  reference_upload_enabled: boolean;
  status_sharing_enabled: boolean;
  voice_room_usage_enabled: boolean;
  device_export_enabled: boolean;
  model_id: string | null;
  rights_policy_version: string;
  terms_version: string;
};

export type AiMuzikProduct = {
  id: string;
  product_id: string;
  display_name: string;
  description?: string | null;
  seconds_granted: number;
  bonus_seconds: number;
  price_try?: number | null;
  price_usd?: number | null;
  stripe_price_id?: string | null;
  apple_product_id: string | null;
  google_product_id: string | null;
  badge: string | null;
  sort_order: number;
};

export type SatinAlmaGecmisSatir = {
  id: string;
  kind: 'coin' | 'ai_music' | string;
  title: string;
  detail: string;
  quantity: number;
  unit: string;
  amount_try: number | null;
  amount_usd: number | null;
  channel: string | null;
  store: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  meta?: Record<string, unknown>;
  dispute?: {
    id: string;
    status: 'pending' | 'approved' | 'rejected' | string;
    reason_code: string;
    user_note: string | null;
    admin_note: string | null;
    resolution_note: string | null;
    created_at: string;
    reviewed_at: string | null;
  } | null;
};

export type AiMuzikGenre = {
  code: string;
  name: string;
  aliases?: string[];
  is_featured?: boolean;
};

export type AiMuzikTrackOzet = {
  id: string;
  title: string;
  cover_url: string | null;
  cover_thumb_url: string | null;
  duration_ms: number | null;
  status: string;
  genre_code: string | null;
  mood: string | null;
  public_track_code: string | null;
  created_at: string;
  moderation_status: string;
  is_instrumental: boolean | null;
  is_favorite: boolean;
  in_user_library?: boolean;
};

export type AiMuzikTrackRow = {
  id: string;
  title: string;
  cover_url: string | null;
  cover_thumb_url: string | null;
  audio_url: string | null;
  duration_ms: number | null;
  status: string;
  genre_code: string | null;
  mood: string | null;
  language_code: string | null;
  is_instrumental: boolean | null;
  public_track_code: string | null;
  owner_user_id: string | null;
  prompt_hash: string | null;
  lyrics_hash: string | null;
  master_audio_sha256: string | null;
  created_at: string;
  moderation_status: string;
  soft_deleted_at: string | null;
  in_user_library?: boolean;
  last_user_prompt?: string | null;
};

export type AiMuzikPassport = {
  id: string;
  track_id: string;
  public_track_code: string;
  creator_user_id: string;
  creator_public_handle_snapshot: string | null;
  created_at: string;
  published_at: string | null;
  ai_provider: string;
  ai_model: string | null;
  prompt_hash: string | null;
  lyrics_hash: string | null;
  master_audio_sha256: string | null;
  duration_ms: number | null;
  version: number;
  terms_version: string | null;
  rights_declaration_version: string | null;
  metadata: Record<string, unknown>;
};

export type AiMuzikTrackDetay = {
  track: AiMuzikTrackRow;
  creator: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  passport: AiMuzikPassport | null;
  versions: Array<Record<string, unknown>>;
  is_favorite: boolean;
  in_user_library?: boolean;
  last_user_prompt?: string | null;
};

export type AiMuzikLedgerSatir = {
  id: string;
  type: string;
  seconds_delta: number;
  source: string | null;
  product_id: string | null;
  description: string | null;
  created_at: string;
};

export type AiMuzikRoomLibraryItem = {
  id: string;
  title: string;
  artist_name: string | null;
  cover_url: string | null;
  audio_url: string | null;
  duration_ms: number | null;
  category_id: string | null;
  tags: string[];
  is_featured: boolean;
  sort_order: number;
  is_favorite: boolean;
};

export type AiMuzikLyricsMode = 'ai' | 'user' | 'instrumental';

export type AiMuzikSes = 'female' | 'male' | 'choir';

export type AiMuzikOlusturIstek = {
  prompt: string;
  duration_seconds: number;
  genre_code?: string | null;
  mood?: string | null;
  tempo?: string | null;
  bpm?: number | null;
  language_code?: string | null;
  instruments?: string[] | null;
  structure_hint?: string | null;
  lyrics_mode?: AiMuzikLyricsMode;
  lyrics?: string | null;
  voice_gender?: AiMuzikSes | null;
  idempotency_key: string;
  /** Mevcut parçayı yeni talimatla güncelle */
  revise_track_id?: string | null;
  /** ai-music-temp storage path — benzer şarkı referansı */
  reference_storage_path?: string | null;
};

export type AiMuzikOlusturSonuc =
  | {
      ok: true;
      job_id?: string;
      track_id?: string | null;
      status?: string;
      title?: string;
      public_track_code?: string;
      idempotent?: boolean;
      correlation_id?: string;
    }
  | {
      ok: false;
      error?: string;
      message?: string;
      available_seconds?: number;
      job_id?: string;
      suggestion?: string;
    };

export type AiMuzikJobDurum = {
  id: string;
  status: string;
  track_id: string | null;
  error_code: string | null;
  error_message: string | null;
  requested_duration_seconds: number;
  created_at: string;
  finished_at: string | null;
};

export type AiMuzikAdminDashboard = {
  today_generations: number;
  today_success: number;
  today_failed: number;
  generated_seconds_today: number;
  active_users: number;
  purchases_today: number;
  granted_seconds: number;
  consumed_seconds: number;
  reserved_seconds: number;
  failure_rate: number;
};

export type AiMuzikTaste = {
  recent_genres: string[];
  recent_moods: string[];
  recent_tempos?: string[];
  recent_languages?: string[];
  recent_titles: Array<{ title?: string; track_id?: string; at?: string }>;
  last_prompt: string | null;
  last_settings: Record<string, unknown>;
  generation_count: number;
};

export type AiMuzikModeration = {
  create_blocked: boolean;
  library_blocked: boolean;
  warn_count: number;
  last_warn_message?: string | null;
  last_warn_at?: string | null;
  notes?: string | null;
};

export type AiMuzikAdminCreator = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  public_user_id: string | null;
  track_count: number;
  total_duration_ms: number;
  last_created_at: string | null;
  create_blocked: boolean;
  library_blocked: boolean;
  warn_count: number;
};

export type AiMuzikAdminBakiyeKullanici = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  public_user_id: string | null;
  available_seconds: number;
  reserved_seconds: number;
  lifetime_granted_seconds: number;
  lifetime_consumed_seconds: number;
  track_count: number;
};

export type AiMuzikAdminTrackSatir = {
  id: string;
  title: string;
  cover_url: string | null;
  audio_url: string | null;
  duration_ms: number | null;
  status: string;
  genre_code: string | null;
  mood: string | null;
  public_track_code: string | null;
  created_at: string;
  moderation_status: string;
  soft_deleted_at: string | null;
  last_user_prompt: string | null;
  job_id: string | null;
  job_prompt: string | null;
  prepared_prompt: string | null;
  requested_duration_seconds: number | null;
  lyrics_mode: string | null;
  lyrics_text: string | null;
  tempo: string | null;
  bpm: number | null;
  language_code: string | null;
  instruments: string[] | null;
  structure_hint: string | null;
  job_settings: Record<string, unknown> | null;
  force_instrumental: boolean | null;
};

export type DurumMuzikPayload = {
  track_id: string;
  version_id?: string | null;
  title: string;
  duration_ms: number | null;
  cover_url: string | null;
  audio_url: string | null;
  public_track_code: string | null;
};
