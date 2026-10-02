export type Gender = 'female' | 'male' | 'other' | 'prefer_not';
export type RoomMode = 'party' | 'dating' | 'karaoke' | 'game' | 'private';
export type GiftRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type Profile = {
  id: string;
  public_user_id?: string | null;
  username: string | null;
  display_name: string | null;
  bio: string;
  avatar_url: string | null;
  cover_url?: string | null;
  phone_e164?: string | null;
  gender: Gender | null;
  birth_date: string | null;
  /** Kayıt formu özel alan cevapları (admin tanımlı) */
  custom_fields?: Record<string, string> | null;
  country: string | null;
  country_code?: string | null;
  region_id?: string | null;
  language: string;
  is_host: boolean;
  is_guest?: boolean;
  is_admin?: boolean;
  is_verified: boolean;
  level: number;
  xp: number;
  primary_city_id?: string | null;
  created_at: string;
  banned_at?: string | null;
  ban_reason?: string | null;
  deleted_at?: string | null;
  deletion_requested_at?: string | null;
  /** Tek seferlik çocuk koruma kartı: approved | declined */
  child_protection_consent_status?: 'approved' | 'declined' | null;
  child_protection_consent_at?: string | null;
  /** Kullanıcının seçtiği dinamik ünvan (görünen id sunucuda çözülür) */
  selected_title_id?: string | null;
};

export type Wallet = {
  user_id: string;
  coins: number;
  diamonds: number;
  updated_at: string;
};

export type Room = {
  id: string;
  /** Kısa benzersiz oda kimliği — örn. ODA-A3K7M2 */
  room_code?: string | null;
  host_id: string;
  title: string;
  topic: string | null;
  cover_url: string | null;
  mode: RoomMode;
  max_seats: number;
  is_live: boolean;
  is_locked: boolean;
  listener_count: number;
  total_coins_earned: number;
  created_at: string;
  host?: Profile | null;
  layout_code?: string | null;
  theme_code?: string | null;
  capacity_tier_code?: string | null;
  audience_capacity?: number | null;
  microphone_capacity?: number | null;
  livekit_room_name?: string | null;
};

export type Gift = {
  id: string;
  code: string;
  name: string;
  emoji: string;
  coin_cost: number;
  diamond_value: number;
  rarity: GiftRarity;
  animation: string;
  slug?: string | null;
  category_code?: string | null;
  thumbnail_url?: string | null;
  animation_url?: string | null;
  animation_type?: string | null;
  duration_ms?: number | null;
  full_screen?: boolean | null;
  global_announcement?: boolean | null;
  combo_enabled?: boolean | null;
  combo_timeout_ms?: number | null;
  sort_order?: number | null;
};

export type CoinPackage = {
  id: string;
  sku: string;
  title: string;
  coins: number;
  bonus_coins: number;
  price_usd: number;
  /** Referans TL — gerçek tahsilat StoreKit/Play'den */
  price_try?: number | null;
  badge: string | null;
  campaign_text?: string | null;
  sort_order?: number | null;
  apple_product_id?: string | null;
  google_product_id?: string | null;
  stripe_price_id?: string | null;
  /** StoreKit / Play localized price string */
  store_display_price?: string | null;
  store_price_amount?: number | null;
  store_currency?: string | null;
};

export type RoomSeat = {
  id: string;
  room_id: string;
  seat_index: number;
  user_id: string | null;
  is_muted: boolean;
  is_locked: boolean;
  /** Owner/admin: kullanıcı kendi mikrofonunu açamaz (koltuktan çıkmayı engellemez) */
  is_mic_locked?: boolean;
  profile?: Profile | null;
  /** room_members.role — host/cohost rozeti için */
  member_role?: 'host' | 'cohost' | 'speaker' | 'listener' | null;
  is_cohost?: boolean;
};
