/**
 * Profil kartı sheet — aşağıdan yukarı kayar (~ekranın yarısından biraz fazla).
 * Ses odası / canlı yayın yorum avatar-isim tıklarında kullanılır.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ProfilAvatarKucuk } from '../../canli-sohbet/bilesenler/ProfilAvatarKucuk';
import { ProfilMedyaBuyutucu } from '../../kullanici-profili/bilesenler/ProfilMedyaBuyutucu';
import { ProfilIstatistikleriniGetir } from '../../kullanici-profili/istatistik/ProfilIstatistikleriniGetir';
import { SeviyeTaci } from './SeviyeTaci';
import { TakipButonu } from '../../takip/bilesenler/TakipButonu';
import { useTakipDurumu } from '../../takip/kancalar/useTakipDurumu';
import { useTakipMutasyonu } from '../../takip/kancalar/useTakipEt';
import { takiptenCikOnayi } from '../../takip/bilesenler/TakipOnaySheet';
import { TakipHataMesaji } from '../../takip/TakipHataMesajlari';
import { TakipSayaciniFormatla } from '../../takip/TakipSayacFormat';
import { KullaniciGuvenlikMenusu } from '../../moderasyon/bilesenler/KullaniciGuvenlikMenusu';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  visible: boolean;
  onClose: () => void;
  userId?: string | null;
  viewerId?: string | null;
  isGuest?: boolean;
  displayName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  level?: number | null;
  coins?: number | null;
  diamonds?: number | null;
  followersCount?: number | null;
  followingCount?: number | null;
  /** Sheet başlığı — örn. "Oda sahibi" */
  baslik?: string;
  onProfilAc?: () => void;
  onNeedUpgrade?: () => void;
  /** Ekran yüksekliğinin oranı — varsayılan neredeyse tam kart */
  yukseklikOrani?: number;
};

const SHEET_GIRIS = SlideInDown.duration(300).easing(Easing.out(Easing.cubic));
const SHEET_CIKIS = SlideOutDown.duration(220).easing(Easing.in(Easing.cubic));

const ALTIN = ['#FFF1B8', '#F0B429', '#C99214'] as const;

function formatSayi(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function OdaProfilKartiPaneliInner({
  visible,
  onClose,
  userId,
  viewerId,
  isGuest,
  displayName,
  username,
  avatarUrl,
  bio,
  level,
  coins,
  diamonds,
  followersCount: followersProp,
  followingCount: followingProp,
  baslik,
  onProfilAc,
  onNeedUpgrade,
  yukseklikOrani = 0.9,
}: Props) {
  const { t, dil } = useCeviri();
  const insets = useSafeAreaInsets();
  const { height: ekranH } = useWindowDimensions();
  const baslikMetin = baslik ?? t('sesOda.profilBilgileri');
  const ad = displayName?.trim() || username?.trim() || t('ortak.profil');
  const handle = username?.trim() ? `@${username.trim()}` : null;
  const seviye = level && level > 0 ? level : 0;
  const cuzdanGoster = coins != null || diamonds != null;
  const kendi = !!userId && !!viewerId && userId === viewerId;

  const [avatarBuyuk, setAvatarBuyuk] = useState<string | null>(null);
  const [followers, setFollowers] = useState(followersProp ?? 0);
  const [following, setFollowing] = useState(followingProp ?? 0);
  const [guvenlikAcik, setGuvenlikAcik] = useState(false);

  const { durum, setDurum } = useTakipDurumu(
    visible && userId && !kendi ? userId : null,
  );
  const { calistir, isleniyor } = useTakipMutasyonu({
    targetUserId: userId ?? '',
    viewerId,
    durum,
    setDurum,
  });

  useEffect(() => {
    if (!visible) {
      setAvatarBuyuk(null);
      return;
    }
    setFollowers(followersProp ?? 0);
    setFollowing(followingProp ?? 0);
  }, [visible, followersProp, followingProp]);

  useEffect(() => {
    if (!visible || !userId) return;
    let iptal = false;
    void ProfilIstatistikleriniGetir(userId)
      .then((s) => {
        if (iptal || !s) return;
        setFollowers(s.followers_count ?? 0);
        setFollowing(s.following_count ?? 0);
      })
      .catch(() => undefined);
    return () => {
      iptal = true;
    };
  }, [visible, userId]);

  useEffect(() => {
    if (durum?.followers_count != null) setFollowers(durum.followers_count);
    if (durum?.following_count != null) setFollowing(durum.following_count);
  }, [durum?.followers_count, durum?.following_count]);

  const takipBas = useCallback(() => {
    if (!userId) return;
    if (isGuest) {
      onNeedUpgrade?.();
      Alert.alert(t('sesOda.takip'), t('sesOda.takipMisafir'));
      return;
    }
    const st = durum?.state;
    if (st === 'FOLLOWING' || st === 'MUTUAL') {
      takiptenCikOnayi(username, () => {
        void calistir('unfollow').then((r) => {
          if (!r.ok) Alert.alert(t('sesOda.takip'), r.hata ?? TakipHataMesaji(r.code));
        });
      });
      return;
    }
    if (st === 'REQUEST_PENDING') {
      void calistir('cancel').then((r) => {
        if (!r.ok) Alert.alert(t('sesOda.takip'), r.hata ?? TakipHataMesaji(r.code));
      });
      return;
    }
    void calistir('follow').then((r) => {
      if (!r.ok) Alert.alert(t('sesOda.takip'), r.hata ?? TakipHataMesaji(r.code));
    });
  }, [userId, isGuest, onNeedUpgrade, durum?.state, username, calistir]);

  const listeAc = (tur: 'followers' | 'following') => {
    if (!userId) return;
    onClose();
    const path =
      tur === 'followers'
        ? `/takip/takipciler?userId=${userId}`
        : `/takip/takip-edilenler?userId=${userId}`;
    router.push(path as any);
  };

  if (!visible) return null;

  const sheetH = Math.round(ekranH * yukseklikOrani);

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        hardwareAccelerated
        onRequestClose={onClose}
      >
        <View style={styles.root}>
          <Pressable
            style={styles.perde}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('ortak.kapat')}
          />

          <Animated.View
            entering={SHEET_GIRIS}
            exiting={SHEET_CIKIS}
            style={[
              styles.sheet,
              {
                height: sheetH,
                paddingBottom: Math.max(insets.bottom, 16) + 8,
              },
            ]}
          >
            <LinearGradient
              colors={['#2A1C08', '#141018', '#0C0A10']}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={styles.cekmeCubugu} />

            <View style={styles.baslikSatir}>
              <Text style={styles.baslik}>{baslikMetin}</Text>
              <Pressable
                onPress={onClose}
                style={styles.kapatBtn}
                accessibilityLabel={t('ortak.kapat')}
                accessibilityRole="button"
                hitSlop={14}
              >
                <Ionicons name="close" size={22} color="#FFF6D6" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollIc}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <LinearGradient
                colors={[...ALTIN]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.kartCerceve}
              >
                <View style={styles.kartIc}>
                  <Pressable
                    onPress={() => {
                      if (avatarUrl?.trim()) setAvatarBuyuk(avatarUrl.trim());
                    }}
                    style={styles.avatarWrap}
                    accessibilityRole="button"
                    accessibilityLabel={t('sesOda.profilBuyut')}
                    disabled={!avatarUrl?.trim()}
                  >
                    <SeviyeTaci level={seviye} size="lg" avatarBoy={72}>
                      <ProfilAvatarKucuk
                        size={72}
                        displayName={displayName}
                        username={username}
                        avatarUrl={avatarUrl}
                      />
                    </SeviyeTaci>
                    {avatarUrl?.trim() ? (
                      <View style={styles.buyutRozet}>
                        <Ionicons name="expand-outline" size={12} color="#2A1800" />
                      </View>
                    ) : null}
                  </Pressable>

                  <Text style={styles.ad}>{ad}</Text>
                  {handle ? <Text style={styles.handle}>{handle}</Text> : null}

                  {seviye > 0 ? (
                    <View style={styles.seviyePill}>
                      <Text style={styles.seviyeText}>
                        {t('sesOda.seviyeN', { n: seviye })}
                      </Text>
                    </View>
                  ) : null}

                  {bio?.trim() ? (
                    <Text style={styles.bio} numberOfLines={4}>
                      {bio.trim()}
                    </Text>
                  ) : null}

                  <View style={styles.sosyalSatir}>
                    <Pressable
                      style={styles.sosyalStat}
                      onPress={() => listeAc('following')}
                      accessibilityRole="button"
                      accessibilityLabel={t('sesOda.takipEdilenler')}
                    >
                      <Text style={styles.sosyalDeger}>
                        {TakipSayaciniFormatla(following, dil)}
                      </Text>
                      <Text style={styles.sosyalEtiket}>{t('sesOda.takip')}</Text>
                    </Pressable>
                    <View style={styles.statAyir} />
                    <Pressable
                      style={styles.sosyalStat}
                      onPress={() => listeAc('followers')}
                      accessibilityRole="button"
                      accessibilityLabel={t('sesOda.takipciler')}
                    >
                      <Text style={styles.sosyalDeger}>
                        {TakipSayaciniFormatla(followers, dil)}
                      </Text>
                      <Text style={styles.sosyalEtiket}>{t('sesOda.takipci')}</Text>
                    </Pressable>
                  </View>

                  {cuzdanGoster ? (
                    <View style={styles.istatistikler}>
                      <View style={styles.stat}>
                        <Text style={styles.statEmoji}>🪙</Text>
                        <Text style={styles.statDeger}>
                          {formatSayi(Math.max(0, coins ?? 0))}
                        </Text>
                        <Text style={styles.statEtiket}>Coin</Text>
                      </View>
                      <View style={styles.statAyir} />
                      <View style={styles.stat}>
                        <Text style={styles.statEmoji}>💎</Text>
                        <Text style={styles.statDeger}>
                          {formatSayi(Math.max(0, diamonds ?? 0))}
                        </Text>
                        <Text style={styles.statEtiket}>Elmas</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              </LinearGradient>

              {userId && !kendi ? (
                <View style={styles.takipWrap}>
                  <TakipButonu
                    state={durum?.state ?? 'NOT_FOLLOWING'}
                    displayName={ad}
                    loading={isleniyor}
                    onPress={takipBas}
                  />
                  <Pressable
                    style={styles.guvenlikBtn}
                    onPress={() => setGuvenlikAcik(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t('sesOda.bildirVeyaEngelle')}
                  >
                    <Ionicons name="flag-outline" size={16} color="#FFE08A" />
                    <Text style={styles.guvenlikBtnYazi}>Bildir / Engelle</Text>
                  </Pressable>
                </View>
              ) : null}

              {onProfilAc ? (
                <Pressable
                  onPress={() => {
                    onClose();
                    onProfilAc();
                  }}
                  style={styles.cta}
                  accessibilityRole="button"
                  accessibilityLabel={t('sesOda.tamProfilAc')}
                >
                  <LinearGradient
                    colors={[...ALTIN]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.ctaIc}
                  >
                    <Text style={styles.ctaText}>{t('sesOda.profilSayfasinaGit')}</Text>
                    <Ionicons name="arrow-forward" size={18} color="#2A1800" />
                  </LinearGradient>
                </Pressable>
              ) : null}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      <ProfilMedyaBuyutucu
        uri={avatarBuyuk}
        onKapat={() => setAvatarBuyuk(null)}
        tur="avatar"
      />

      {userId && !kendi ? (
        <KullaniciGuvenlikMenusu
          visible={guvenlikAcik}
          targetUserId={userId}
          targetName={ad}
          isGuest={!!isGuest}
          contentType="user"
          onClose={() => setGuvenlikAcik(false)}
          onBlocked={() => {
            setGuvenlikAcik(false);
            onClose();
          }}
        />
      ) : null}
    </>
  );
}

export const OdaProfilKartiPaneli = memo(OdaProfilKartiPaneliInner);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  perde: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: BoslukTokenlari.md,
    paddingTop: 10,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderColor: 'rgba(240,180,41,0.35)',
    zIndex: 2,
    elevation: 8,
  },
  cekmeCubugu: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,224,138,0.45)',
    marginBottom: 12,
  },
  baslikSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    zIndex: 3,
  },
  baslik: {
    ...TipografiTokenlari.title,
    color: '#FFE08A',
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
    paddingRight: 8,
  },
  kapatBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.45)',
  },
  scroll: { flex: 1 },
  scrollIc: { paddingBottom: 8, gap: 12 },
  kartCerceve: {
    borderRadius: 20,
    padding: 1.5,
  },
  kartIc: {
    borderRadius: 18.5,
    backgroundColor: 'rgba(18, 12, 6, 0.96)',
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  avatarWrap: {
    marginBottom: 12,
    position: 'relative',
  },
  buyutRozet: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0B429',
    borderWidth: 1.5,
    borderColor: '#2A1800',
  },
  ad: {
    ...TipografiTokenlari.title,
    color: '#FFF6D6',
    fontWeight: '900',
    fontSize: 22,
    textAlign: 'center',
  },
  handle: {
    ...TipografiTokenlari.caption,
    color: 'rgba(255,224,138,0.75)',
    marginTop: 4,
    fontWeight: '600',
  },
  seviyePill: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(240,180,41,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(240,180,41,0.4)',
  },
  seviyeText: {
    ...TipografiTokenlari.micro,
    color: '#FFE08A',
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  bio: {
    ...TipografiTokenlari.body,
    color: 'rgba(255,246,214,0.72)',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  sosyalSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    gap: 8,
  },
  sosyalStat: {
    alignItems: 'center',
    minWidth: 88,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(240,180,41,0.1)',
  },
  sosyalDeger: {
    ...TipografiTokenlari.body,
    color: '#FFE08A',
    fontWeight: '800',
  },
  sosyalEtiket: {
    ...TipografiTokenlari.micro,
    color: 'rgba(255,224,138,0.6)',
    marginTop: 2,
  },
  istatistikler: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },
  stat: {
    alignItems: 'center',
    minWidth: 88,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(240,180,41,0.1)',
  },
  statAyir: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(240,180,41,0.25)',
  },
  statEmoji: {
    fontSize: 16,
  },
  statDeger: {
    ...TipografiTokenlari.body,
    color: '#FFE08A',
    fontWeight: '800',
    marginTop: 4,
  },
  statEtiket: {
    ...TipografiTokenlari.micro,
    color: 'rgba(255,224,138,0.6)',
    marginTop: 2,
  },
  takipWrap: {
    marginTop: 4,
    gap: 10,
  },
  guvenlikBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,224,138,0.35)',
    backgroundColor: 'rgba(255,224,138,0.08)',
  },
  guvenlikBtnYazi: {
    ...TipografiTokenlari.caption,
    color: '#FFE08A',
    fontWeight: '700',
  },
  cta: {
    marginTop: 4,
    borderRadius: 16,
    overflow: 'hidden',
  },
  ctaIc: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  ctaText: {
    ...TipografiTokenlari.body,
    color: '#2A1800',
    fontWeight: '800',
  },
});
