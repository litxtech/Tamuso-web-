import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../src/components/Screen';
import { guvenliGeriDon } from '../../src/components/EkranBasligi';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { useAuth } from '../../src/contexts/AuthContext';
import { ProfilGetir } from '../../src/moduller/kullanici-profili/okuma/ProfilGetir';
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
import { OzelSohbetAcVeyaGetir } from '../../src/moduller/mesajlasma/islemler/MesajGonder';
import { useHediyeMagaza } from '../../src/moduller/hediyeler/islemler/useHediyeMagaza';
import { HediyeMagazaBaglamasi } from '../../src/moduller/hediyeler/bilesenler/HediyeMagazaBaglamasi';
import { DurumProfilIzgarasi } from '../../src/moduller/durum/bilesenler/DurumProfilIzgarasi';
import {
  DurumKullanicisiniGetir,
  DurumSil,
  type DurumOggesi,
} from '../../src/moduller/durum/islemler/DurumIslemleri';
import type { Profile } from '../../src/types/models';
import { AjansUyelikGetir, type AjansUyelik } from '../../src/moduller/ajanslar/okuma/AjansUyelikGetir';
import { AjansProfilRozeti } from '../../src/moduller/ajanslar/bilesenler/AjansProfilRozeti';
import { ProfilSosyalAlani } from '../../src/moduller/takip/bilesenler/ProfilSosyalAlani';
import { KullaniciGuvenlikMenusu } from '../../src/moduller/moderasyon/bilesenler/KullaniciGuvenlikMenusu';
import { PrestigeRozetSatiri } from '../../src/moduller/vip/bilesenler/PrestigeRozetSatiri';
import { HesapDegeriRozeti } from '../../src/moduller/kullanici-profili/bilesenler/HesapDegeriRozeti';
import { IslemHacmiKart } from '../../src/moduller/islem-hacmi/bilesenler/IslemHacmiKart';
import { useIslemHacmi } from '../../src/moduller/islem-hacmi/kancalar/useIslemHacmi';
import {
  GizlilikAyarlariniKullaniciIcinGetir,
  type GizlilikAyarlari,
} from '../../src/moduller/ayarlar/islemler/GizlilikAyarlariniYonet';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { MedyaUriGuvenli } from '../../src/moduller/mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { useAktifSesOdasi } from '../../src/moduller/ses-odalari/oturum/useAktifSesOdasi';
import { KullaniciAktifOdasiniGetir, type KullaniciAktifOda } from '../../src/moduller/ses-odalari/okuma/KullaniciAktifOdasiniGetir';
import { ProfilSesOdasiButonu } from '../../src/moduller/ses-odalari/bilesenler/ProfilSesOdasiButonu';
import {
  ProfilSilinmisMi,
} from '../../src/moduller/kullanici-profili/yardimcilar/ProfilSilinmis';
import { useCeviri } from '../../src/i18n/useCeviri';

function formatSayi(n: number) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return '0';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(Math.floor(v));
}

function paramId(ham: string | string[] | undefined): string | null {
  const v = Array.isArray(ham) ? ham[0] : ham;
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

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

export default function KullaniciProfilEkrani() {
  const { t } = useCeviri();
  const { id: idHam } = useLocalSearchParams<{ id: string }>();
  const id = paramId(idHam);
  const insets = useSafeAreaInsets();
  const { user, isGuest } = useAuth();
  const [profil, setProfil] = useState<Profile | null>(null);
  const [stats, setStats] = useState<KullaniciProfilIstatistikleri | null>(null);
  const [privacy, setPrivacy] = useState<GizlilikAyarlari>(EMPTY_PRIVACY);
  const [aktifOda, setAktifOda] = useState<KullaniciAktifOda | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [durumlar, setDurumlar] = useState<DurumOggesi[]>([]);
  const [durumYukleniyor, setDurumYukleniyor] = useState(false);
  const [ajansUyelik, setAjansUyelik] = useState<AjansUyelik | null>(null);
  const [guvenlikAcik, setGuvenlikAcik] = useState(false);
  const [buyut, setBuyut] = useState<{ uri: string; tur: 'avatar' | 'cover' } | null>(
    null,
  );
  const islemHacmi = useIslemHacmi({
    mode: user?.id === id ? 'own' : 'public',
    userId: id,
    aktif: !!id && !isGuest,
  });
  const magaza = useHediyeMagaza();
  const sesOdasiArka = !!useAktifSesOdasi()?.arkaPlanda;
  const ustInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  );
  const overlayTop = sesOdasiArka
    ? BoslukTokenlari.sm
    : ustInset + BoslukTokenlari.sm;
  const coverHExtra = sesOdasiArka ? 0 : ustInset;

  const yukle = useCallback(async () => {
    if (!id) {
      setYukleniyor(false);
      setProfil(null);
      return;
    }
    setYukleniyor(true);
    setDurumYukleniyor(true);
    let gizlilik: GizlilikAyarlari = EMPTY_PRIVACY;
    try {
      const [p, s, giz, oda] = await Promise.all([
        ProfilGetir(id),
        ProfilIstatistikleriniGetir(id).catch(() => null),
        GizlilikAyarlariniKullaniciIcinGetir(id).catch(() => EMPTY_PRIVACY),
        KullaniciAktifOdasiniGetir(id).catch(() => null),
      ]);
      gizlilik = giz ?? EMPTY_PRIVACY;
      setProfil(p);
      setStats(s);
      setPrivacy(gizlilik);
      setAktifOda(oda);
    } catch {
      setProfil(null);
      setStats(null);
      setPrivacy(EMPTY_PRIVACY);
      setAktifOda(null);
      gizlilik = EMPTY_PRIVACY;
    } finally {
      setYukleniyor(false);
    }
    try {
      setAjansUyelik(await AjansUyelikGetir(id));
    } catch {
      setAjansUyelik(null);
    }
    try {
      const kendiMi = user?.id === id;
      if (kendiMi || !gizlilik.hide_status_posts) {
        setDurumlar(await DurumKullanicisiniGetir(id, 48));
      } else {
        setDurumlar([]);
      }
    } catch {
      setDurumlar([]);
    } finally {
      setDurumYukleniyor(false);
    }
  }, [id, user?.id]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  const kendi = !!id && user?.id === id;
  const silinmis = ProfilSilinmisMi(profil);
  const ad = silinmis
    ? t('profil.hesapSilindi')
    : profil?.display_name?.trim() ||
      profil?.username?.trim() ||
      t('ortak.kullanici');
  const coverUri = silinmis ? null : MedyaUriGuvenli(profil?.cover_url);
  const avatarUri = silinmis ? null : MedyaUriGuvenli(profil?.avatar_url);

  const medyaTikla = (tur: 'avatar' | 'cover') => {
    const uri = tur === 'cover' ? coverUri : avatarUri;
    if (uri) setBuyut({ uri, tur });
  };

  const gosterPrestige = kendi || !privacy.hide_prestige;
  const gosterAjans = kendi || !privacy.hide_agency;
  const gosterTopup = kendi || !privacy.hide_topup_coin;
  const gosterSeviye = kendi || !privacy.hide_level;
  const gosterHesapDegeri = kendi || !privacy.hide_account_value;
  const gosterTac = !privacy.hide_crown;
  const gosterTakipci = kendi || !privacy.hide_followers;
  const gosterTakip = kendi || !privacy.hide_following;
  const gosterDurumlar = kendi || !privacy.hide_status_posts;
  const gosterAktifOda =
    !!aktifOda &&
    (kendi || (!privacy.hide_current_room && !privacy.hide_online_status));

  const durumSil = (oge: DurumOggesi) => {
    if (!oge.is_mine) return;
    Alert.alert(t('durum.durumuSil'), t('durum.profilKaldirSoru'), [
      { text: t('ortak.vazgec'), style: 'cancel' },
      {
        text: t('ortak.kaldir'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const r = await DurumSil(oge.id);
            if (!r.ok) {
              Alert.alert(t('ortak.sil'), r.hata ?? t('durum.silinemedi'));
              return;
            }
            setDurumlar((prev) => prev.filter((x) => x.id !== oge.id));
          })();
        },
      },
    ]);
  };

  const durumMenu = (oge: DurumOggesi) => {
    if (!kendi || !oge.is_mine) return;
    const buttons: {
      text: string;
      style?: 'cancel' | 'destructive' | 'default';
      onPress?: () => void;
    }[] = [
      {
        text: t('ortak.goruntule'),
        onPress: () => router.push(`/durum/${oge.id}` as any),
      },
    ];
    if (oge.post_kind !== 'game_win') {
      buttons.push({
        text: t('ortak.duzenle'),
        onPress: () => router.push(`/durum/duzenle?id=${oge.id}` as any),
      });
    }
    buttons.push(
      {
        text: t('ortak.kaldir'),
        style: 'destructive',
        onPress: () => durumSil(oge),
      },
      { text: t('ortak.vazgec'), style: 'cancel' },
    );
    Alert.alert(t('durum.gonderi'), undefined, buttons);
  };

  const mesajAc = async () => {
    if (!id || kendi) return;
    const r = await OzelSohbetAcVeyaGetir(id);
    if (r.ok) router.push(`/mesaj/${r.threadId}` as any);
  };

  return (
    <Screen edges={[]}>
      <ModulHataSiniri modulAdi="kullanici-profili">
        <View
          style={
            sesOdasiArka
              ? [styles.odaUstBosluk, { paddingTop: ustInset }]
              : styles.durumSarici
          }
        >
          {yukleniyor || !profil ? (
            <View style={styles.durumSarici}>
              <Pressable
                style={[profilXOverlayBtnStyle, styles.backBtn, { top: overlayTop }]}
                onPress={() => guvenliGeriDon()}
                hitSlop={8}
                accessibilityLabel={t('ortak.geri')}
              >
                <Ionicons name="chevron-back" size={22} color={RenkTokenlari.text} />
              </Pressable>
              {yukleniyor ? (
                <ActivityIndicator
                  color={RenkTokenlari.primary}
                  style={{ marginTop: overlayTop + 80 }}
                />
              ) : (
                <Text style={[styles.bos, { marginTop: overlayTop + 80 }]}>
                  {t('profil.bulunamadi')}
                </Text>
              )}
            </View>
          ) : silinmis ? (
            <View style={styles.durumSarici}>
              <Pressable
                style={[profilXOverlayBtnStyle, styles.backBtn, { top: overlayTop }]}
                onPress={() => guvenliGeriDon()}
                hitSlop={8}
                accessibilityLabel={t('ortak.geri')}
              >
                <Ionicons name="chevron-back" size={22} color={RenkTokenlari.text} />
              </Pressable>
              <View style={[styles.tombstone, { marginTop: overlayTop + 72 }]}>
                <View style={styles.tombstoneAvatar}>
                  <Ionicons
                    name="person-outline"
                    size={36}
                    color={RenkTokenlari.textMuted}
                  />
                </View>
                <Text style={styles.ad}>{t('profil.hesapSilindi')}</Text>
                <Text style={styles.tombstoneAlt}>
                  {t('profil.hesapKapatildiAlt')}
                </Text>
              </View>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={false}
              scrollEventThrottle={16}
              contentContainerStyle={[
                styles.pad,
                { paddingBottom: BoslukTokenlari.xxxl + insets.bottom },
              ]}
            >
              <ProfilXBaslik
                coverUri={coverUri}
                avatarUri={avatarUri}
                displayName={ad}
                username={profil.username}
                bio={profil.bio?.trim() || null}
                verified={!!profil.is_verified}
                titleId={
                  gosterPrestige ? profil.selected_title_id ?? null : null
                }
                createdAt={profil.created_at}
                country={profil.country}
                publicUserId={profil.public_user_id}
                followingCount={stats?.following_count ?? 0}
                followersCount={stats?.followers_count ?? 0}
                gosterTakip={gosterTakip}
                gosterTakipci={gosterTakipci}
                level={gosterSeviye ? Number(profil.level) || 1 : 0}
                tacGizli={!gosterTac}
                coverHExtra={coverHExtra}
                overlayTop={overlayTop}
                onTakipPress={
                  id
                    ? () =>
                        router.push(
                          `/takip/takip-edilenler?userId=${id}` as any,
                        )
                    : undefined
                }
                onTakipciPress={
                  id
                    ? () => router.push(`/takip/takipciler?userId=${id}` as any)
                    : undefined
                }
                onCoverPress={() => medyaTikla('cover')}
                onAvatarPress={() => medyaTikla('avatar')}
                ustSol={
                  <Pressable
                    style={profilXOverlayBtnStyle}
                    onPress={() => guvenliGeriDon()}
                    hitSlop={8}
                    accessibilityLabel={t('ortak.geri')}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={22}
                      color={RenkTokenlari.text}
                    />
                  </Pressable>
                }
                ustSag={
                  !kendi && id ? (
                    <Pressable
                      style={profilXOverlayBtnStyle}
                      onPress={() => setGuvenlikAcik(true)}
                      accessibilityLabel={t('mesajSohbet.engelleBildir')}
                      hitSlop={10}
                    >
                      <Ionicons
                        name="ellipsis-horizontal"
                        size={20}
                        color={RenkTokenlari.text}
                      />
                    </Pressable>
                  ) : null
                }
                aksiyonSlot={
                  kendi ? (
                    <Pressable
                      style={styles.duzenleBtn}
                      onPress={() => router.push('/profil-duzenle' as any)}
                      accessibilityRole="button"
                      accessibilityLabel={t('profil.duzenle')}
                    >
                      <Text style={styles.duzenleYazi}>{t('profil.duzenle')}</Text>
                    </Pressable>
                  ) : id ? (
                    <ProfilSosyalAlani
                      targetUserId={id}
                      viewerId={user?.id}
                      isSelf={false}
                      isGuest={isGuest}
                      displayName={ad}
                      username={profil.username}
                      onMesaj={() => void mesajAc()}
                      sadeceAksiyon
                    />
                  ) : null
                }
              >
                <View style={styles.rozetBlok}>
                  {(gosterHesapDegeri && stats) || islemHacmi.gorunur ? (
                    <View style={styles.rozetSatir}>
                      {gosterHesapDegeri && stats ? (
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
                            mode={kendi ? 'own' : 'public'}
                            data={islemHacmi.veri}
                            kompakt={!!(gosterHesapDegeri && stats)}
                            onPress={
                              kendi
                                ? () => router.push('/islem-hacmi' as any)
                                : undefined
                            }
                          />
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {gosterPrestige && stats ? (
                    <PrestigeRozetSatiri
                      vipLevel={Number(stats.vip_level) || 0}
                      gifterLevel={
                        kendi || !privacy.hide_gifter_rank
                          ? stats.gifter_rank
                          : null
                      }
                      charmLevel={Number(stats.charm_level) || 0}
                      rechargeLevel={
                        kendi || !privacy.hide_recharge_rank
                          ? stats.recharge_rank
                          : null
                      }
                    />
                  ) : null}
                </View>

                {gosterAktifOda && aktifOda ? (
                  <View style={styles.odaWrap}>
                    <ProfilSesOdasiButonu
                      oda={aktifOda}
                      onPress={() =>
                        router.push(`/room/${aktifOda.roomId}` as any)
                      }
                    />
                  </View>
                ) : null}

                <View style={styles.metrics}>
                  {gosterSeviye ? (
                    <Metric
                      label={t('profil.seviye')}
                      value={String(profil.level ?? 1)}
                      icon="trophy-outline"
                      tint={RenkTokenlari.violet}
                    />
                  ) : null}
                  {gosterSeviye ? (
                    <Metric
                      label={t('profil.tecrube')}
                      value={formatSayi(profil.xp ?? 0)}
                      icon="flash-outline"
                      tint={RenkTokenlari.accent}
                    />
                  ) : null}
                  {gosterTopup ? (
                    <Metric
                      label={t('profil.yuklenen')}
                      value={formatSayi(stats?.total_topup_coin ?? 0)}
                      icon="diamond-outline"
                      tint={RenkTokenlari.accent}
                    />
                  ) : null}
                  <Metric
                    label={t('profil.alinan')}
                    value={String(stats?.total_gifts_received ?? 0)}
                    icon="gift-outline"
                    tint={RenkTokenlari.mint}
                  />
                  {!gosterSeviye && !gosterTopup ? (
                    <Metric
                      label={t('profil.gonderilen')}
                      value={String(stats?.total_gifts_sent ?? 0)}
                      icon="heart-outline"
                      tint={RenkTokenlari.danger}
                    />
                  ) : null}
                </View>

                {gosterAjans && ajansUyelik?.agency ? (
                  <View style={styles.ajansWrap}>
                    <AjansProfilRozeti
                      varyant="uye"
                      ajans={ajansUyelik.agency}
                      tamGenislik
                      onPress={() =>
                        router.push(
                          `/ajans/profil/${ajansUyelik.agency!.id}` as any,
                        )
                      }
                    />
                  </View>
                ) : null}

                {!kendi ? (
                  <View style={styles.aksiyonlar}>
                    <Pressable
                      style={styles.hediyeBtn}
                      onPress={() =>
                        magaza.ac({
                          receiverId: profil.id,
                          aliciAdi: ad,
                          animasyon: true,
                        })
                      }
                    >
                      <LinearGradient
                        colors={[...RenkTokenlari.gradientPrimary]}
                        style={styles.hediyeIc}
                      >
                        <Ionicons name="gift" size={18} color="#fff" />
                        <Text style={styles.hediyeYazi}>{t('hediye.gonderBaslik')}</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                ) : null}
              </ProfilXBaslik>

              <ProfilXGonderiSekme
                onPaylas={
                  kendi ? () => router.push('/durum/olustur' as any) : undefined
                }
              />
              <View style={styles.gonderiBlok}>
                <ModulHataSiniri modulAdi="profil-gonderiler" varyant="kart">
                  {gosterDurumlar ? (
                    <DurumProfilIzgarasi
                      items={durumlar}
                      yukleniyor={durumYukleniyor}
                      baslikGizle
                      yatayPadding={false}
                      bosMetin={t('profil.paylasimYokKullanici')}
                      onPress={(oge) => router.push(`/durum/${oge.id}` as any)}
                      onUzunBas={kendi ? durumMenu : undefined}
                    />
                  ) : (
                    <Text style={styles.gizliMetin}>{t('profil.gonderilerGizli')}</Text>
                  )}
                </ModulHataSiniri>
              </View>
            </ScrollView>
          )}

          <ProfilMedyaBuyutucu
            uri={buyut?.uri ?? null}
            tur={buyut?.tur}
            onKapat={() => setBuyut(null)}
          />

          <HediyeMagazaBaglamasi magaza={magaza} />
          {id ? (
            <KullaniciGuvenlikMenusu
              visible={guvenlikAcik}
              targetUserId={id}
              targetName={ad}
              contentType="profile"
              contentId={id}
              onClose={() => setGuvenlikAcik(false)}
              onBlocked={() => {
                setGuvenlikAcik(false);
                router.back();
              }}
            />
          ) : null}
        </View>
      </ModulHataSiniri>
    </Screen>
  );
}

function Metric({
  label,
  value,
  icon,
  tint,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
}) {
  return (
    <View style={styles.metric}>
      <View style={[styles.metricIcon, { backgroundColor: `${tint}22` }]}>
        <Ionicons name={icon} size={14} color={tint} />
      </View>
      <Text style={[styles.metricN, { color: tint }]}>{value}</Text>
      <Text style={styles.metricL}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  durumSarici: {
    flex: 1,
  },
  odaUstBosluk: {
    flex: 1,
  },
  pad: {
    alignItems: 'stretch',
  },
  bos: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
  },
  tombstone: {
    alignItems: 'center',
    paddingHorizontal: BoslukTokenlari.xl,
    gap: BoslukTokenlari.sm,
  },
  tombstoneAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    marginBottom: BoslukTokenlari.md,
  },
  tombstoneAlt: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  ad: {
    ...TipografiTokenlari.h1,
    color: RenkTokenlari.text,
    textAlign: 'center',
  },
  backBtn: {
    position: 'absolute',
    left: BoslukTokenlari.lg,
    zIndex: 2,
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
  odaWrap: {
    paddingHorizontal: BoslukTokenlari.lg,
    marginTop: BoslukTokenlari.md,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: BoslukTokenlari.sm,
    paddingHorizontal: BoslukTokenlari.lg,
    marginTop: BoslukTokenlari.md,
    width: '100%',
  },
  metric: {
    width: '22%',
    minWidth: 72,
    alignItems: 'center',
    paddingVertical: BoslukTokenlari.md,
    paddingHorizontal: 6,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    gap: 4,
  },
  metricIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricN: {
    ...TipografiTokenlari.caption,
    fontWeight: '800',
  },
  metricL: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  ajansWrap: {
    marginHorizontal: BoslukTokenlari.lg,
    marginTop: BoslukTokenlari.lg,
  },
  aksiyonlar: {
    marginHorizontal: BoslukTokenlari.lg,
    gap: BoslukTokenlari.sm,
    marginTop: BoslukTokenlari.xl,
  },
  hediyeBtn: { borderRadius: YaricapTokenlari.pill, overflow: 'hidden' },
  hediyeIc: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hediyeYazi: {
    ...TipografiTokenlari.body,
    color: '#fff',
    fontWeight: '800',
  },
  gonderiBlok: {
    width: '100%',
    paddingHorizontal: BoslukTokenlari.lg,
  },
  gizliMetin: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
    paddingVertical: BoslukTokenlari.lg,
  },
});
