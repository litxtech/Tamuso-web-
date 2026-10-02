import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../../../src/components/Screen';
import { ModulHataSiniri } from '../../../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { MedyaUriGuvenli } from '../../../../src/moduller/mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { DogrulanmisTik } from '../../../../src/moduller/kullanici-profili/bilesenler/DogrulanmisTik';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { HesabiTamamlaKarti } from '../../../../src/moduller/misafir-hesabi/bilesenler/HesabiTamamlaKarti';
import { useMisafirIslemKapisi } from '../../../../src/moduller/misafir-hesabi/islemler/useMisafirIslemKapisi';
import {
  AjansProfilGetir,
  type AjansProfil,
} from '../../../../src/moduller/ajanslar/okuma/AjansProfilGetir';
import { AjansUyeBasvurusuOlustur } from '../../../../src/moduller/ajanslar/islemler/AjansUyeBasvurusu';
import { useAjansUyeligi } from '../../../../src/moduller/ajanslar/kancalar/useAjansUyeligi';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useTemayaAboneOl } from '../../../../src/tasarim-sistemi/tema/useTemayaAboneOl';
import { useCeviri } from '../../../../src/i18n/useCeviri';
import { DIL_LOCALE_MAP } from '../../../../src/i18n/diller';

const COVER_H = 160;
const AVATAR = 88;

function kisa(n: number, locale: string) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat(locale).format(n);
}

function seviyeEtiket(code: string | null | undefined) {
  return (code ?? '').toUpperCase();
}

function katilimMetni(iso: string | null | undefined, locale: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

export default function AjansProfilEkrani() {
  useTemayaAboneOl();
  const { t, dil } = useCeviri();
  const locale = DIL_LOCALE_MAP[dil];
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { isGuest, refreshProfile, refreshWallet } = useAuth();
  const { upgradeAcik, upgradeKapat, islemiDene } = useMisafirIslemKapisi(isGuest);
  const { uyelik, yenile: uyelikYenile } = useAjansUyeligi(!isGuest);
  const [profil, setProfil] = useState<AjansProfil | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [basvuruBusy, setBasvuruBusy] = useState(false);

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    try {
      setProfil(await AjansProfilGetir(id));
    } catch {
      setProfil(null);
    } finally {
      setYukleniyor(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
      if (!isGuest) void uyelikYenile();
    }, [yukle, isGuest, uyelikYenile]),
  );

  const a = profil?.agency;
  const istat = profil?.istatistik;
  const uyeMi = uyelik.role === 'member' || uyelik.role === 'owner';
  const beklemedeMi = uyelik.role === 'pending';
  const buAjans = Boolean(a && uyelik.agency?.id === a.id);
  const buAjansUye = buAjans && uyeMi;
  const buAjansBeklemede = buAjans && beklemedeMi;
  /** Başka ajansa gerçekten üye / bekleyen başvuru — agency alanı tek başına yetmez */
  const baskaAjans = Boolean(
    uyelik.agency &&
      a &&
      uyelik.agency.id !== a.id &&
      (uyeMi || beklemedeMi),
  );
  /** Hiçbir ajansa üye değil ve bekleyen başvurusu yok → Başvur */
  const basvurGoster =
    Boolean(a) &&
    !profil?.ben_sahibiyim &&
    !buAjansUye &&
    !buAjansBeklemede &&
    !baskaAjans;

  const handle =
    a?.username?.trim() ||
    a?.agency_public_id ||
    '';
  const banner = a ? MedyaUriGuvenli(a.banner_url) : null;
  const logo = a ? MedyaUriGuvenli(a.logo_url) : null;
  const overlayTop = insets.top + 8;
  const uyeSayisi = istat?.uye_sayisi ?? a?.host_count ?? 0;
  const katilim = katilimMetni(a?.created_at, locale);
  const onizleme = (profil?.yayincilar ?? []).slice(0, 5);

  const uyelerHref = `/ajans/profil/${id}/uyeler`;

  const ajansaBasvur = () => {
    if (!id) return;
    islemiDene('ajans_olustur', () => {
      Alert.alert(
        t('ajans.ajansaBasvur'),
        t('ajans.ajansaBasvurSoru'),
        [
          { text: t('ortak.vazgec'), style: 'cancel' },
          {
            text: t('ajans.basvur'),
            onPress: () => {
              void (async () => {
                setBasvuruBusy(true);
                const r = await AjansUyeBasvurusuOlustur({ agencyId: id });
                setBasvuruBusy(false);
                if (!r.ok) {
                  Alert.alert(
                    t('ajans.alertBasvuru'),
                    r.hata ?? t('mesajlar.basvuruGonderilemedi'),
                  );
                  return;
                }
                await uyelikYenile();
                Alert.alert(
                  t('ajans.basvuruGonderildiBaslik'),
                  t('ajans.basvuruGonderildiBody'),
                  [
                    {
                      text: t('ajans.paneleGit'),
                      onPress: () => router.push('/ajans/uye' as any),
                    },
                  ],
                );
              })();
            },
          },
        ],
      );
    });
  };

  const birincilAksiyon = () => {
    if (!a) return null;
    if (profil?.ben_sahibiyim) {
      return (
        <Pressable
          style={styles.ctaPrimary}
          onPress={() => router.push(`/ajans/${a.id}` as any)}
        >
          <Text style={styles.ctaPrimaryYazi}>{t('ajans.yonet')}</Text>
        </Pressable>
      );
    }
    if (buAjansUye) {
      return (
        <Pressable
          style={styles.ctaPrimary}
          onPress={() => router.push('/ajans/uye' as any)}
        >
          <Text style={styles.ctaPrimaryYazi}>{t('ajans.panelim')}</Text>
        </Pressable>
      );
    }
    if (buAjansBeklemede) {
      return (
        <View style={styles.ctaPending}>
          <Text style={styles.ctaPendingYazi}>{t('ajans.durumInceleniyor')}</Text>
        </View>
      );
    }
    if (baskaAjans) {
      return (
        <View style={styles.ctaGhost}>
          <Text style={styles.ctaGhostYazi}>
            {beklemedeMi ? t('ajans.basvurunVar') : t('ajans.baskaAjans')}
          </Text>
        </View>
      );
    }
    if (!basvurGoster) return null;
    return (
      <Pressable
        style={[styles.ctaPrimary, basvuruBusy && { opacity: 0.6 }]}
        onPress={ajansaBasvur}
        disabled={basvuruBusy}
        accessibilityRole="button"
        accessibilityLabel={t('ajans.ajansaBasvur')}
      >
        {basvuruBusy ? (
          <ActivityIndicator color={RenkTokenlari.textOnPrimary} size="small" />
        ) : (
          <Text style={styles.ctaPrimaryYazi}>{t('ajans.basvur')}</Text>
        )}
      </Pressable>
    );
  };

  const feedHref = '/(tabs)' as Href;
  /** Ajans profilinden geri → ana feed */
  const ajansGeri = () => {
    router.replace(feedHref);
  };

  return (
    <Screen edges={[]}>
      <ModulHataSiniri modulAdi="ajans-profil" varyant="ekran" fallbackHref="/(tabs)">
        {yukleniyor && !profil ? (
          <ActivityIndicator
            color={RenkTokenlari.primarySoft}
            style={{ marginTop: insets.top + 80 }}
          />
        ) : !profil || !a ? (
          <View style={[styles.bosWrap, { paddingTop: insets.top + 40 }]}>
            <Pressable style={styles.overlayBtn} onPress={ajansGeri}>
              <Ionicons name="chevron-back" size={22} color={RenkTokenlari.text} />
            </Pressable>
            <Text style={styles.bos}>{t('ajans.ajansBulunamadi')}</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: BoslukTokenlari.xxxl + insets.bottom }}
            refreshControl={
              <RefreshControl
                refreshing={yukleniyor}
                onRefresh={() => void yukle()}
                tintColor={RenkTokenlari.primarySoft}
              />
            }
          >
            {/* Kapak — X tarzı full-bleed */}
            <View style={[styles.coverWrap, { height: COVER_H + insets.top * 0.35 }]}>
              {banner ? (
                <Image
                  source={{ uri: banner }}
                  style={[styles.cover, { height: COVER_H + insets.top * 0.35 }]}
                />
              ) : (
                <LinearGradient
                  colors={[...RenkTokenlari.gradientPlaceholder]}
                  style={[styles.cover, { height: COVER_H + insets.top * 0.35 }]}
                />
              )}
              <LinearGradient
                colors={['transparent', RenkTokenlari.bg]}
                style={styles.coverFade}
              />
              <Pressable
                style={[styles.overlayBtn, { top: overlayTop, left: BoslukTokenlari.lg }]}
                onPress={ajansGeri}
                hitSlop={8}
                accessibilityLabel={t('ortak.geri')}
              >
                <Ionicons name="chevron-back" size={22} color={RenkTokenlari.text} />
              </Pressable>
            </View>

            {/* Avatar + aksiyonlar */}
            <View style={styles.avatarBand}>
              <View style={styles.avatarRing}>
                {logo ? (
                  <Image source={{ uri: logo }} style={styles.avatar} />
                ) : (
                  <LinearGradient
                    colors={[...RenkTokenlari.gradientPrimary]}
                    style={[styles.avatar, styles.avatarMerkez]}
                  >
                    <Text style={styles.avatarHarf}>
                      {(a.name || 'A').charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                )}
              </View>
              <View style={styles.aksiyonSatir}>
                <Pressable
                  style={styles.ctaOutline}
                  onPress={() => router.push(uyelerHref as any)}
                >
                  <Ionicons name="people-outline" size={16} color={RenkTokenlari.text} />
                  <Text style={styles.ctaOutlineYazi}>{t('ajans.uyeler')}</Text>
                </Pressable>
                {birincilAksiyon()}
              </View>
            </View>

            {/* Kimlik */}
            <View style={styles.identity}>
              <View style={styles.adSatir}>
                <Text style={styles.ad} numberOfLines={2}>
                  {a.name}
                </Text>
                {a.is_verified ? (
                  <DogrulanmisTik size={20} />
                ) : null}
              </View>
              {handle ? (
                <Text style={styles.username}>@{handle}</Text>
              ) : null}
              {a.slogan ? <Text style={styles.slogan}>{a.slogan}</Text> : null}
              {a.description ? <Text style={styles.bio}>{a.description}</Text> : null}

              <View style={styles.metaWrap}>
                {a.level_code ? (
                  <View style={styles.metaChip}>
                    <Ionicons name="ribbon-outline" size={13} color={RenkTokenlari.textDim} />
                    <Text style={styles.metaText}>{seviyeEtiket(a.level_code)}</Text>
                  </View>
                ) : null}
                {a.country ? (
                  <View style={styles.metaChip}>
                    <Ionicons name="location-outline" size={13} color={RenkTokenlari.textDim} />
                    <Text style={styles.metaText}>{a.country}</Text>
                  </View>
                ) : null}
                {katilim ? (
                  <View style={styles.metaChip}>
                    <Ionicons name="calendar-outline" size={13} color={RenkTokenlari.textDim} />
                    <Text style={styles.metaText}>
                      {t('ajans.katildiSuffix', { tarih: katilim })}
                    </Text>
                  </View>
                ) : null}
                {a.website_url ? (
                  <Pressable
                    style={styles.metaChip}
                    onPress={() => {
                      const url = a.website_url!.startsWith('http')
                        ? a.website_url!
                        : `https://${a.website_url}`;
                      void Linking.openURL(url).catch(() => undefined);
                    }}
                  >
                    <Ionicons name="link-outline" size={13} color={RenkTokenlari.primarySoft} />
                    <Text style={[styles.metaText, styles.metaLink]} numberOfLines={1}>
                      {a.website_url.replace(/^https?:\/\//i, '')}
                    </Text>
                  </Pressable>
                ) : null}
                {a.agency_public_id ? (
                  <Pressable
                    style={styles.metaChip}
                    onPress={() => {
                      void (async () => {
                        try {
                          const Clipboard = await import('expo-clipboard');
                          await Clipboard.setStringAsync(a.agency_public_id);
                          Alert.alert(t('ortak.kopyalandi'), a.agency_public_id);
                        } catch {
                          Alert.alert(t('ajans.ajansNo'), a.agency_public_id);
                        }
                      })();
                    }}
                  >
                    <Ionicons name="copy-outline" size={13} color={RenkTokenlari.textDim} />
                    <Text style={styles.metaText}>ID {a.agency_public_id}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            {/* X tarzı istatistik satırı */}
            <View style={styles.followRow}>
              <Pressable
                style={styles.followItem}
                onPress={() => router.push(uyelerHref as any)}
              >
                <Text style={styles.followN}>{kisa(uyeSayisi, locale)}</Text>
                <Text style={styles.followL}>{t('ajans.statUye')}</Text>
              </Pressable>
              <View style={styles.followDivider} />
              <View style={styles.followItem}>
                <Text style={styles.followN}>{kisa(istat?.haftalik_coin ?? 0, locale)}</Text>
                <Text style={styles.followL}>{t('ajans.statHaftalik')}</Text>
              </View>
              <View style={styles.followDivider} />
              <View style={styles.followItem}>
                <Text style={styles.followN}>{kisa(istat?.toplam_coin ?? 0, locale)}</Text>
                <Text style={styles.followL}>{t('ajans.statCoin')}</Text>
              </View>
              <View style={styles.followDivider} />
              <View style={styles.followItem}>
                <Text style={styles.followN}>
                  {kisa(Math.floor((istat?.yayin_dakika_toplam ?? 0) / 60), locale)}
                </Text>
                <Text style={styles.followL}>{t('ajans.statYayinSa')}</Text>
              </View>
            </View>

            {basvurGoster ? (
              <Pressable
                style={[styles.basvurBanner, basvuruBusy && { opacity: 0.65 }]}
                onPress={ajansaBasvur}
                disabled={basvuruBusy}
                accessibilityRole="button"
                accessibilityLabel={t('ajans.buAjansaBasvur')}
              >
                {basvuruBusy ? (
                  <ActivityIndicator color={RenkTokenlari.textOnPrimary} />
                ) : (
                  <>
                    <Ionicons
                      name="person-add-outline"
                      size={18}
                      color={RenkTokenlari.textOnPrimary}
                    />
                    <Text style={styles.basvurBannerYazi}>{t('ajans.buAjansaBasvur')}</Text>
                  </>
                )}
              </Pressable>
            ) : null}

            {/* Üyeler CTA bandı */}
            <Pressable
              style={styles.uyelerBand}
              onPress={() => router.push(uyelerHref as any)}
            >
              <View style={styles.uyelerBandSol}>
                <View style={styles.uyelerIcon}>
                  <Ionicons name="people" size={18} color={RenkTokenlari.primarySoft} />
                </View>
                <View>
                  <Text style={styles.uyelerBaslik}>{t('ajans.uyeler')}</Text>
                  <Text style={styles.uyelerAlt}>
                    {t('ajans.uyelerAltListe', { count: uyeSayisi })}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={RenkTokenlari.textDim} />
            </Pressable>

            {/* Öne çıkan üyeler */}
            <View style={styles.bolumBas}>
              <Text style={styles.bolumTitle}>{t('ajans.oneCikanlar')}</Text>
              <Pressable onPress={() => router.push(uyelerHref as any)}>
                <Text style={styles.bolumLink}>{t('ajans.tumu')}</Text>
              </Pressable>
            </View>
            {onizleme.length === 0 ? (
              <Text style={styles.bos}>{t('ajans.henuzUyeYok')}</Text>
            ) : (
              onizleme.map((y) => {
                const av = MedyaUriGuvenli(y.avatar_url);
                return (
                  <Pressable
                    key={y.user_id}
                    style={styles.uyeSatir}
                    onPress={() => router.push(`/kullanici/${y.user_id}` as any)}
                  >
                    {av ? (
                      <Image source={{ uri: av }} style={styles.uyeAvatar} />
                    ) : (
                      <View style={[styles.uyeAvatar, styles.uyeAvatarBos]}>
                        <Ionicons name="person" size={16} color={RenkTokenlari.textDim} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.uyeAd} numberOfLines={1}>
                        {y.display_name || y.username || t('ajans.uyeVarsayilan')}
                      </Text>
                      {y.username ? (
                        <Text style={styles.uyeAlt}>@{y.username}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.uyeMeta}>
                      {t('ajans.uyeHf', { n: kisa(y.haftalik_coin, locale) })}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        )}
        <HesabiTamamlaKarti
          visible={upgradeAcik}
          onClose={upgradeKapat}
          onCompleted={() => {
            void refreshProfile();
            void refreshWallet();
          }}
        />
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  coverWrap: {
    width: '100%',
    overflow: 'hidden',
    marginBottom: -(AVATAR / 2 + 8),
    position: 'relative',
  },
  cover: { width: '100%' },
  coverFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
  },
  overlayBtn: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: RenkTokenlari.chipFill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    zIndex: 2,
  },
  avatarBand: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: BoslukTokenlari.lg,
    marginBottom: BoslukTokenlari.sm,
  },
  avatarRing: {
    width: AVATAR + 6,
    height: AVATAR + 6,
    borderRadius: (AVATAR + 6) / 2,
    borderWidth: 3,
    borderColor: RenkTokenlari.bg,
    backgroundColor: RenkTokenlari.bg,
    overflow: 'hidden',
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
  },
  avatarMerkez: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHarf: {
    ...TipografiTokenlari.h1,
    color: RenkTokenlari.textOnPrimary,
    fontWeight: '800',
  },
  aksiyonSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 4,
  },
  ctaOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.surface,
  },
  ctaOutlineYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  ctaPrimary: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.primary,
    minWidth: 84,
    alignItems: 'center',
  },
  ctaPrimaryYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textOnPrimary,
    fontWeight: '800',
  },
  ctaPending: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: 1,
    borderColor: 'rgba(240,180,41,0.45)',
  },
  ctaPendingYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.accent,
    fontWeight: '700',
  },
  ctaGhost: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  ctaGhostYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
  },
  identity: {
    paddingHorizontal: BoslukTokenlari.lg,
    gap: 4,
    marginTop: 4,
  },
  adSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ad: {
    ...TipografiTokenlari.h1,
    color: RenkTokenlari.text,
    fontWeight: '800',
    flexShrink: 1,
  },
  username: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textDim,
  },
  slogan: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.primarySoft,
    marginTop: 4,
  },
  bio: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    marginTop: 6,
    lineHeight: 22,
  },
  metaWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
  },
  metaText: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
  },
  metaLink: { color: RenkTokenlari.primarySoft, maxWidth: 180 },
  followRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: BoslukTokenlari.lg,
    marginHorizontal: BoslukTokenlari.lg,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: YaricapTokenlari.lg,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  followItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  followN: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  followL: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  followDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: RenkTokenlari.divider,
  },
  basvurBanner: {
    marginTop: BoslukTokenlari.md,
    marginHorizontal: BoslukTokenlari.lg,
    minHeight: 46,
    borderRadius: YaricapTokenlari.lg,
    backgroundColor: RenkTokenlari.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: BoslukTokenlari.lg,
  },
  basvurBannerYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textOnPrimary,
    fontWeight: '800',
    fontSize: 15,
  },
  uyelerBand: {
    marginTop: BoslukTokenlari.md,
    marginHorizontal: BoslukTokenlari.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.lg,
    backgroundColor: RenkTokenlari.pressFill,
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
  },
  uyelerBandSol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  uyelerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: RenkTokenlari.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uyelerBaslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  uyelerAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
  },
  bolumBas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: BoslukTokenlari.lg,
    marginTop: BoslukTokenlari.xl,
    marginBottom: BoslukTokenlari.sm,
  },
  bolumTitle: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  bolumLink: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
  uyeSatir: {
    marginHorizontal: BoslukTokenlari.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.divider,
  },
  uyeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: RenkTokenlari.surface,
  },
  uyeAvatarBos: { alignItems: 'center', justifyContent: 'center' },
  uyeAd: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  uyeAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
  },
  uyeMeta: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
  bosWrap: { paddingHorizontal: BoslukTokenlari.lg },
  bos: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    textAlign: 'center',
    paddingVertical: BoslukTokenlari.xl,
  },
});
