import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { GradientButton } from '../../src/components/GradientButton';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { KlavyeKapatan } from '../../src/components/KlavyeKapatan';
import { KlavyeGuvenliAlan } from '../../src/bilesenler/klavye/KlavyeGuvenliAlan';
import { useAuth } from '../../src/contexts/AuthContext';
import { ImagePickerOnIsit } from '../../src/ortak/medya/ImagePickerHazirMi';
import { KayitBekleyenAvatarAyarla } from '../../src/moduller/kimlik-dogrulama/depolama/KayitBekleyenAvatar';
import {
  ProfilMedyasiSec,
  ProfilMedyasiUriIleYukle,
  type SecilenProfilMedya,
} from '../../src/moduller/kullanici-profili/islemler/ProfilMedyasiYukle';
import {
  PolitikaOnayKutulari,
  TumPolitikaOnaylariVerildi,
} from '../../src/moduller/politikalar/bilesenler/PolitikaOnayKutulari';
import { PolitikaOkumaPaneli } from '../../src/moduller/politikalar/bilesenler/PolitikaOkumaPaneli';
import {
  KayitPolitikaKabulKaydet,
  PolitikalariListele,
} from '../../src/moduller/politikalar/islemler/PolitikaIslemleri';
import type { PolitikaGorunum } from '../../src/moduller/politikalar/tipler/PolitikaTipleri';
import { ProfilSecimAlani } from '../../src/moduller/kullanici-profili/bilesenler/ProfilSecimAlani';
import {
  DOGUM_AYLARI,
  DogumGunSecenekleri,
  DogumYilSecenekleri,
} from '../../src/moduller/kimlik-dogrulama/yas/YasKapisi';
import {
  KayitAlanAyarlariOnbellektenAl,
  KayitAlanAyarlariPublicGet,
} from '../../src/moduller/kimlik-dogrulama/kayit-alanlari/KayitAlanAyarlariPublicGet';
import {
  KayitAlanEtiketi,
  KayitFormunuDogrula,
} from '../../src/moduller/kimlik-dogrulama/kayit-alanlari/KayitFormunuDogrula';
import {
  AlanGorunurMu,
  AlanZorunluMu,
  VARSAYILAN_KAYIT_ALAN_AYARLARI,
  type KayitAlanAyarlari,
} from '../../src/moduller/kimlik-dogrulama/kayit-alanlari/tipler';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../src/i18n/useCeviri';
import { SPOTIFY_GIRIS_AKTIF } from '../../src/moduller/kimlik-dogrulama/giris/SpotifyGirisAktif';
import { TWITCH_GIRIS_AKTIF } from '../../src/moduller/kimlik-dogrulama/giris/TwitchGirisAktif';
import { X_GIRIS_AKTIF } from '../../src/moduller/kimlik-dogrulama/giris/XGirisAktif';
import { GOOGLE_GIRIS_AKTIF } from '../../src/moduller/kimlik-dogrulama/giris/GoogleGirisAktif';

const YIL_OPTS = DogumYilSecenekleri(18);
const SPOTIFY_GREEN = '#1DB954';
const TWITCH_PURPLE = '#9146FF';
const X_BLACK = '#000000';
const GOOGLE_WHITE = '#FFFFFF';

export default function RegisterScreen() {
  const { t } = useCeviri();
  const {
    signUp,
    signInWithSpotify,
    signInWithTwitch,
    signInWithX,
    signInWithGoogle,
    refreshProfile,
  } = useAuth();
  const genders = [
    { id: 'female', label: t('auth.cinsiyetKadin') },
    { id: 'male', label: t('auth.cinsiyetErkek') },
    { id: 'other', label: t('auth.cinsiyetDiger') },
  ] as const;
  const [ayarHam, setAyarHam] = useState<KayitAlanAyarlari>(
    () => KayitAlanAyarlariOnbellektenAl() ?? VARSAYILAN_KAYIT_ALAN_AYARLARI,
  );
  /** Apple 1.2: doğum tarihi her zaman zorunlu (18+ kanıtı) */
  const ayar = useMemo<KayitAlanAyarlari>(
    () => ({
      ...ayarHam,
      alanlar: { ...ayarHam.alanlar, birth_date: 'required' },
    }),
    [ayarHam],
  );
  const [ayarYukleniyor, setAyarYukleniyor] = useState(
    !KayitAlanAyarlariOnbellektenAl(),
  );
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState<string>('');
  const [dogumYil, setDogumYil] = useState('');
  const [dogumAy, setDogumAy] = useState('');
  const [dogumGun, setDogumGun] = useState('');
  const [ozelDegerler, setOzelDegerler] = useState<Record<string, string>>({});
  const [avatar, setAvatar] = useState<SecilenProfilMedya | null>(null);
  const [loading, setLoading] = useState(false);
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [twitchLoading, setTwitchLoading] = useState(false);
  const [xLoading, setXLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [kayitPolitikalari, setKayitPolitikalari] = useState<PolitikaGorunum[]>(
    [],
  );
  const [onaylar, setOnaylar] = useState<Record<string, boolean>>({});
  const [okunan, setOkunan] = useState<PolitikaGorunum | null>(null);
  /** Beyan edilen yaş — kimlik doğrulanmış yaş değildir */
  const [yas18Beyani, setYas18Beyani] = useState(false);

  const ayarlariYukle = useCallback(async () => {
    setAyarYukleniyor(true);
    const [d, pol] = await Promise.all([
      KayitAlanAyarlariPublicGet(),
      PolitikalariListele('register').catch(() => [] as PolitikaGorunum[]),
    ]);
    setAyarHam(d);
    setKayitPolitikalari(pol);
    setOnaylar((prev) => {
      const next: Record<string, boolean> = {};
      for (const p of pol) next[p.kod] = prev[p.kod] ?? false;
      return next;
    });
    setAyarYukleniyor(false);
  }, []);

  useEffect(() => {
    ImagePickerOnIsit({ izinIste: false });
    void ayarlariYukle();
  }, [ayarlariYukle]);

  const avatarSec = async () => {
    const secim = await ProfilMedyasiSec('avatar');
    if (!secim.ok) {
      if (!secim.iptal) Alert.alert(t('auth.fotograf'), secim.hata);
      return;
    }
    setAvatar(secim.medya);
  };

  const onSpotify = async () => {
    if (!TumPolitikaOnaylariVerildi(kayitPolitikalari, onaylar)) {
      Alert.alert(t('auth.yasalOnay'), t('auth.yasalOnaySpotify'));
      return;
    }
    if (!yas18Beyani) {
      Alert.alert(t('auth.yasBeyani'), t('auth.yasBeyaniMesaj'));
      return;
    }
    setSpotifyLoading(true);
    const { error, cancelled } = await signInWithSpotify();
    setSpotifyLoading(false);
    if (cancelled) return;
    if (error) {
      Alert.alert(t('auth.spotifyKaydi'), error);
      return;
    }
    const kabul = await KayitPolitikaKabulKaydet(
      kayitPolitikalari.map((p) => p.kod),
    );
    if (!kabul.ok) {
      Alert.alert(
        t('auth.yasalOnay'),
        kabul.hata ?? t('auth.politikaKaydiBasarisiz'),
      );
    }
    router.replace('/(tabs)');
  };

  const onTwitch = async () => {
    if (!TumPolitikaOnaylariVerildi(kayitPolitikalari, onaylar)) {
      Alert.alert(t('auth.yasalOnay'), t('auth.yasalOnayTwitch'));
      return;
    }
    if (!yas18Beyani) {
      Alert.alert(t('auth.yasBeyani'), t('auth.yasBeyaniMesaj'));
      return;
    }
    setTwitchLoading(true);
    const { error, cancelled } = await signInWithTwitch();
    setTwitchLoading(false);
    if (cancelled) return;
    if (error) {
      Alert.alert(t('auth.twitchKaydi'), error);
      return;
    }
    const kabul = await KayitPolitikaKabulKaydet(
      kayitPolitikalari.map((p) => p.kod),
    );
    if (!kabul.ok) {
      Alert.alert(
        t('auth.yasalOnay'),
        kabul.hata ?? t('auth.politikaKaydiBasarisiz'),
      );
    }
    router.replace('/(tabs)');
  };

  const onX = async () => {
    if (!TumPolitikaOnaylariVerildi(kayitPolitikalari, onaylar)) {
      Alert.alert(t('auth.yasalOnay'), t('auth.yasalOnayX'));
      return;
    }
    if (!yas18Beyani) {
      Alert.alert(t('auth.yasBeyani'), t('auth.yasBeyaniMesaj'));
      return;
    }
    setXLoading(true);
    const { error, cancelled } = await signInWithX();
    setXLoading(false);
    if (cancelled) return;
    if (error) {
      Alert.alert(t('auth.xKaydi'), error);
      return;
    }
    const kabul = await KayitPolitikaKabulKaydet(
      kayitPolitikalari.map((p) => p.kod),
    );
    if (!kabul.ok) {
      Alert.alert(
        t('auth.yasalOnay'),
        kabul.hata ?? t('auth.politikaKaydiBasarisiz'),
      );
    }
    router.replace('/(tabs)');
  };

  const onGoogle = async () => {
    if (!TumPolitikaOnaylariVerildi(kayitPolitikalari, onaylar)) {
      Alert.alert(t('auth.yasalOnay'), t('auth.yasalOnayGoogle'));
      return;
    }
    if (!yas18Beyani) {
      Alert.alert(t('auth.yasBeyani'), t('auth.yasBeyaniMesaj'));
      return;
    }
    setGoogleLoading(true);
    const { error, cancelled } = await signInWithGoogle();
    setGoogleLoading(false);
    if (cancelled) return;
    if (error) {
      Alert.alert(t('auth.googleKaydi'), error);
      return;
    }
    const kabul = await KayitPolitikaKabulKaydet(
      kayitPolitikalari.map((p) => p.kod),
    );
    if (!kabul.ok) {
      Alert.alert(
        t('auth.yasalOnay'),
        kabul.hata ?? t('auth.politikaKaydiBasarisiz'),
      );
    }
    router.replace('/(tabs)');
  };

  const onSubmit = async () => {
    const dogrulama = KayitFormunuDogrula(ayar, {
      username,
      displayName,
      password,
      phone,
      email,
      gender,
      dogumYil,
      dogumAy,
      dogumGun,
      avatarVar: !!avatar,
      ozelDegerler,
    });
    if (!dogrulama.ok) {
      Alert.alert(t('auth.eksikBilgi'), dogrulama.hata);
      return;
    }
    if (!TumPolitikaOnaylariVerildi(kayitPolitikalari, onaylar)) {
      Alert.alert(t('auth.yasalOnay'), t('auth.yasalOnayKayit'));
      return;
    }
    if (!yas18Beyani) {
      Alert.alert(t('auth.yasBeyani'), t('auth.yasBeyaniMesaj'));
      return;
    }
    setLoading(true);
    const result = await signUp({
      phone: dogrulama.phone,
      email: dogrulama.email,
      password,
      username,
      displayName,
      gender: dogrulama.gender,
      birthDate: dogrulama.birthDate,
      customFields: dogrulama.customFields,
    });
    if (!result.error) {
      const kabul = await KayitPolitikaKabulKaydet(
        kayitPolitikalari.map((p) => p.kod),
      );
      if (!kabul.ok) {
        setLoading(false);
        Alert.alert(
          t('auth.yasalOnay'),
          kabul.hata ?? t('auth.politikaKaydedilemedi'),
        );
        return;
      }
      try {
        const { supabase } = await import('../../src/lib/supabase');
        await supabase
          .from('profiles')
          .update({ age_confirmed_at: new Date().toISOString() })
          .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '');
      } catch {
        /* kolon yoksa sessiz */
      }
    }
    if (result.error) {
      setLoading(false);
      Alert.alert(t('auth.kayitBasarisiz'), result.error);
      return;
    }
    if (result.needsConfirm) {
      setLoading(false);
      const mail = (dogrulama.email ?? '').toLowerCase();
      if (!mail.includes('@')) {
        Alert.alert(t('auth.epostaGerekli'), t('auth.epostaGerekliMesaj'));
        return;
      }
      KayitBekleyenAvatarAyarla(avatar);
      router.replace({
        pathname: '/(auth)/dogrula-kod',
        params: { email: mail, amac: 'signup' },
      });
      return;
    }
    if (avatar) {
      await ProfilMedyasiUriIleYukle('avatar', avatar.uri, avatar.mimeType);
      await refreshProfile();
    }
    setLoading(false);
    router.replace('/(tabs)');
  };

  const phoneGorunur = AlanGorunurMu(ayar.alanlar.phone);
  const emailGorunur = AlanGorunurMu(ayar.alanlar.email);
  const genderGorunur = AlanGorunurMu(ayar.alanlar.gender);
  const birthGorunur = AlanGorunurMu(ayar.alanlar.birth_date);
  const avatarGorunur = AlanGorunurMu(ayar.alanlar.avatar);

  return (
    <Screen edges={['top']}>
      <KlavyeGuvenliAlan style={styles.flex}>
        <EkranBasligi
          title={t('auth.kayitBaslik')}
          subtitle={t('auth.kayitAltBaslik')}
          onBack={() => router.back()}
        />
        {ayarYukleniyor ? (
          <View style={styles.yukleniyor}>
            <ActivityIndicator color={RenkTokenlari.primarySoft} />
          </View>
        ) : null}
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <KlavyeKapatan style={styles.formWrap}>
            {avatarGorunur ? (
              <View style={styles.avatarBlok}>
                <Pressable
                  onPress={() => void avatarSec()}
                  style={styles.avatarWrap}
                  accessibilityRole="button"
                  accessibilityLabel={t('auth.profilFotografiSec')}
                >
                  {avatar ? (
                    <Image source={{ uri: avatar.uri }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarBos]}>
                      <Ionicons
                        name="person"
                        size={36}
                        color={RenkTokenlari.textDim}
                      />
                    </View>
                  )}
                  <View style={styles.avatarCam}>
                    <Ionicons name="camera" size={14} color="#12040C" />
                  </View>
                </Pressable>
                <Text style={styles.avatarHint}>
                  {KayitAlanEtiketi(
                    t('auth.profilFotografiEkle'),
                    AlanZorunluMu(ayar.alanlar.avatar),
                  )}
                </Text>
                {avatar ? (
                  <Pressable onPress={() => setAvatar(null)} hitSlop={8}>
                    <Text style={styles.avatarKaldir}>{t('ortak.kaldir')}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {genderGorunur ? (
              <View style={styles.genderRow}>
                {genders.map((g) => (
                  <Pressable
                    key={g.id}
                    onPress={() =>
                      setGender((prev) => (prev === g.id ? '' : g.id))
                    }
                    style={[
                      styles.genderChip,
                      gender === g.id && styles.genderActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.genderText,
                        gender === g.id && styles.genderTextActive,
                      ]}
                    >
                      {g.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {genderGorunur && !AlanZorunluMu(ayar.alanlar.gender) ? (
              <Text style={styles.istegeBagliHint}>
                {t('auth.cinsiyetIstegeBagli')}
              </Text>
            ) : null}

            <TextField
              label={t('auth.kullaniciAdi')}
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
            />
            <TextField
              label={t('auth.gorunenAd')}
              value={displayName}
              onChangeText={setDisplayName}
            />

            {birthGorunur ? (
              <View>
                <Text style={styles.yasEtiket}>
                  {KayitAlanEtiketi(
                    t('profil.dogumTarihi'),
                    AlanZorunluMu(ayar.alanlar.birth_date),
                  )}
                </Text>
                <Text style={styles.yasHint}>{t('auth.yasPlatformHint')}</Text>
                <View style={styles.dogumSatir}>
                  <View style={styles.dogumKol}>
                    <ProfilSecimAlani
                      label={t('auth.yil')}
                      valueLabel={dogumYil}
                      placeholder={t('auth.yil')}
                      options={YIL_OPTS}
                      onSelect={(id) => {
                        setDogumYil(id);
                        const maxGun = DogumGunSecenekleri(
                          id,
                          dogumAy || '01',
                        ).length;
                        if (dogumGun && Number(dogumGun) > maxGun) {
                          setDogumGun('');
                        }
                      }}
                      searchable
                    />
                  </View>
                  <View style={styles.dogumKolKisa}>
                    <ProfilSecimAlani
                      label={t('auth.ay')}
                      valueLabel={dogumAy}
                      placeholder={t('auth.ay')}
                      options={DOGUM_AYLARI}
                      onSelect={(id) => {
                        setDogumAy(id);
                        const maxGun = DogumGunSecenekleri(
                          dogumYil || '2000',
                          id,
                        ).length;
                        if (dogumGun && Number(dogumGun) > maxGun) {
                          setDogumGun('');
                        }
                      }}
                    />
                  </View>
                  <View style={styles.dogumKolKisa}>
                    <ProfilSecimAlani
                      label={t('auth.gun')}
                      valueLabel={dogumGun}
                      placeholder={t('auth.gun')}
                      options={DogumGunSecenekleri(
                        dogumYil || '2000',
                        dogumAy || '01',
                      )}
                      onSelect={setDogumGun}
                    />
                  </View>
                </View>
              </View>
            ) : null}

            {phoneGorunur ? (
              <TextField
                label={KayitAlanEtiketi(
                  t('auth.telefon'),
                  AlanZorunluMu(ayar.alanlar.phone),
                )}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                value={phone}
                onChangeText={setPhone}
              />
            ) : null}
            {emailGorunur ? (
              <TextField
                label={KayitAlanEtiketi(
                  t('auth.eposta'),
                  AlanZorunluMu(ayar.alanlar.email) || !phone.trim(),
                )}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            ) : null}
            <TextField
              label={t('auth.sifre')}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {ayar.ozel_alanlar.map((alan) => {
              if (alan.alan_turu === 'select' && alan.secenekler.length > 0) {
                return (
                  <View key={alan.id}>
                    <Text style={styles.yasEtiket}>
                      {KayitAlanEtiketi(alan.etiket, alan.mod === 'required')}
                    </Text>
                    <View style={styles.genderRow}>
                      {alan.secenekler.map((sec) => {
                        const aktif = ozelDegerler[alan.anahtar] === sec;
                        return (
                          <Pressable
                            key={sec}
                            onPress={() =>
                              setOzelDegerler((prev) => ({
                                ...prev,
                                [alan.anahtar]: aktif ? '' : sec,
                              }))
                            }
                            style={[
                              styles.genderChip,
                              aktif && styles.genderActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.genderText,
                                aktif && styles.genderTextActive,
                              ]}
                            >
                              {sec}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              }
              return (
                <TextField
                  key={alan.id}
                  label={KayitAlanEtiketi(
                    alan.etiket,
                    alan.mod === 'required',
                  )}
                  keyboardType={
                    alan.alan_turu === 'number' ? 'numeric' : 'default'
                  }
                  value={ozelDegerler[alan.anahtar] ?? ''}
                  onChangeText={(metin) =>
                    setOzelDegerler((prev) => ({
                      ...prev,
                      [alan.anahtar]: metin,
                    }))
                  }
                />
              );
            })}

            <Pressable
              onPress={() => setYas18Beyani((v) => !v)}
              style={styles.yasBeyan}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: yas18Beyani }}
            >
              <View style={[styles.yasKutu, yas18Beyani && styles.yasKutuAktif]}>
                {yas18Beyani ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : null}
              </View>
              <Text style={styles.yasBeyanEtiket}>
                {t('auth.yas18BeyanEtiket')}
              </Text>
            </Pressable>

            <PolitikaOnayKutulari
              politikalar={kayitPolitikalari}
              onaylar={onaylar}
              onDegisti={(kod, deger) =>
                setOnaylar((prev) => ({ ...prev, [kod]: deger }))
              }
              onOku={(kod) =>
                setOkunan(kayitPolitikalari.find((p) => p.kod === kod) ?? null)
              }
            />

            <GradientButton
              title={t('auth.kayit')}
              onPress={onSubmit}
              loading={loading}
            />

            {SPOTIFY_GIRIS_AKTIF ? (
              <Pressable
                onPress={() => void onSpotify()}
                disabled={spotifyLoading}
                style={[
                  styles.spotifyBtn,
                  spotifyLoading && styles.spotifyDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('auth.spotifyIleKayit')}
              >
                <Ionicons name="musical-notes" size={20} color="#121212" />
                <Text style={styles.spotifyText}>
                  {spotifyLoading
                    ? t('auth.spotifyBaglaniyor')
                    : t('auth.spotifyIleKayit')}
                </Text>
              </Pressable>
            ) : null}

            {TWITCH_GIRIS_AKTIF ? (
              <Pressable
                onPress={() => void onTwitch()}
                disabled={twitchLoading}
                style={[
                  styles.twitchBtn,
                  twitchLoading && styles.twitchDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('auth.twitchIleKayit')}
              >
                <Ionicons name="logo-twitch" size={20} color="#fff" />
                <Text style={styles.twitchText}>
                  {twitchLoading
                    ? t('auth.twitchBaglaniyor')
                    : t('auth.twitchIleKayit')}
                </Text>
              </Pressable>
            ) : null}

            {X_GIRIS_AKTIF ? (
              <Pressable
                onPress={() => void onX()}
                disabled={xLoading}
                style={[styles.xBtn, xLoading && styles.xDisabled]}
                accessibilityRole="button"
                accessibilityLabel={t('auth.xIleKayit')}
              >
                <Text style={styles.xLogo}>𝕏</Text>
                <Text style={styles.xText}>
                  {xLoading ? t('auth.xBaglaniyor') : t('auth.xIleKayit')}
                </Text>
              </Pressable>
            ) : null}

            {GOOGLE_GIRIS_AKTIF ? (
              <Pressable
                onPress={() => void onGoogle()}
                disabled={googleLoading}
                style={[
                  styles.googleBtn,
                  googleLoading && styles.googleDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('auth.googleIleKayit')}
              >
                <MaterialCommunityIcons
                  name="google"
                  size={20}
                  color="#4285F4"
                />
                <Text style={styles.googleText}>
                  {googleLoading
                    ? t('auth.googleBaglaniyor')
                    : t('auth.googleIleKayit')}
                </Text>
              </Pressable>
            ) : null}

            <Link href="/(auth)/login" asChild>
              <Pressable style={styles.switchRow}>
                <Text style={styles.switchText}>
                  {t('auth.hesabinVarMi')}{' '}
                </Text>
                <Text style={styles.switchLink}>{t('auth.giris')}</Text>
              </Pressable>
            </Link>
          </KlavyeKapatan>
        </ScrollView>
      </KlavyeGuvenliAlan>

      <PolitikaOkumaPaneli
        politika={okunan}
        onKapat={() => setOkunan(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  yukleniyor: {
    paddingVertical: BoslukTokenlari.sm,
    alignItems: 'center',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: BoslukTokenlari.xl,
    paddingBottom: BoslukTokenlari.xxxl,
  },
  formWrap: {
    flexGrow: 1,
    gap: BoslukTokenlari.lg,
  },
  yasBeyan: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: BoslukTokenlari.md,
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },
  yasKutu: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: RenkTokenlari.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  yasKutuAktif: {
    backgroundColor: RenkTokenlari.primary,
    borderColor: RenkTokenlari.primary,
  },
  yasBeyanEtiket: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    flex: 1,
    lineHeight: 18,
  },
  avatarBlok: {
    alignItems: 'center',
    gap: BoslukTokenlari.sm,
    marginBottom: BoslukTokenlari.xs,
  },
  avatarWrap: {
    width: 96,
    height: 96,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: RenkTokenlari.border,
  },
  avatarBos: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.surface,
  },
  avatarCam: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.primarySoft,
    borderWidth: 2,
    borderColor: RenkTokenlari.bg,
  },
  avatarHint: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  avatarKaldir: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '600',
  },
  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: BoslukTokenlari.sm },
  genderChip: {
    flexGrow: 1,
    minWidth: '28%',
    minHeight: 44,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.surface,
    paddingHorizontal: BoslukTokenlari.sm,
  },
  genderActive: {
    borderColor: RenkTokenlari.primary,
    backgroundColor: 'rgba(232, 64, 145, 0.16)',
  },
  genderText: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
  genderTextActive: { color: RenkTokenlari.primarySoft, fontWeight: '700' },
  istegeBagliHint: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: -BoslukTokenlari.sm,
  },
  yasEtiket: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
    marginBottom: 4,
  },
  yasHint: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginBottom: BoslukTokenlari.sm,
    lineHeight: 16,
  },
  dogumSatir: { flexDirection: 'row', gap: BoslukTokenlari.sm },
  dogumKol: { flex: 1.4 },
  dogumKolKisa: { flex: 1 },
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: BoslukTokenlari.sm,
  },
  switchText: { ...TipografiTokenlari.body, color: RenkTokenlari.textMuted },
  switchLink: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
});
