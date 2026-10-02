export type AdminPlatformOzeti = {
  kullanici: {
    toplam: number;
    banli: number;
    misafir: number;
    host: number;
    son_24s: number;
  };
  canli: {
    odalar: number;
    yayinlar: number;
    pk: number;
  };
  finans: {
    toplam_yukleme_coin: number;
    yukleme_adet: number;
    bekleyen_cekim: number;
    bekleyen_cekim_elmas: number;
    son_24s_yukleme_coin: number;
  };
  sosyal: {
    acik_rapor: number;
    aktif_ihtar: number;
    push_kuyruk: number;
    hediye_24s: number;
  };
  bayrak: {
    kapali_ozellik: number;
    aktif_kill: number;
  };
};

export type AdminHarcayan = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  public_user_id: string | null;
  toplam_coin: number;
  islem_adet: number;
  son_yukleme: string | null;
};

export type AdminCekim = {
  id: string;
  requester_type: string;
  user_id: string | null;
  agency_id: string | null;
  diamonds: number;
  amount_usd: number | null;
  method: string;
  details: Record<string, unknown> | null;
  status: string;
  created_at: string;
  processed_at: string | null;
};

export type AdminRapor = {
  id: string;
  reporter_id: string;
  target_user_id: string | null;
  room_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  content_type?: string | null;
  content_id?: string | null;
  context?: Record<string, unknown> | null;
  admin_note?: string | null;
  reporter_note?: string | null;
  ozet?: string | null;
  sla_due_at?: string | null;
  priority?: 'normal' | 'high' | 'critical' | string | null;
  reporter?: AdminRaporKisi | null;
  target?: AdminRaporKisi | null;
  room?: { id: string; title: string | null; mode?: string; is_live?: boolean } | null;
};

export type AdminRaporKisi = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url?: string | null;
  public_user_id?: string | null;
  banned_at?: string | null;
  deleted_at?: string | null;
  ban_reason?: string | null;
  is_guest?: boolean;
  level?: number;
};

export type AdminRaporDetay = {
  rapor: AdminRapor;
  reporter: AdminRaporKisi | null;
  target: AdminRaporKisi | null;
  room: {
    id: string;
    title: string | null;
    mode?: string;
    is_live?: boolean;
    host_id?: string;
    listener_count?: number;
    cover_url?: string | null;
    topic?: string | null;
    room_code?: string | null;
  } | null;
  live_session?: {
    id: string;
    title: string | null;
    mode?: string | null;
    is_live?: boolean;
    host_id?: string;
    viewer_count?: number | null;
    like_count?: number | null;
    gift_count?: number | null;
    started_at?: string | null;
    ended_at?: string | null;
  } | null;
  konusmacilar?: Array<{
    user_id: string;
    seat_index: number;
    is_muted?: boolean;
    is_mic_locked?: boolean;
    display_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
    role?: string | null;
  }>;
  uyeler?: Array<{
    user_id: string;
    role: string;
    display_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  }>;
  son_sohbet?: Array<{
    id: string;
    body: string | null;
    user_id: string;
    display_name?: string | null;
    created_at: string;
    removed_at?: string | null;
  }>;
  href?: string | null;
  icerik: {
    canli: Record<string, unknown> | null;
    snapshot: Record<string, unknown> | null;
    metin: string | null;
    media_url: string | null;
    kaldirildi: boolean;
    tur: string;
  };
  hedef_ihtarlar: Array<{
    id: string;
    reason: string;
    severity: string;
    created_at: string;
    cleared_at: string | null;
  }>;
};

export type AdminCanliOda = {
  id: string;
  title: string;
  mode: string;
  listener_count: number;
  host_id: string;
  host_name: string;
  host_username?: string | null;
  created_at: string;
};

export type AdminCanliYayin = {
  id: string;
  title: string;
  mode: string;
  viewer_count: number;
  host_id: string;
  host_name: string;
  host_username?: string | null;
  started_at: string;
};

export type AdminBayrak = {
  key: string;
  enabled: boolean;
  description: string | null;
};

export type AdminKill = {
  key: string;
  active: boolean;
  reason: string | null;
};

export type AdminPaket = {
  id: string;
  sku: string;
  title: string;
  coins: number;
  bonus_coins: number;
  price_usd: number;
  price_try?: number | null;
  is_active: boolean;
  badge: string | null;
  campaign_text?: string | null;
  sort_order?: number | null;
  apple_product_id?: string | null;
  google_product_id?: string | null;
};

export type AdminHediye = {
  id: string;
  code: string;
  name: string;
  emoji: string;
  coin_cost: number;
  diamond_value: number;
  rarity: string;
  is_active: boolean;
  sort_order?: number | null;
  platform_coins?: number | null;
};

/** Küresel ekonomi dial'ları (platform_economy_config) */
export type PlatformEkonomiConfig = {
  coin_try: number;
  diamond_try: number;
  gift_host_share: number;
  default_agency_share: number;
  iap_store_fee_estimate: number;
  updated_at?: string | null;
};

/** Ajans bazlı hediye komisyon dağılımı */
export type AjansKomisyonOrani = {
  agency_id: string;
  name: string;
  agency_public_id?: string | null;
  logo_url?: string | null;
  owner_id?: string | null;
  agency_share: number;
  host_share: number;
  platform_share: number;
  updated_at?: string | null;
};

export type EkonomiSimulasyon = {
  brut_try: number;
  store_fee_try: number;
  platform_iap_net_try: number;
  approx_coins: number;
  if_all_gifted: {
    host_diamonds_gross: number;
    agency_diamonds: number;
    host_diamonds_net: number;
    platform_gift_coins: number;
    host_cashout_try: number;
    agency_cashout_try: number;
    platform_gift_face_try: number;
    platform_net_after_cashout_try: number;
  };
  rates?: PlatformEkonomiConfig;
};
