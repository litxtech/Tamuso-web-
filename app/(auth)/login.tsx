import React, { useCallback, useState } from 'react';
import {
  Alert,
  I18nManager,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { Link, router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TextField } from '../../src/components/TextField';
import { GradientButton } from '../../src/components/GradientButton';
import { KlavyeKapatan } from '../../src/components/KlavyeKapatan';
import { KlavyeGuvenliAlan } from '../../src/bilesenler/klavye/KlavyeGuvenliAlan';
import { GirisLobiArkaPlan } from '../../src/moduller/giris-lobisi/bilesenler/GirisLobiArkaPlan';
import { GirisLobiDilSecici } from '../../src/moduller/giris-lobisi/bilesenler/GirisLobiDilSecici';
import { GirisLobisiPublicGet } from '../../src/moduller/giris-lobisi/islemler/GirisLobisiPublicGet';
import {
  GirisLobisiOnbellekDisktenYukle,
  GirisLobisiOnbellektenAl,
} from '../../src/moduller/giris-lobisi/onbellek/GirisLobisiOnbellek';
import { useGirisLobisiCanli } from '../../src/moduller/giris-lobisi/kancalar/useGirisLobisiCanli';
import {
  VARSAYILAN_GIRIS_LOBISI_AYAR,
  type GirisLobisiAyar,
  type GirisLobisiMedya,
} from '../../src/moduller/giris-lobisi/tipler';
import { useAuth } from '../../src/contexts/AuthContext';
import { useCeviri } from '../../src/i18n/useCeviri';
import { GirisLobiOturumGecmisi } from '../../src/moduller/kimlik-dogrulama/oturum-gecmisi/bilesenler/GirisLobiOturumGecmisi';
import type { OturumGecmisiKaydi } from '../../src/moduller/kimlik-dogrulama/oturum-gecmisi/tipler';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { MedyaUriGuvenli } from '../../src/moduller/mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { useTema } from '../../src/tasarim-sistemi/tema/TemaSaglayici';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { env } from '../../src/lib/env';
import { PolitikaOkumaPaneli } from '../../src/moduller/politikalar/bilesenler/PolitikaOkumaPaneli';
import { PolitikalariListele } from '../../src/moduller/politikalar/islemler/PolitikaIslemleri';
import type { PolitikaGorunum } from '../../src/moduller/politikalar/tipler/PolitikaTipleri';
import { SPOTIFY_GIRIS_AKTIF } from '../../src/moduller/kimlik-dogrulama/giris/SpotifyGirisAktif';
import { TWITCH_GIRIS_AKTIF } from '../../src/moduller/kimlik-dogrulama/giris/TwitchGirisAktif';
import { X_GIRIS_AKTIF } from '../../src/moduller/kimlik-dogrulama/giris/XGirisAktif';
import { GOOGLE_GIRIS_AKTIF } from '../../src/moduller/kimlik-dogrulama/giris/GoogleGirisAktif';

const SPOTIFY_GREEN = '#1DB954';
const TWITCH_PURPLE = '#9146FF';
const X_BLACK = '#000000';
const GOOGLE_WHITE = '#FFFFFF';

/**
 * Giriş lobisi — metin/logo/medya admin panelinden gelir.
 * Medya yoksa modern gradient. Form Modal üstünde (VideoView z-order).
 */
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { palet } = useTema();
  const { t } = useCeviri();
  const {
    signIn,
    signInWithApple,
    signInWithSpotify,
    signInWithTwitch,
    signInWithX,
    signInWithGoogle,
    continueAsGuest,
    signInFromHistory,
  } = useAuth();
  const [kimlik, setKimlik] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [twitchLoading, setTwitchLoading] = useState(false);
  const [xLoading, setXLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [gecmisBusyId, setGecmisBusyId] = useState<string | null>(null);
  const onbellekBaslangic = GirisLobisiOnbellektenAl();
  const [ayar, setAyar] = useState<GirisLobisiAyar>(
    () => onbellekBaslangic?.ayar ?? VARSAYILAN_GIRIS_LOBISI_AYAR,
  );
  const [medya, setMedya] = useState<GirisLobisiMedya[]>(
    () => onbellekBaslangic?.medya ?? [],
  );
  /** Modal native katmanda stack üstünde kalır; blur'da kapatılmazsa kayıt formunu engeller. */
  const [lobiOdakli, setLobiOdakli] = useState(true);
  const [girisPolitikalari, setGirisPolitikalari] = useState<PolitikaGorunum[]>(
    [],
  );
  const [okunanPolitika, setOkunanPolitika] = useState<PolitikaGorunum | null>(
    null,
  );

  useFocusEffect(
    useCallback(() => {
      let iptal = false;
      setLobiOdakli(true);

      void (async () => {
        const disk =
          GirisLobisiOnbellektenAl() ??
          (await GirisLobisiOnbellekDisktenYukle());
        if (!iptal && disk) {
          setAyar(disk.ayar);
          setMedya(disk.medya);
        }
        const [d, pol] = await Promise.all([
          GirisLobisiPublicGet(),
          PolitikalariListele('login').catch(() => [] as PolitikaGorunum[]),
        ]);
        if (iptal) return;
        setAyar(d.ayar);
        setMedya(d.medya);
        setGirisPolitikalari(pol);
      })();

      return () => {
        iptal = true;
        setLobiOdakli(false);
      };
    }, []),
  );

  const lobiyiUygula = useCallback(
    (d: { ayar: GirisLobisiAyar; medya: GirisLobisiMedya[] }) => {
      setAyar(d.ayar);
      setMedya(d.medya);
    },
    [],
  );
  useGirisLobisiCanli(lobiyiUygula, lobiOdakli);

  const tumButonlarGizli = Boolean(ayar.tum_butonlar_gizle);
  const sosyalGizli =
    tumButonlarGizli || Boolean(ayar.sosyal_medya_gizle);

  const onSubmit = async () => {
    if (!kimlik.trim() || !password) {
      Alert.alert(t('auth.eksikBilgi'), t('auth.eksikBilgiMesaj'));
      return;
    }
    setLoading(true);
    const { error } = await signIn(kimlik.trim(), password);
    setLoading(false);
    if (error) {
      Alert.alert(t('auth.girisBasarisiz'), error);
      return;
    }
    router.replace('/(tabs)');
  };

  const onApple = async () => {
    setAppleLoading(true);
    const { error, cancelled, redirected } = await signInWithApple();
    setAppleLoading(false);
    if (cancelled || redirected) return;
    if (error) {
      Alert.alert(t('auth.appleGirisi'), error);
      return;
    }
    router.replace('/(tabs)');
  };

  const onSpotify = async () => {
    setSpotifyLoading(true);
    const { error, cancelled, redirected } = await signInWithSpotify();
    setSpotifyLoading(false);
    if (cancelled || redirected) return;
    if (error) {
      Alert.alert(t('auth.spotifyGirisi'), error);
      return;
    }
    router.replace('/(tabs)');
  };

  const onTwitch = async () => {
    setTwitchLoading(true);
    const { error, cancelled, redirected } = await signInWithTwitch();
    setTwitchLoading(false);
    if (cancelled || redirected) return;
    if (error) {
      Alert.alert(t('auth.twitchGirisi'), error);
      return;
    }
    router.replace('/(tabs)');
  };

  const onX = async () => {
    setXLoading(true);
    const { error, cancelled, redirected } = await signInWithX();
    setXLoading(false);
    if (cancelled || redirected) return;
    if (error) {
      Alert.alert(t('auth.xGirisi'), error);
      return;
    }
    router.replace('/(tabs)');
  };

  const onGoogle = async () => {
    setGoogleLoading(true);
    const { error, cancelled, redirected } = await signInWithGoogle();
    setGoogleLoading(false);
    if (cancelled || redirected) return;
    if (error) {
      Alert.alert(t('auth.googleGirisi'), error);
      return;
    }
    router.replace('/(tabs)');
  };

  const onGuest = async () => {
    setGuestLoading(true);
    const { error } = await continueAsGuest();
    setGuestLoading(false);
    if (error) {
      Alert.alert(t('auth.misafirGirisi'), error);
      return;
    }
    router.replace('/(tabs)');
  };

  const onGecmisSec = async (kayit: OturumGecmisiKaydi) => {
    setGecmisBusyId(kayit.userId);
    const sonuc = await signInFromHistory(kayit);
    setGecmisBusyId(null);
    if (sonuc.ok) {
      router.replace('/(tabs)');
      return;
    }
    if (sonuc.needsPassword) {
      const k = (sonuc.kimlik ?? kayit.kimlik ?? kayit.username ?? '').trim();
      if (k) setKimlik(k);
      setPassword('');
      Alert.alert(t('auth.tekrarGiris'), sonuc.hata);
      return;
    }
    Alert.alert(t('auth.girisBasarisiz'), sonuc.hata);
  };

  const heroVar =
    ayar.logo_goster ||
    ayar.marka_goster ||
    ayar.slogan_goster ||
    Boolean(ayar.ust_metin?.trim());

  return (
    <View style={styles.root}>
      <GirisLobiArkaPlan medya={medya} aktif={lobiOdakli} />

      {lobiOdakli ? (
        <View style={styles.modalRoot} pointerEvents="box-none">
          <KlavyeGuvenliAlan
            style={[
              styles.flex,
              {
                paddingTop: insets.top + 12,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <KlavyeKapatan style={styles.dismiss}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scroll}
              >
                <View style={styles.dilSatir}>
                  <GirisLobiDilSecici />
                </View>

                {heroVar ? (
                  <View style={styles.hero}>
                    {ayar.logo_goster ? (
                      MedyaUriGuvenli(ayar.logo_url) ? (
                        <Image
                          source={{ uri: MedyaUriGuvenli(ayar.logo_url)! }}
                          style={styles.logoImg}
                          resizeMode="contain"
                        />
                      ) : (
                        <LinearGradient
                          colors={[...RenkTokenlari.gradientPrimary]}
                          style={styles.logoBlob}
                        >
                          <Text style={styles.logoMark}>
                            {(ayar.logo_harf || 'M').slice(0, 2)}
                          </Text>
                        </LinearGradient>
                      )
                    ) : null}
                    {ayar.marka_goster && ayar.marka_adi ? (
                      <Text style={styles.brand}>{ayar.marka_adi}</Text>
                    ) : null}
                    {ayar.slogan_goster && ayar.slogan ? (
                      <Text style={styles.tagline}>{ayar.slogan}</Text>
                    ) : null}
                    {ayar.ust_metin ? (
                      <Text style={styles.ustMetin}>{ayar.ust_metin}</Text>
                    ) : null}
                    {env.appEnv !== 'production' ? (
                      <Text style={styles.envBadge}>
                        {env.appEnv.toUpperCase()}
                      </Text>
                    ) : null}
                  </View>
                ) : env.appEnv !== 'production' ? (
                  <View style={styles.hero}>
                    <Text style={styles.envBadge}>
                      {env.appEnv.toUpperCase()}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.heroBos} />
                )}

                {!tumButonlarGizli ? (
                  <GirisLobiOturumGecmisi
                    onSec={onGecmisSec}
                    busyUserId={gecmisBusyId}
                  />
                ) : null}

                {!tumButonlarGizli ? (
                  <View style={styles.formKart}>
                    <Text style={styles.formBaslik}>
                      {!ayar.form_baslik.trim() ||
                      ayar.form_baslik.trim() === 'Giri\u015f' ||
                      ayar.form_baslik.trim() === t('auth.giris')
                        ? t('auth.giris')
                        : ayar.form_baslik}
                    </Text>
                    {ayar.form_alt ? (
                      <Text style={styles.formAlt}>{ayar.form_alt}</Text>
                    ) : null}

                    <TextField
                      label={t('auth.mailVeyaKullaniciAdi')}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="default"
                      textContentType="username"
                      value={kimlik}
                      onChangeText={setKimlik}
                      returnKeyType="next"
                      style={styles.inputCam}
                    />
                    <TextField
                      label={t('auth.sifre')}
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                      returnKeyType="done"
                      blurOnSubmit
                      onSubmitEditing={() => void onSubmit()}
                      style={styles.inputCam}
                    />
                    <Link href="/(auth)/forgot-password" asChild>
                      <Pressable>
                        <Text style={styles.forgot}>
                          {t('auth.sifremiUnuttum')}
                        </Text>
                      </Pressable>
                    </Link>
                    <GradientButton
                      title={t('auth.giris')}
                      onPress={onSubmit}
                      loading={loading}
                    />
                    {!sosyalGizli && SPOTIFY_GIRIS_AKTIF ? (
                      <Pressable
                        onPress={() => void onSpotify()}
                        disabled={spotifyLoading}
                        style={[
                          styles.spotifyBtn,
                          spotifyLoading && styles.spotifyDisabled,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={t('auth.spotifyIleGiris')}
                      >
                        <Ionicons
                          name="musical-notes"
                          size={20}
                          color="#121212"
                        />
                        <Text style={styles.spotifyText}>
                          {spotifyLoading
                            ? t('auth.spotifyBaglaniyor')
                            : t('auth.spotifyIleDevam')}
                        </Text>
                      </Pressable>
                    ) : null}
                    {!sosyalGizli && TWITCH_GIRIS_AKTIF ? (
                      <Pressable
                        onPress={() => void onTwitch()}
                        disabled={twitchLoading}
                        style={[
                          styles.twitchBtn,
                          twitchLoading && styles.twitchDisabled,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={t('auth.twitchIleGiris')}
                      >
                        <Ionicons name="logo-twitch" size={20} color="#fff" />
                        <Text style={styles.twitchText}>
                          {twitchLoading
                            ? t('auth.twitchBaglaniyor')
                            : t('auth.twitchIleDevam')}
                        </Text>
                      </Pressable>
                    ) : null}
                    {!sosyalGizli && X_GIRIS_AKTIF ? (
                      <Pressable
                        onPress={() => void onX()}
                        disabled={xLoading}
                        style={[styles.xBtn, xLoading && styles.xDisabled]}
                        accessibilityRole="button"
                        accessibilityLabel={t('auth.xIleGiris')}
                      >
                        <Text style={styles.xLogo}>𝕏</Text>
                        <Text style={styles.xText}>
                          {xLoading
                            ? t('auth.xBaglaniyor')
                            : t('auth.xIleDevam')}
                        </Text>
                      </Pressable>
                    ) : null}
                    {!sosyalGizli && GOOGLE_GIRIS_AKTIF ? (
                      <Pressable
                        onPress={() => void onGoogle()}
                        disabled={googleLoading}
                        style={[
                          styles.googleBtn,
                          googleLoading && styles.googleDisabled,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={t('auth.googleIleGiris')}
                      >
                        <MaterialCommunityIcons
                          name="google"
                          size={20}
                          color="#4285F4"
                        />
                        <Text style={styles.googleText}>
                          {googleLoading
                            ? t('auth.googleBaglaniyor')
                            : t('auth.googleIleDevam')}
                        </Text>
                      </Pressable>
                    ) : null}
                    {!sosyalGizli && Platform.OS === 'web' ? (
                      <Pressable
                        onPress={() => void onApple()}
                        disabled={appleLoading}
                        style={[
                          styles.appleWebBtn,
                          appleLoading && styles.appleWebDisabled,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={t('auth.appleGirisi')}
                      >
                        <Ionicons name="logo-apple" size={20} color="#fff" />
                        <Text style={styles.appleWebText}>
                          {appleLoading
                            ? t('auth.appleBaglaniyor')
                            : t('auth.appleIleDevam')}
                        </Text>
                      </Pressable>
                    ) : null}
                    {!sosyalGizli && Platform.OS === 'ios' ? (
                      <View style={styles.appleWrap}>
                        <AppleAuthentication.AppleAuthenticationButton
                          buttonType={
                            AppleAuthentication.AppleAuthenticationButtonType
                              .SIGN_IN
                          }
                          buttonStyle={
                            palet.statusBar === 'dark'
                              ? AppleAuthentication
                                  .AppleAuthenticationButtonStyle.BLACK
                              : AppleAuthentication
                                  .AppleAuthenticationButtonStyle.WHITE
                          }
                          cornerRadius={14}
                          style={styles.appleBtn}
                          onPress={onApple}
                        />
                        {appleLoading ? (
                          <Text style={styles.appleHint}>
                            {t('auth.appleBaglaniyor')}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                    {/* Apple 1.2: production’da misafir = anonim UGC riski — kapalı */}
                    {env.appEnv !== 'production' ? (
                      <GradientButton
                        title={t('auth.misafirDevam')}
                        variant="ghost"
                        onPress={onGuest}
                        loading={guestLoading}
                      />
                    ) : null}
                    <Link href="/(auth)/register" asChild>
                      <Pressable
                        style={styles.switchRow}
                        onPress={() => setLobiOdakli(false)}
                      >
                        <Text style={styles.switchText}>
                          {t('auth.hesabinYokMu')}{' '}
                        </Text>
                        <Text style={styles.switchLink}>{t('auth.kayit')}</Text>
                      </Pressable>
                    </Link>
                  </View>
                ) : null}

                <View style={styles.politikaAlt}>
                  {girisPolitikalari.map((p, i) => (
                    <React.Fragment key={p.kod}>
                      {i > 0 ? (
                        <Text style={styles.politikaAyir}>·</Text>
                      ) : null}
                      <Pressable
                        onPress={() => setOkunanPolitika(p)}
                        hitSlop={6}
                        accessibilityRole="link"
                        accessibilityLabel={p.linkEtiketi}
                      >
                        <Text
                          style={[
                            styles.politikaLink,
                            p.kod === 'child_safety' &&
                              styles.politikaLinkCocuk,
                          ]}
                        >
                          {p.linkEtiketi}
                        </Text>
                      </Pressable>
                    </React.Fragment>
                  ))}
                </View>
                <Text style={styles.destekAlt}>{t('auth.destek')}</Text>
              </ScrollView>
            </KlavyeKapatan>
          </KlavyeGuvenliAlan>
        </View>
      ) : null}

      <PolitikaOkumaPaneli
        politika={okunanPolitika}
        onKapat={() => setOkunanPolitika(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: RenkTokenlari.bg,
  },
  modalRoot: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
  },
  flex: {
    flex: 1,
    paddingHorizontal: BoslukTokenlari.xl,
  },
  dismiss: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'space-between',
    gap: BoslukTokenlari.xl,
    paddingBottom: BoslukTokenlari.lg,
  },
  dilSatir: {
    alignItems: 'flex-end',
    marginBottom: -BoslukTokenlari.sm,
  },
  hero: {
    alignItems: 'center',
    paddingTop: BoslukTokenlari.lg,
    gap: BoslukTokenlari.sm,
  },
  heroBos: { height: 24 },
  logoBlob: {
    width: 76,
    height: 76,
    borderRadius: YaricapTokenlari.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  logoImg: {
    width: 88,
    height: 88,
    marginBottom: 4,
  },
  logoMark: { fontSize: 36, fontWeight: '900', color: '#12040C' },
  brand: {
    ...TipografiTokenlari.hero,
    color: RenkTokenlari.text,
  },
  tagline: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
  },
  ustMetin: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  envBadge: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.accent,
    marginTop: 4,
    borderWidth: 1,
    borderColor: RenkTokenlari.accent,
    paddingHorizontal: BoslukTokenlari.md,
    paddingVertical: BoslukTokenlari.xs,
    borderRadius: YaricapTokenlari.pill,
    overflow: 'hidden',
    backgroundColor: RenkTokenlari.surface,
  },
  formKart: {
    gap: BoslukTokenlari.md,
    padding: BoslukTokenlari.lg,
    borderRadius: 22,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  formBaslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
  },
  formAlt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    marginTop: -6,
    marginBottom: 4,
  },
  inputCam: {
    backgroundColor: RenkTokenlari.surface,
    borderColor: RenkTokenlari.border,
  },
  forgot: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    textAlign: I18nManager.isRTL ? 'left' : 'right',
  },
  spotifyBtn: {
    minHeight: 48,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: SPOTIFY_GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: BoslukTokenlari.sm,
    paddingHorizontal: BoslukTokenlari.lg,
  },
  spotifyDisabled: { opacity: 0.7 },
  spotifyText: {
    ...TipografiTokenlari.body,
    color: '#121212',
    fontWeight: '700',
  },
  twitchBtn: {
    minHeight: 48,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: TWITCH_PURPLE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: BoslukTokenlari.sm,
    paddingHorizontal: BoslukTokenlari.lg,
  },
  twitchDisabled: { opacity: 0.7 },
  twitchText: {
    ...TipografiTokenlari.body,
    color: '#fff',
    fontWeight: '700',
  },
  xBtn: {
    minHeight: 48,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: X_BLACK,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: BoslukTokenlari.sm,
    paddingHorizontal: BoslukTokenlari.lg,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  xDisabled: { opacity: 0.7 },
  xLogo: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  xText: {
    ...TipografiTokenlari.body,
    color: '#fff',
    fontWeight: '700',
  },
  googleBtn: {
    minHeight: 48,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: GOOGLE_WHITE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: BoslukTokenlari.sm,
    paddingHorizontal: BoslukTokenlari.lg,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  googleDisabled: { opacity: 0.7 },
  googleText: {
    ...TipografiTokenlari.body,
    color: '#3C4043',
    fontWeight: '700',
  },
  appleWebBtn: {
    minHeight: 48,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: BoslukTokenlari.sm,
    paddingHorizontal: BoslukTokenlari.lg,
  },
  appleWebDisabled: { opacity: 0.7 },
  appleWebText: {
    ...TipografiTokenlari.body,
    color: '#fff',
    fontWeight: '700',
  },
  appleWrap: { gap: BoslukTokenlari.sm },
  appleBtn: { width: '100%', height: 48 },
  appleHint: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
  switchText: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
  },
  switchLink: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
  politikaAlt: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: BoslukTokenlari.sm,
    paddingBottom: BoslukTokenlari.sm,
  },
  politikaAyir: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
  },
  politikaLink: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    textDecorationLine: 'underline',
  },
  politikaLinkCocuk: {
    color: RenkTokenlari.primarySoft,
    fontWeight: '600',
  },
  destekAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    textAlign: 'center',
    paddingBottom: BoslukTokenlari.md,
  },
});
