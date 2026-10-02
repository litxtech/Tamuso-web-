import React, { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../src/components/Screen';
import { GradientButton } from '../../src/components/GradientButton';
import { YUZEN_TAB_ICERIK_BOSLUGU } from '../../src/components/YuzenTabBar';
import { useAuth } from '../../src/contexts/AuthContext';
import { HesabiTamamlaKarti } from '../../src/moduller/misafir-hesabi/bilesenler/HesabiTamamlaKarti';
import {
  ProfilIstatistikleriniGetir,
  type KullaniciProfilIstatistikleri,
} from '../../src/moduller/kullanici-profili/istatistik/ProfilIstatistikleriniGetir';
import { ProfilMedyaBuyutucu } from '../../src/moduller/kullanici-profili/bilesenler/ProfilMedyaBuyutucu';
import {
  ProfilXBaslik,
  ProfilXGonderiSekme,
  profilXOverlayBtnStyle,
} from '../../src/moduller/kullanici-profili/bilesenler/ProfilXBaslik';
import {
  OyunOyuncuIstatistikGetir,
  type OyunOyuncuIstatistik,
} from '../../src/moduller/oyunlar/ortak/servisler/OyunIstatistikServisi';
import { useGorunurOyunKodlari } from '../../src/moduller/oyunlar/ortak/hooks/useGorunurOyunKodlari';
import { KillSwitchAktifMi, OzellikBayragiAktifMi } from '../../src/moduller/ozellik-bayraklari/OzellikBayragiAktifMi';
import { PrestigeRozetSatiri } from '../../src/moduller/vip/bilesenler/PrestigeRozetSatiri';
import { HesapDegeriRozeti } from '../../src/moduller/kullanici-profili/bilesenler/HesapDegeriRozeti';
import { IslemHacmiKart } from '../../src/moduller/islem-hacmi/bilesenler/IslemHacmiKart';
import { IslemHacmiGorunurlukSheet } from '../../src/moduller/islem-hacmi/bilesenler/IslemHacmiGorunurlukSheet';
import { useIslemHacmi } from '../../src/moduller/islem-hacmi/kancalar/useIslemHacmi';
import { IslemHacmiAyarlariniKaydet } from '../../src/moduller/islem-hacmi/islemler/IslemHacmiApi';
import type { IslemHacmiGorunurluk } from '../../src/moduller/islem-hacmi/tipler';
import { UlkeKatkisiKart } from '../../src/moduller/ulke-ligi/bilesenler/UlkeKatkisiKart';
import { BenimUlkeKatkiGetir } from '../../src/moduller/ulke-ligi/islemler/UlkeLigiApi';
import type { BenimUlkeKatkisi } from '../../src/moduller/ulke-ligi/tipler';
import { useAjansUyeligi } from '../../src/moduller/ajanslar/kancalar/useAjansUyeligi';
import { AjansProfilRozeti } from '../../src/moduller/ajanslar/bilesenler/AjansProfilRozeti';
import {
  GizlilikAyarlariniGetir,
  type GizlilikAyarlari,
} from '../../src/moduller/ayarlar/islemler/GizlilikAyarlariniYonet';
import { DurumProfilIzgarasi } from '../../src/moduller/durum/bilesenler/DurumProfilIzgarasi';
import {
  DurumKullanicisiniGetir,
  type DurumOggesi,
} from '../../src/moduller/durum/islemler/DurumIslemleri';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { TamusoBanner } from '../../src/banner';
import { useCeviri } from '../../src/i18n/useCeviri';

const EMPTY_PRIVACY: GizlilikAyarlari = {
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
};

/** Profil — X tarzı hibrit header + Tamuso rozetleri */
export default function ProfileScreen() {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const { profile, wallet, user, isGuest, refreshProfile, refreshWallet } = useAuth();
  const { uyelik: ajansUyelik, yukleniyor: ajansYukleniyor } = useAjansUyeligi(!isGuest);
  const [upgradeAcik, setUpgradeAcik] = useState(false);
  const [oyunKartAcik, setOyunKartAcik] = useState(false);
  const [stats, setStats] = useState<KullaniciProfilIstatistikleri | null>(null);
  const [privacy, setPrivacy] = useState<GizlilikAyarlari>(EMPTY_PRIVACY);
  const [oyunStats, setOyunStats] = useState<OyunOyuncuIstatistik | null>(null);
  const [buyut, setBuyut] = useState<{
    uri: string;
    tur: 'avatar' | 'cover';
  } | null>(null);
  const [durumlar, setDurumlar] = useState<DurumOggesi[]>([]);
  const [durumYukleniyor, setDurumYukleniyor] = useState(true);
  const [hacimGorunurlukAcik, setHacimGorunurlukAcik] = useState(false);
  const islemHacmi = useIslemHacmi({
    mode: 'own',
    userId: user?.id,
    aktif: !isGuest && !!user?.id,
  });
  const [ulkeKatki, setUlkeKatki] = useState<BenimUlkeKatkisi | null>(null);
  const ulkeLigiAcik =
    OzellikBayragiAktifMi('country_league_enabled') &&
    !KillSwitchAktifMi('kill_country_league_display');
  const oyunPlatformAcik =
    OzellikBayragiAktifMi('games_enabled') && !KillSwitchAktifMi('kill_games');
  const { anyVisible: oyunGorunur } = useGorunurOyunKodlari({
    enabled: oyunPlatformAcik,
  });
  const oyunProfiliAcik = oyunPlatformAcik && oyunGorunur;

  const hacimGorunurlukSec = (v: IslemHacmiGorunurluk) => {
    setHacimGorunurlukAcik(false);
    const b = islemHacmi.benim;
    if (!b || v === b.visibility) return;
    void IslemHacmiAyarlariniKaydet({
      visibility: v,
      show_badge: b.show_badge,
      show_frame: b.show_frame,
      show_effect: b.show_effect,
      show_in_leaderboard: b.show_in_leaderboard !== false,
    }).then((r) => {
      if (!r.ok) {
        Alert.alert(t('islemHacmi.baslik'), r.hata ?? t('ortak.kaydedilemedi'));
      }
      islemHacmi.yenile();
    });
  };

  useFocusEffect(
    useCallback(() => {
      void refreshProfile();
      if (!user?.id) return;
      if (!isGuest) {
        void GizlilikAyarlariniGetir().then(setPrivacy);
      }
      if (!isGuest && ulkeLigiAcik) {
        void BenimUlkeKatkiGetir()
          .then(setUlkeKatki)
          .catch(() => setUlkeKatki(null));
      } else {
        setUlkeKatki(null);
      }
      ProfilIstatistikleriniGetir(user.id)
        .then(setStats)
        .catch(() => setStats(null));
      if (oyunProfiliAcik) {
        OyunOyuncuIstatistikGetir(user.id)
          .then(setOyunStats)
          .catch(() => setOyunStats(null));
      } else {
        setOyunStats(null);
      }
      setDurumYukleniyor(true);
      DurumKullanicisiniGetir(user.id, 48)
        .then(setDurumlar)
        .catch(() => setDurumlar([]))
        .finally(() => setDurumYukleniyor(false));
    }, [user?.id, refreshProfile, oyunProfiliAcik, isGuest, ulkeLigiAcik]),
  );

  const medyaTikla = (tur: 'avatar' | 'cover') => {
    const url =
      tur === 'cover'
        ? typeof profile?.cover_url === 'string' &&
          /^https?:\/\//i.test(profile.cover_url.trim())
          ? profile.cover_url.trim()
          : null
        : typeof profile?.avatar_url === 'string' &&
            /^https?:\/\//i.test(profile.avatar_url.trim())
          ? profile.avatar_url.trim()
          : null;
    if (url) setBuyut({ uri: url, tur });
  };

  const profilDuzenle = () => {
    if (isGuest) {
      setUpgradeAcik(true);
      return;
    }
    router.push('/profil-duzenle' as any);
  };

  const cuzdanaGit = () => {
    if (isGuest) {
      setUpgradeAcik(true);
      return;
    }
    router.replace('/(tabs)/wallet');
  };

  const displayName =
    profile?.display_name ??
    (isGuest ? t('ortak.misafir') : t('ortak.kullanici'));
  const username = profile?.username ?? t('profilTab.misafirUsername');
  const bio =
    profile?.bio?.trim() ||
    (isGuest ? t('profilTab.misafirBio') : t('profilTab.varsayilanBio'));
  const coverUri =
    typeof profile?.cover_url === 'string' &&
    /^https?:\/\//i.test(profile.cover_url.trim())
      ? profile.cover_url.trim()
      : null;
  const avatarUri =
    typeof profile?.avatar_url === 'string' &&
    /^https?:\/\//i.test(profile.avatar_url.trim())
      ? profile.avatar_url.trim()
      : null;

  const paylas = isGuest
    ? () => setUpgradeAcik(true)
    : () => router.push('/durum/olustur' as any);

  return (
    <Screen edges={[]} tabSayfaKaydir>
      <ModulHataSiniri modulAdi="kullanici-profili">
        <ScrollView
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={false}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scroll}
        >
          <ProfilXBaslik
            coverUri={coverUri}
            avatarUri={avatarUri}
            displayName={displayName}
            username={username}
            bio={bio}
            verified={!!profile?.is_verified}
            titleId={
              privacy.hide_prestige
                ? null
                : profile?.selected_title_id ?? null
            }
            createdAt={profile?.created_at}
            country={profile?.country}
            publicUserId={profile?.public_user_id}
            guestBadge={isGuest}
            followingCount={stats?.following_count ?? 0}
            followersCount={stats?.followers_count ?? 0}
            postsCount={stats?.posts_count ?? 0}
            pendingFollowRequests={stats?.pending_follow_requests_count ?? 0}
            gosterTakip={!privacy.hide_following}
            gosterTakipci={!privacy.hide_followers}
            gosterGonderi
            level={Number(profile?.level) || 1}
            tacGizli={privacy.hide_crown}
            coverHExtra={insets.top}
            onTakipPress={() =>
              user?.id &&
              router.push(`/takip/takip-edilenler?userId=${user.id}` as any)
            }
            onTakipciPress={() =>
              user?.id &&
              router.push(`/takip/takipciler?userId=${user.id}` as any)
            }
            onIstekPress={() => router.push('/takip/istekler' as any)}
            onCoverPress={() => medyaTikla('cover')}
            onAvatarPress={() => medyaTikla('avatar')}
            ustSag={
              <Pressable
                style={profilXOverlayBtnStyle}
                onPress={() => router.push('/profil-ayarlar' as any)}
                hitSlop={8}
                accessibilityLabel={t('profil.ayarlar')}
              >
                <Ionicons
                  name="settings-outline"
                  size={20}
                  color={RenkTokenlari.text}
                />
              </Pressable>
            }
            aksiyonSlot={
              <Pressable
                style={styles.duzenleBtn}
                onPress={profilDuzenle}
                accessibilityRole="button"
                accessibilityLabel={t('profil.duzenle')}
              >
                <Text style={styles.duzenleYazi}>{t('profil.duzenle')}</Text>
              </Pressable>
            }
          >
            <View style={styles.rozetBlok}>
              {(stats && !privacy.hide_account_value) || islemHacmi.gorunur ? (
                <View style={styles.rozetSatir}>
                  {stats && !privacy.hide_account_value ? (
                    <View style={styles.rozetHucre}>
                      <HesapDegeriRozeti
                        value={Number(stats.account_value) || 0}
                        label={stats.account_value_label}
                        kompakt={islemHacmi.gorunur}
                      />
                    </View>
                  ) : null}
                  {islemHacmi.gorunur ? (
                    <View style={styles.rozetHucre}>
                      <IslemHacmiKart
                        mode="own"
                        data={islemHacmi.benim}
                        kompakt={!!(stats && !privacy.hide_account_value)}
                        onPress={() => router.push('/islem-hacmi' as any)}
                        onMenu={() => setHacimGorunurlukAcik(true)}
                      />
                    </View>
                  ) : null}
                </View>
              ) : null}
              {stats && !privacy.hide_prestige ? (
                <PrestigeRozetSatiri
                  vipLevel={Number(stats.vip_level) || 0}
                  gifterLevel={stats.gifter_rank}
                  charmLevel={Number(stats.charm_level) || 0}
                  rechargeLevel={stats.recharge_rank}
                />
              ) : null}
              {ulkeLigiAcik && ulkeKatki?.show_on_profile && ulkeKatki.country_code ? (
                <View style={{ marginTop: BoslukTokenlari.sm }}>
                  <UlkeKatkisiKart
                    veri={ulkeKatki}
                    onPress={() =>
                      router.push(`/ulke/${ulkeKatki.country_code}` as never)
                    }
                  />
                </View>
              ) : null}
            </View>

            <TamusoBanner placement="PROFILE_TOP" screen="PROFILE" compact />

            <View style={styles.aksiyonlar}>
              {!isGuest && !ajansYukleniyor && ajansUyelik.role === 'pending' ? (
                <AjansProfilRozeti
                  varyant="beklemede"
                  ajans={ajansUyelik.agency}
                  tamGenislik
                  onPress={() => router.push('/ajans/uye' as any)}
                />
              ) : !isGuest && !ajansYukleniyor && ajansUyelik.agency ? (
                <AjansProfilRozeti
                  varyant="uye"
                  ajans={ajansUyelik.agency}
                  tamGenislik
                  onPress={() =>
                    router.push(`/ajans/profil/${ajansUyelik.agency!.id}` as any)
                  }
                />
              ) : !isGuest && !ajansYukleniyor ? (
                <AjansProfilRozeti
                  varyant="basvur"
                  tamGenislik
                  onPress={() => router.push('/ajans' as any)}
                />
              ) : null}
            </View>

            <TamusoBanner placement="PROFILE_MIDDLE" screen="PROFILE" compact />

            <Pressable
              onPress={cuzdanaGit}
              style={({ pressed }) => [styles.walletPress, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={t('cuzdan.baslik')}
            >
              <View style={styles.walletUst}>
                <View style={styles.walletSol}>
                  <Text style={styles.walletBaslik}>{t('cuzdan.baslik')}</Text>
                  <Text style={styles.walletAlt}>{t('profilTab.cuzdanAlt')}</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={RenkTokenlari.textDim}
                />
              </View>
              <View style={styles.walletBakiyeRow}>
                <View style={styles.walletBakiyeKart}>
                  <View
                    style={[
                      styles.walletDot,
                      { backgroundColor: RenkTokenlari.accent },
                    ]}
                  />
                  <View style={styles.walletBakiyeCopy}>
                    <Text style={styles.walletBakiyeEtiket}>{t('cuzdan.coin')}</Text>
                    <Text style={styles.walletBakiyeDeger} numberOfLines={1}>
                      {formatSayi(wallet?.coins ?? 0)}
                    </Text>
                  </View>
                </View>
                <View style={styles.walletBakiyeKart}>
                  <View
                    style={[
                      styles.walletDot,
                      { backgroundColor: RenkTokenlari.violet },
                    ]}
                  />
                  <View style={styles.walletBakiyeCopy}>
                    <Text style={styles.walletBakiyeEtiket}>{t('cuzdan.elmas')}</Text>
                    <Text style={styles.walletBakiyeDeger} numberOfLines={1}>
                      {formatSayi(wallet?.diamonds ?? 0)}
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>

            {oyunProfiliAcik && !privacy.hide_game_stats ? (
              <Pressable
                onPress={() => setOyunKartAcik(true)}
                style={({ pressed }) => [
                  styles.walletPress,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('profilTab.oyunProfili')}
              >
                <View style={styles.walletUst}>
                  <View style={styles.walletSol}>
                    <Text style={styles.walletBaslik}>{t('profilTab.oyun')}</Text>
                    <Text style={styles.walletAlt}>
                      {t('profilTab.oyunAlt', {
                        lig: oyunStats?.leagueLabel ?? t('sehir.lig'),
                      })}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={RenkTokenlari.textDim}
                  />
                </View>
                <View style={styles.walletBakiyeRow}>
                  <View style={styles.walletBakiyeKart}>
                    <View
                      style={[
                        styles.walletDot,
                        { backgroundColor: RenkTokenlari.accent },
                      ]}
                    />
                    <View style={styles.walletBakiyeCopy}>
                      <Text style={styles.walletBakiyeEtiket}>
                        {t('profilTab.kupa')}
                      </Text>
                      <Text style={styles.walletBakiyeDeger} numberOfLines={1}>
                        {formatSayi(oyunStats?.trophies ?? 0)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.walletBakiyeKart}>
                    <View
                      style={[
                        styles.walletDot,
                        { backgroundColor: RenkTokenlari.mint },
                      ]}
                    />
                    <View style={styles.walletBakiyeCopy}>
                      <Text style={styles.walletBakiyeEtiket}>{t('profil.galibiyet')}</Text>
                      <Text style={styles.walletBakiyeDeger} numberOfLines={1}>
                        {oyunStats?.wins ?? 0}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ) : null}

            <View style={styles.metrics}>
              <Metric
                label={t('profil.gonderilen')}
                value={String(stats?.total_gifts_sent ?? 0)}
                tint={RenkTokenlari.danger}
              />
              <Metric
                label={t('profil.alinan')}
                value={String(stats?.total_gifts_received ?? 0)}
                tint={RenkTokenlari.mint}
              />
              <Metric
                label={t('profil.seviye')}
                value={String(profile?.level ?? 1)}
                tint={RenkTokenlari.violet}
              />
              <Metric
                label={t('profil.tecrube')}
                value={formatSayi(profile?.xp ?? 0)}
                tint={RenkTokenlari.accent}
              />
            </View>

            {isGuest ? (
              <View style={styles.guestCta}>
                <GradientButton
                  title={t('ortak.hesabiTamamla')}
                  onPress={() => setUpgradeAcik(true)}
                />
              </View>
            ) : null}
          </ProfilXBaslik>

          <ProfilXGonderiSekme onPaylas={paylas} />
          <ModulHataSiniri modulAdi="profil-gonderiler" varyant="kart">
            <DurumProfilIzgarasi
              items={durumlar}
              yukleniyor={durumYukleniyor}
              baslikGizle
              yatayPadding
              bosMetin={
                isGuest
                  ? t('profilTab.misafirPaylasimBos')
                  : t('profilTab.paylasimBos')
              }
              onPress={(oge) => router.push(`/durum/${oge.id}` as any)}
            />
          </ModulHataSiniri>
        </ScrollView>

        <HesabiTamamlaKarti
          visible={upgradeAcik}
          onClose={() => setUpgradeAcik(false)}
          onCompleted={() => {
            void refreshProfile();
            void refreshWallet();
            Alert.alert(t('ortak.tamam'), t('profilTab.hesapGuncellendi'));
          }}
        />

        <OyunProfilKartModal
          visible={oyunKartAcik && oyunProfiliAcik}
          stats={oyunStats}
          onKapat={() => setOyunKartAcik(false)}
        />

        <ProfilMedyaBuyutucu
          uri={buyut?.uri ?? null}
          tur={buyut?.tur}
          onKapat={() => setBuyut(null)}
        />
        <IslemHacmiGorunurlukSheet
          visible={hacimGorunurlukAcik}
          secili={
            (islemHacmi.benim?.visibility ?? 'TIER_ONLY') as IslemHacmiGorunurluk
          }
          onSec={hacimGorunurlukSec}
          onKapat={() => setHacimGorunurlukAcik(false)}
        />
      </ModulHataSiniri>
    </Screen>
  );
}

function formatSayi(n: number) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return '0';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(Math.floor(v));
}

function Metric({
  label,
  value,
  tint,
}: {
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricN, { color: tint }]}>{value}</Text>
      <Text style={styles.metricL}>{label}</Text>
    </View>
  );
}

function OyunProfilKartModal({
  visible,
  stats,
  onKapat,
}: {
  visible: boolean;
  stats: OyunOyuncuIstatistik | null;
  onKapat: () => void;
}) {
  const { t } = useCeviri();
  const hucreler = [
    {
      id: 'kupa',
      etiket: t('profilTab.kupa'),
      deger: formatSayi(stats?.trophies ?? 0),
      tint: RenkTokenlari.accent,
    },
    {
      id: 'oyun_xp',
      etiket: t('profilTab.oyunXp'),
      deger: formatSayi(stats?.xp ?? 0),
      tint: RenkTokenlari.violet,
    },
    {
      id: 'mac',
      etiket: t('profilTab.mac'),
      deger: String(stats?.totalGames ?? 0),
      tint: RenkTokenlari.text,
    },
    {
      id: 'galibiyet',
      etiket: t('profil.galibiyet'),
      deger: String(stats?.wins ?? 0),
      tint: RenkTokenlari.mint,
    },
    {
      id: 'en_yuksek',
      etiket: t('profilTab.enYuksek'),
      deger: formatSayi(stats?.highestScore ?? 0),
      tint: RenkTokenlari.accent,
    },
    {
      id: 'combo',
      etiket: t('profilTab.combo'),
      deger: `×${stats?.highestCombo ?? 0}`,
      tint: RenkTokenlari.violet,
    },
  ] as const;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onKapat}
      statusBarTranslucent
    >
      <Pressable style={styles.oyunModalMaske} onPress={onKapat}>
        <Pressable
          style={styles.oyunModalKart}
          onPress={(e) => e.stopPropagation()}
          accessibilityLabel={t('profilTab.oyunProfili')}
        >
          <View style={styles.walletUst}>
            <View style={styles.walletSol}>
              <Text style={styles.walletBaslik}>{t('profilTab.oyunProfili')}</Text>
              <Text style={[styles.walletAlt, { color: RenkTokenlari.accent }]}>
                {stats?.leagueLabel ?? t('sehir.lig')}
              </Text>
            </View>
            <Pressable
              onPress={onKapat}
              hitSlop={10}
              accessibilityLabel={t('ortak.kapat')}
              style={styles.oyunModalKapat}
            >
              <Ionicons name="close" size={18} color={RenkTokenlari.textMuted} />
            </Pressable>
          </View>

          <View style={styles.oyunModalGrid}>
            {hucreler.map((h) => (
              <View key={h.id} style={[styles.walletBakiyeKart, styles.oyunModalHucre]}>
                <View style={[styles.walletDot, { backgroundColor: h.tint }]} />
                <View style={styles.walletBakiyeCopy}>
                  <Text style={styles.walletBakiyeEtiket}>{h.etiket}</Text>
                  <Text style={styles.walletBakiyeDeger} numberOfLines={1}>
                    {h.deger}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.oyunModalAlt}>
            {(stats?.totalGames ?? 0) > 0
              ? t('profilTab.galibiyetOrani', { oran: stats?.winRate ?? 0 })
              : t('profilTab.oyunIpucu')}
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: YUZEN_TAB_ICERIK_BOSLUGU,
  },
  duzenleBtn: {
    paddingVertical: 8,
    paddingHorizontal: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },
  duzenleYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  rozetBlok: {
    paddingHorizontal: BoslukTokenlari.lg,
    gap: BoslukTokenlari.sm,
    alignItems: 'stretch',
  },
  rozetSatir: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: BoslukTokenlari.sm,
    marginTop: 10,
    width: '100%',
  },
  rozetHucre: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  aksiyonlar: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: BoslukTokenlari.md,
    gap: BoslukTokenlari.sm,
    alignItems: 'stretch',
  },
  pressed: { opacity: 0.9 },
  walletPress: {
    marginHorizontal: BoslukTokenlari.lg,
    marginTop: BoslukTokenlari.md,
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.lg,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.28)',
    gap: BoslukTokenlari.md,
  },
  walletUst: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.sm,
  },
  walletSol: { flex: 1, gap: 2, minWidth: 0 },
  walletBaslik: {
    ...TipografiTokenlari.body,
    fontWeight: '700',
    color: RenkTokenlari.text,
  },
  walletAlt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  walletBakiyeRow: {
    flexDirection: 'row',
    gap: BoslukTokenlari.sm,
  },
  walletBakiyeKart: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.sm,
    paddingVertical: 10,
    paddingHorizontal: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.surface,
  },
  walletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  walletBakiyeCopy: { flex: 1, minWidth: 0, gap: 1 },
  walletBakiyeEtiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  walletBakiyeDeger: {
    ...TipografiTokenlari.body,
    fontWeight: '800',
    color: RenkTokenlari.text,
  },
  metrics: {
    flexDirection: 'row',
    marginHorizontal: BoslukTokenlari.lg,
    marginTop: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    overflow: 'hidden',
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: BoslukTokenlari.md,
    gap: 2,
  },
  metricN: { ...TipografiTokenlari.caption, fontWeight: '800' },
  metricL: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontSize: 9,
  },
  oyunModalMaske: {
    flex: 1,
    backgroundColor: 'rgba(8,6,14,0.72)',
    justifyContent: 'center',
    paddingHorizontal: BoslukTokenlari.xl,
  },
  oyunModalKart: {
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.lg,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.28)',
    gap: BoslukTokenlari.md,
  },
  oyunModalKapat: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.surface,
  },
  oyunModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: BoslukTokenlari.sm,
  },
  oyunModalHucre: {
    flexGrow: 0,
    flexBasis: '47%',
    maxWidth: '48%',
  },
  oyunModalAlt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  guestCta: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: BoslukTokenlari.lg,
  },
});
