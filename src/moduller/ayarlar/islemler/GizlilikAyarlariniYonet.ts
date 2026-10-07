import i18n from '../../../i18n';
import type { CeviriAnahtari } from '../../../i18n/useCeviri';
import { supabase } from '../../../lib/supabase';

export type GizlilikAyarlari = {
  hide_recharge_rank: boolean;
  hide_gifter_rank: boolean;
  hide_current_room: boolean;
  hide_last_seen: boolean;
  hide_agency: boolean;
  hide_gift_collection: boolean;
  hide_top_supporter: boolean;
  hide_level: boolean;
  hide_topup_coin: boolean;
  hide_prestige: boolean;
  hide_account_value: boolean;
  hide_crown: boolean;
  hide_online_status: boolean;
  hide_followers: boolean;
  hide_following: boolean;
  hide_status_posts: boolean;
  hide_game_stats: boolean;
  is_private: boolean;
  search_profile_visible: boolean;
  search_posts_visible: boolean;
};

const DEFAULTS: GizlilikAyarlari = {
  hide_recharge_rank: false,
  hide_gifter_rank: false,
  hide_current_room: false,
  hide_last_seen: false,
  hide_agency: false,
  hide_gift_collection: false,
  hide_top_supporter: false,
  hide_level: false,
  hide_topup_coin: false,
  hide_prestige: false,
  hide_account_value: false,
  hide_crown: false,
  hide_online_status: false,
  hide_followers: false,
  hide_following: false,
  hide_status_posts: false,
  hide_game_stats: false,
  is_private: false,
  search_profile_visible: true,
  search_posts_visible: true,
};

const SELECT_ALANLARI =
  'hide_recharge_rank, hide_gifter_rank, hide_current_room, hide_last_seen, hide_agency, hide_gift_collection, hide_top_supporter, hide_level, hide_topup_coin, hide_prestige, hide_account_value, hide_crown, hide_online_status, hide_followers, hide_following, hide_status_posts, hide_game_stats, is_private, search_profile_visible, search_posts_visible';

function satirdanAyarlar(data: Partial<GizlilikAyarlari> | null): GizlilikAyarlari {
  const ayar = { ...DEFAULTS, ...(data ?? {}) };
  if (!data || data.search_profile_visible == null) ayar.search_profile_visible = true;
  if (!data || data.search_posts_visible == null) ayar.search_posts_visible = true;
  return ayar;
}

/** Oturum sahibinin gizlilik ayarları */
export async function GizlilikAyarlariniGetir(): Promise<GizlilikAyarlari> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return { ...DEFAULTS };
  return GizlilikAyarlariniKullaniciIcinGetir(uid);
}

/** Herhangi bir kullanıcının profil gösterme bayrakları (ziyaret UI) */
export async function GizlilikAyarlariniKullaniciIcinGetir(
  userId: string,
): Promise<GizlilikAyarlari> {
  const { data, error } = await supabase
    .from('user_privacy_settings')
    .select(SELECT_ALANLARI)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return { ...DEFAULTS };
  return satirdanAyarlar(data as Partial<GizlilikAyarlari>);
}

export async function GizlilikAyariKaydet(
  alan: keyof GizlilikAyarlari,
  deger: boolean,
): Promise<{ ok: boolean; hata?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return { ok: false, hata: i18n.t('ortak.oturumYok') as string };

  if (alan === 'is_private') {
    const { data, error } = await supabase.rpc('gizli_hesap_ayarla', {
      p_is_private: deger,
    });
    if (error) return { ok: false, hata: error.message };
    const row = data as { ok?: boolean } | null;
    return { ok: row?.ok !== false };
  }

  const { error } = await supabase.from('user_privacy_settings').upsert(
    {
      user_id: uid,
      [alan]: deger,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

type GizlilikAnahtar = {
  key: keyof GizlilikAyarlari;
  labelKey: CeviriAnahtari;
  aciklamaKey?: CeviriAnahtari;
};

/** Genel gizlilik (liderlik, oda, hesap) — anahtarlar; etiket için GizlilikAlanEtiketleri() */
export const GIZLILIK_ALAN_ANAHTARLARI: GizlilikAnahtar[] = [
  {
    key: 'hide_recharge_rank',
    labelKey: 'gizlilik.hideRechargeRank',
    aciklamaKey: 'gizlilik.hideRechargeRankAlt',
  },
  { key: 'hide_gifter_rank', labelKey: 'gizlilik.hideGifterRank' },
  { key: 'hide_current_room', labelKey: 'gizlilik.hideCurrentRoom' },
  { key: 'hide_last_seen', labelKey: 'gizlilik.hideLastSeen' },
  {
    key: 'hide_online_status',
    labelKey: 'gizlilik.hideOnlineStatus',
    aciklamaKey: 'gizlilik.hideOnlineStatusAlt',
  },
  { key: 'hide_gift_collection', labelKey: 'gizlilik.hideGiftCollection' },
  { key: 'hide_top_supporter', labelKey: 'gizlilik.hideTopSupporter' },
  {
    key: 'hide_followers',
    labelKey: 'gizlilik.hideFollowers',
    aciklamaKey: 'gizlilik.hideFollowersAlt',
  },
  {
    key: 'hide_following',
    labelKey: 'gizlilik.hideFollowing',
    aciklamaKey: 'gizlilik.hideFollowingAlt',
  },
  {
    key: 'hide_status_posts',
    labelKey: 'gizlilik.hideStatusPosts',
    aciklamaKey: 'gizlilik.hideStatusPostsAlt',
  },
  {
    key: 'is_private',
    labelKey: 'gizlilik.isPrivate',
    aciklamaKey: 'gizlilik.isPrivateAlt',
  },
  {
    key: 'search_profile_visible',
    labelKey: 'gizlilik.searchProfile',
    aciklamaKey: 'gizlilik.searchProfileAlt',
  },
  {
    key: 'search_posts_visible',
    labelKey: 'gizlilik.searchPosts',
    aciklamaKey: 'gizlilik.searchPostsAlt',
  },
];

/** Profil ziyaretinde görünen göstergeler — anahtarlar */
export const PROFIL_GOSTERGE_ANAHTARLARI: GizlilikAnahtar[] = [
  {
    key: 'hide_prestige',
    labelKey: 'gizlilik.hidePrestige',
    aciklamaKey: 'gizlilik.hidePrestigeAlt',
  },
  {
    key: 'hide_agency',
    labelKey: 'gizlilik.hideAgency',
    aciklamaKey: 'gizlilik.hideAgencyAlt',
  },
  {
    key: 'hide_topup_coin',
    labelKey: 'gizlilik.hideTopupCoin',
    aciklamaKey: 'gizlilik.hideTopupCoinAlt',
  },
  {
    key: 'hide_level',
    labelKey: 'gizlilik.hideLevel',
    aciklamaKey: 'gizlilik.hideLevelAlt',
  },
  {
    key: 'hide_crown',
    labelKey: 'gizlilik.hideCrown',
    aciklamaKey: 'gizlilik.hideCrownAlt',
  },
  {
    key: 'hide_account_value',
    labelKey: 'gizlilik.hideAccountValue',
    aciklamaKey: 'gizlilik.hideAccountValueAlt',
  },
  {
    key: 'hide_game_stats',
    labelKey: 'gizlilik.hideGameStats',
    aciklamaKey: 'gizlilik.hideGameStatsAlt',
  },
];

function cozEtiketler(
  maddeler: GizlilikAnahtar[],
  t: (key: CeviriAnahtari) => string,
): { key: keyof GizlilikAyarlari; label: string; aciklama?: string }[] {
  return maddeler.map((m) => ({
    key: m.key,
    label: t(m.labelKey),
    aciklama: m.aciklamaKey ? t(m.aciklamaKey) : undefined,
  }));
}

/** Genel gizlilik etiketleri — güncel dil */
export function GizlilikAlanEtiketleri(
  t: (key: CeviriAnahtari) => string = (k) => i18n.t(k) as string,
) {
  return cozEtiketler(GIZLILIK_ALAN_ANAHTARLARI, t);
}

/** Profil gösterge etiketleri — güncel dil */
export function ProfilGostergeEtiketleri(
  t: (key: CeviriAnahtari) => string = (k) => i18n.t(k) as string,
) {
  return cozEtiketler(PROFIL_GOSTERGE_ANAHTARLARI, t);
}

/** @deprecated Prefer GizlilikAlanEtiketleri(t) — canlı dil için her okumada çöz */
export const GIZLILIK_ALAN_ETIKETLERI = new Proxy(
  [] as ReturnType<typeof GizlilikAlanEtiketleri>,
  {
    get(_t, prop) {
      const list = GizlilikAlanEtiketleri();
      return list[prop as keyof typeof list];
    },
  },
);

/** @deprecated Prefer ProfilGostergeEtiketleri(t) */
export const PROFIL_GOSTERGE_GIZLILIK = new Proxy(
  [] as ReturnType<typeof ProfilGostergeEtiketleri>,
  {
    get(_t, prop) {
      const list = ProfilGostergeEtiketleri();
      return list[prop as keyof typeof list];
    },
  },
);
