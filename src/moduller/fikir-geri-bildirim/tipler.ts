import i18n from '../../i18n';

export type FikirDurum =
  | 'RECEIVED'
  | 'REVIEWING'
  | 'PLANNED'
  | 'IN_DEVELOPMENT'
  | 'COMPLETED'
  | 'NOT_PLANNED';

export type FikirKategori = {
  id: string;
  code: string;
  name: string;
  icon: string;
  sort_order?: number;
  is_active?: boolean;
  is_bug_form?: boolean;
};

export type FikirOzet = {
  id: string;
  title: string;
  status: FikirDurum;
  is_public?: boolean;
  is_featured?: boolean;
  vote_count: number;
  created_at: string;
  updated_at?: string;
  last_status_at?: string;
  category: Pick<FikirKategori, 'id' | 'code' | 'name' | 'icon'>;
  i_voted?: boolean;
  author_snapshot?: {
    display_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  } | null;
};

export type FikirZamanNoktasi = {
  id: string;
  from_status: string | null;
  to_status: FikirDurum;
  to_label: string;
  note?: string | null;
  created_at: string;
};

export type FikirAdminCevap = {
  id: string;
  body: string;
  created_at: string;
  team_badge?: boolean;
};

export type FikirOdul = {
  id: string;
  reward_type: 'coin' | 'badge';
  reward_value: string;
  reward_amount?: number | null;
  user_message?: string | null;
  admin_note?: string | null;
  status: string;
  created_at: string;
};

export type FikirDetay = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: FikirDurum;
  status_label: string;
  is_public: boolean;
  is_featured: boolean;
  is_archived: boolean;
  is_hidden: boolean;
  vote_count: number;
  bug_where?: string | null;
  bug_what?: string | null;
  bug_repro?: string | null;
  platform?: string | null;
  app_version?: string | null;
  build_number?: string | null;
  os_version?: string | null;
  admin_internal_note?: string | null;
  created_at: string;
  updated_at: string;
  last_status_at: string;
  completed_at?: string | null;
  is_mine: boolean;
  i_voted: boolean;
  category: FikirKategori;
  author_snapshot?: {
    user_id: string;
    username?: string | null;
    display_name?: string | null;
    profile_photo_url?: string | null;
    public_user_id?: string | null;
    country?: string | null;
    country_code?: string | null;
    account_created_at?: string | null;
    platform?: string | null;
    app_version?: string | null;
    build_number?: string | null;
    os_version?: string | null;
    feedback_created_at?: string | null;
  } | null;
  current_author?: {
    id: string;
    username?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
    public_user_id?: string | null;
    country?: string | null;
    country_code?: string | null;
  } | null;
  attachments: Array<{
    id: string;
    public_url: string;
    mime_type?: string | null;
    sort_order: number;
  }>;
  timeline: FikirZamanNoktasi[];
  admin_replies: FikirAdminCevap[];
  rewards: FikirOdul[];
};

export type FikirIstatistik = {
  this_week: number;
  received: number;
  reviewing: number;
  planned: number;
  in_development: number;
  completed: number;
  not_planned: number;
  top_categories: Array<{ name: string; count: number }>;
};

export type AdminFikirOzet = {
  id: string;
  title: string;
  status: FikirDurum;
  is_public: boolean;
  is_featured: boolean;
  is_hidden: boolean;
  is_archived: boolean;
  vote_count: number;
  created_at: string;
  last_status_at: string;
  category: { id: string; name: string; icon: string };
  user: {
    id: string;
    username?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
    public_user_id?: string | null;
  };
};

export const FIKIR_DURUM_ETIKET_ANAHTAR: Record<FikirDurum, string> = {
  RECEIVED: 'fikirler.durumAlindi',
  REVIEWING: 'fikirler.durumInceleniyor',
  PLANNED: 'fikirler.durumPlanlandi',
  IN_DEVELOPMENT: 'fikirler.durumGelistiriliyor',
  COMPLETED: 'fikirler.durumHayataGecirildi',
  NOT_PLANNED: 'fikirler.durumPlanlanmiyor',
};

export function FikirDurumEtiketi(status: FikirDurum | string): string {
  const key = FIKIR_DURUM_ETIKET_ANAHTAR[status as FikirDurum];
  return key ? (i18n.t(key) as string) : status;
}

/** Aktif dil etiketleri — i18n üzerinden (Object.keys çalışır) */
export const FIKIR_DURUM_ETIKET: Record<FikirDurum, string> = {
  get RECEIVED() {
    return FikirDurumEtiketi('RECEIVED');
  },
  get REVIEWING() {
    return FikirDurumEtiketi('REVIEWING');
  },
  get PLANNED() {
    return FikirDurumEtiketi('PLANNED');
  },
  get IN_DEVELOPMENT() {
    return FikirDurumEtiketi('IN_DEVELOPMENT');
  },
  get COMPLETED() {
    return FikirDurumEtiketi('COMPLETED');
  },
  get NOT_PLANNED() {
    return FikirDurumEtiketi('NOT_PLANNED');
  },
};

export const FIKIR_BASLIK_MIN = 8;
export const FIKIR_BASLIK_MAX = 120;
export const FIKIR_ACIKLAMA_MIN = 40;
export const FIKIR_ACIKLAMA_MAX = 4000;
