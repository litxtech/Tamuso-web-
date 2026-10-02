import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useCeviri, type CeviriAnahtari } from '../../src/i18n/useCeviri';
import { TextField } from '../../src/components/TextField';
import { GradientButton } from '../../src/components/GradientButton';
import { KlavyeScrollView, KlavyeFocusKaydir, type KlavyeScrollHandle } from '../../src/bilesenler/klavye/KlavyeScrollView';
import { useAuth } from '../../src/contexts/AuthContext';
import { HesabiTamamlaKarti } from '../../src/moduller/misafir-hesabi/bilesenler/HesabiTamamlaKarti';
import { ProfilMedyaBuyutucu } from '../../src/moduller/kullanici-profili/bilesenler/ProfilMedyaBuyutucu';
import { ProfilMedyaSecenekleri } from '../../src/moduller/kullanici-profili/bilesenler/ProfilMedyaSecenekleri';
import { ProfilSecimAlani } from '../../src/moduller/kullanici-profili/bilesenler/ProfilSecimAlani';
import {
  EpostaGuncelle,
  ProfilGuncelle,
} from '../../src/moduller/kullanici-profili/islemler/ProfilGuncelle';
import {
  BankaHesabiGetir,
  BankaHesabiKaydet,
} from '../../src/moduller/kullanici-profili/islemler/BankaHesabi';
import { ProfilMedyasiSil } from '../../src/moduller/kullanici-profili/islemler/ProfilMedyasiSil';
import {
  ProfilMedyasiSec,
  ProfilMedyasiUriIleYukle,
  type ProfilMedyaTuru,
} from '../../src/moduller/kullanici-profili/islemler/ProfilMedyasiYukle';
import {
  ImagePickerModuluYukle,
  ImagePickerOnIsit,
} from '../../src/ortak/medya/ImagePickerHazirMi';
import {
  MedyaUriGuvenli,
  MedyaUriOnizlemeGuvenli,
} from '../../src/moduller/mesajlasma/yardimcilar/MedyaUriGecerliMi';
import {
  BolgeleriUlkeyeGore,
  ProfilKonumKatalogunuGetir,
  type ProfilBolge,
} from '../../src/moduller/kullanici-profili/okuma/ProfilKonumKatalogu';
import type { Gender } from '../../src/types/models';
import { UlkeKodunaNormalizeEt } from '../../src/ortak/ulke/UlkeKodunaNormalizeEt';
import {
  ulkeBayragi,
  ulkeGorunenAd,
} from '../../src/moduller/kisiler-kesif/utils/KisilerYardimcilar';
import {
  ulkeLigiKatalogBirlestir,
  type UlkeListeOgesi,
} from '../../src/moduller/ulke-ligi/utils/UlkeListesi';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

const CINSIYETLER: { id: Gender; anahtar: CeviriAnahtari }[] = [
  { id: 'female', anahtar: 'auth.cinsiyetKadin' },
  { id: 'male', anahtar: 'auth.cinsiyetErkek' },
  { id: 'other', anahtar: 'auth.cinsiyetDiger' },
  { id: 'prefer_not', anahtar: 'profilDuzenle.belirtmekIstemiyorum' },
];

function dogumYillar(): { id: string; label: string }[] {
  const max = new Date().getFullYear() - 18;
  const min = 1925;
  const out: { id: string; label: string }[] = [];
  for (let y = max; y >= min; y -= 1) out.push({ id: String(y), label: String(y) });
  return out;
}

const AYLAR = [
  '01', '02', '03', '04', '05', '06',
  '07', '08', '09', '10', '11', '12',
].map((m) => ({ id: m, label: m }));

function gunler(yil: string, ay: string): { id: string; label: string }[] {
  const dim = new Date(Number(yil) || 2000, Number(ay) || 1, 0).getDate();
  return Array.from({ length: dim }, (_, i) => {
    const d = String(i + 1).padStart(2, '0');
    return { id: d, label: d };
  });
}

function adSoyadAyir(displayName: string | null | undefined): {
  ad: string;
  soyad: string;
} {
  const parts = (displayName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { ad: '', soyad: '' };
  if (parts.length === 1) return { ad: parts[0], soyad: '' };
  return { ad: parts[0], soyad: parts.slice(1).join(' ') };
}

/** Profil: medya, kimlik, iletişim, şifre, banka/IBAN */
export default function ProfilDuzenleEkrani() {
  const { t, i18n } = useCeviri();
  const { profile, user, isGuest, refreshProfile, refreshWallet, updatePassword, patchProfile } =
    useAuth();
  const scrollRef = useRef<KlavyeScrollHandle>(null);
  const [upgradeAcik, setUpgradeAcik] = useState(false);
  const [medyaBusy, setMedyaBusy] = useState<ProfilMedyaTuru | null>(null);
  /** Yükleme sırasında yerel önizleme (file://) — https gelene kadar */
  const [medyaOnizleme, setMedyaOnizleme] = useState<{
    avatar?: string;
    cover?: string;
  }>({});
  const [buyut, setBuyut] = useState<{ uri: string; tur: ProfilMedyaTuru } | null>(
    null,
  );
  const [medyaMenuTur, setMedyaMenuTur] = useState<ProfilMedyaTuru | null>(null);
  const dirtyRef = useRef(false);
  const lastProfileId = useRef<string | null>(null);

  const [ad, setAd] = useState('');
  const [soyad, setSoyad] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [telefon, setTelefon] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [dogumYil, setDogumYil] = useState('');
  const [dogumAy, setDogumAy] = useState('');
  const [dogumGun, setDogumGun] = useState('');
  const [countryCode, setCountryCode] = useState('TR');
  const [regionId, setRegionId] = useState<string>('');
  const [ulkeler, setUlkeler] = useState<UlkeListeOgesi[]>(() =>
    ulkeLigiKatalogBirlestir([]),
  );
  const [bolgeler, setBolgeler] = useState<ProfilBolge[]>([]);
  const [profilBusy, setProfilBusy] = useState(false);

  const [email, setEmail] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);

  const [yeniSifre, setYeniSifre] = useState('');
  const [sifreTekrar, setSifreTekrar] = useState('');
  const [sifreBusy, setSifreBusy] = useState(false);

  const [hesapSahibi, setHesapSahibi] = useState('');
  const [bankaAdi, setBankaAdi] = useState('');
  const [iban, setIban] = useState('');
  const [bankaBusy, setBankaBusy] = useState(false);
  const [bankaYukleniyor, setBankaYukleniyor] = useState(true);

  const formuDoldur = useCallback(
    (zorla = false) => {
      if (!profile) return;
      if (!zorla && dirtyRef.current && lastProfileId.current === profile.id) {
        return;
      }
      const a = adSoyadAyir(profile.display_name);
      setAd(a.ad);
      setSoyad(a.soyad);
      setUsername(profile.username ?? '');
      setBio(profile.bio ?? '');
      setTelefon(profile.phone_e164 ?? '');
      setGender((profile.gender as Gender) ?? '');
      const bd = profile.birth_date?.slice(0, 10) ?? '';
      if (bd && /^\d{4}-\d{2}-\d{2}$/.test(bd)) {
        const [y, m, d] = bd.split('-');
        setDogumYil(y);
        setDogumAy(m);
        setDogumGun(d);
      } else {
        setDogumYil('');
        setDogumAy('');
        setDogumGun('');
      }
      // country_code ISO olmalı; profiles.country görünen ad (Türkiye) olabilir — asla kod yerine kullanma
      setCountryCode(
        UlkeKodunaNormalizeEt(profile.country_code) ??
          UlkeKodunaNormalizeEt(profile.country) ??
          'TR',
      );
      setRegionId(profile.region_id ?? '');
      setEmail(user?.email ?? '');
      lastProfileId.current = profile.id;
      dirtyRef.current = false;
    },
    [profile, user?.email],
  );

  useEffect(() => {
    let iptal = false;
    void ProfilKonumKatalogunuGetir()
      .then((k) => {
        if (iptal) return;
        // Sunucu + tam ISO — yerelleştirilmiş adlar UI'da ulkeGorunenAd ile
        setUlkeler(ulkeLigiKatalogBirlestir(k.countries));
        setBolgeler(k.regions);
      })
      .catch(() => {
        if (!iptal) setUlkeler(ulkeLigiKatalogBirlestir([]));
      });
    return () => {
      iptal = true;
    };
  }, [i18n.language]);

  useFocusEffect(
    useCallback(() => {
      dirtyRef.current = false;
      void refreshProfile();
    }, [refreshProfile]),
  );

  useEffect(() => {
    formuDoldur(false);
  }, [formuDoldur]);

  useEffect(() => {
    ImagePickerOnIsit({ izinIste: false });
  }, []);

  useEffect(() => {
    let iptal = false;
    (async () => {
      setBankaYukleniyor(true);
      try {
        const b = await BankaHesabiGetir();
        if (iptal || !b) return;
        setHesapSahibi(b.account_holder);
        setBankaAdi(b.bank_name);
        setIban(b.iban);
      } catch {
        /* migration yoksa sessiz */
      } finally {
        if (!iptal) setBankaYukleniyor(false);
      }
    })();
    return () => {
      iptal = true;
    };
  }, []);

  const setDirty = <T,>(setter: (v: T) => void) => (v: T) => {
    dirtyRef.current = true;
    setter(v);
  };

  const misafirEngel = () => {
    if (!isGuest) return false;
    setUpgradeAcik(true);
    return true;
  };

  const medyaUrl = (tur: ProfilMedyaTuru) => {
    const lokal = tur === 'cover' ? medyaOnizleme.cover : medyaOnizleme.avatar;
    if (lokal) return lokal;
    return tur === 'cover'
      ? profile?.cover_url ?? null
      : profile?.avatar_url ?? null;
  };

  const medyaAc = (tur: ProfilMedyaTuru) => {
    if (misafirEngel()) return;
    // Sheet açıkken modülü ısıt — Ekle’ye basınca import beklemesin
    ImagePickerOnIsit({ izinIste: false });
    void ImagePickerModuluYukle();
    setMedyaMenuTur(tur);
  };

  const medyaTikla = (tur: ProfilMedyaTuru) => {
    const url = MedyaUriOnizlemeGuvenli(medyaUrl(tur));
    if (url) {
      setBuyut({ uri: url, tur });
      return;
    }
    medyaAc(tur);
  };

  /** Sheet zaten kapandıktan sonra çağrılır (Modal+picker yarışı yok). */
  const medyaSec = async (tur: ProfilMedyaTuru) => {
    if (misafirEngel()) return;
    // Önce galeri — busy/spinner picker’ı geciktirmesin
    const secim = await ProfilMedyasiSec(tur);
    if (!secim.ok) {
      if (secim.iptal) return;
      Alert.alert(t('ortak.medya'), secim.hata);
      return;
    }
    setMedyaOnizleme((prev) => ({ ...prev, [tur]: secim.medya.uri }));
    setMedyaBusy(tur);
    try {
      const sonuc = await ProfilMedyasiUriIleYukle(
        tur,
        secim.medya.uri,
        secim.medya.mimeType,
      );
      if (!sonuc.ok) {
        setMedyaOnizleme((prev) => {
          const next = { ...prev };
          delete next[tur];
          return next;
        });
        Alert.alert(t('ortak.medya'), sonuc.hata);
        return;
      }
      dirtyRef.current = false;
      if (tur === 'avatar') patchProfile({ avatar_url: sonuc.url });
      else patchProfile({ cover_url: sonuc.url });
      setMedyaOnizleme((prev) => {
        const next = { ...prev };
        delete next[tur];
        return next;
      });
      await refreshProfile();
    } finally {
      setMedyaBusy(null);
    }
  };

  const medyaSil = (tur: ProfilMedyaTuru) => {
    if (misafirEngel()) return;
    const baslik =
      tur === 'cover' ? t('profil.kapakFotografi') : t('profil.profilFotografi');
    Alert.alert(baslik, t('profilDuzenle.fotoSilSoru'), [
      { text: t('ortak.iptal'), style: 'cancel' },
      {
        text: t('ortak.sil'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setMedyaBusy(tur);
            try {
              const sonuc = await ProfilMedyasiSil(tur);
              if (!sonuc.ok) {
                Alert.alert(t('ortak.medya'), sonuc.hata);
                return;
              }
              dirtyRef.current = false;
              if (tur === 'avatar') patchProfile({ avatar_url: null });
              else patchProfile({ cover_url: null });
              setMedyaOnizleme((prev) => {
                const next = { ...prev };
                delete next[tur];
                return next;
              });
              await refreshProfile();
            } finally {
              setMedyaBusy(null);
            }
          })();
        },
      },
    ]);
  };

  const profilKaydet = async () => {
    if (misafirEngel()) return;
    const display_name = `${ad.trim()} ${soyad.trim()}`.trim();
    if (display_name.length < 2) {
      Alert.alert(t('profil.baslik'), t('profilDuzenle.adSoyadGir'));
      return;
    }
    let birth_date: string | null = null;
    if (dogumYil && dogumAy && dogumGun) {
      birth_date = `${dogumYil}-${dogumAy}-${dogumGun}`;
    } else if (dogumYil || dogumAy || dogumGun) {
      Alert.alert(t('profil.dogumTarihi'), t('profilDuzenle.dogumBirlikteSec'));
      return;
    }
    if (ilListesi.length > 0 && !regionId) {
      Alert.alert(t('profilDuzenle.konum'), t('profilDuzenle.ilGerekli'));
      return;
    }
    setProfilBusy(true);
    try {
      const sonuc = await ProfilGuncelle({
        display_name,
        username: username.trim() || undefined,
        bio,
        phone_e164: telefon.trim() || null,
        gender: gender || null,
        birth_date,
        country_code: UlkeKodunaNormalizeEt(countryCode) || 'TR',
        region_id: ilListesi.length > 0 ? regionId || null : null,
      });
      if (!sonuc.ok) {
        Alert.alert(t('profil.baslik'), sonuc.hata);
        return;
      }
      dirtyRef.current = false;
      await refreshProfile();
      if (sonuc.cooldown_message) {
        Alert.alert(
          t('profil.baslik'),
          t('ulkeLigi.ulkeDegisimCooldown', { mesaj: sonuc.cooldown_message }),
        );
      } else {
        Alert.alert(t('ortak.kaydedildi'), t('profilDuzenle.profilGuncellendi'));
      }
    } catch (e) {
      Alert.alert(
        t('profil.baslik'),
        e instanceof Error ? e.message : t('profilDuzenle.kayitBasarisiz'),
      );
    } finally {
      setProfilBusy(false);
    }
  };

  const ilListesi = BolgeleriUlkeyeGore(bolgeler, countryCode || 'TR');
  const seciliIl = ilListesi.find((i) => i.id === regionId);
  const cinsiyetAnahtar = CINSIYETLER.find((c) => c.id === gender)?.anahtar;
  const cinsiyetLabel = cinsiyetAnahtar ? t(cinsiyetAnahtar) : '';
  const dogumGunOpts = gunler(dogumYil || '2000', dogumAy || '01');
  const yilOpts = dogumYillar();
  const ulkeBayrakAd = countryCode
    ? `${ulkeBayragi(countryCode)} ${
        ulkeler.find((u) => u.code === countryCode)?.name ||
        ulkeGorunenAd(countryCode)
      }`.trim()
    : '';
  const ulkeSecenekleri = ulkeler.map((u) => ({
    id: u.code,
    label: `${ulkeBayragi(u.code)} ${u.name}`.trim(),
  }));

  const emailKaydet = async () => {
    if (misafirEngel()) return;
    if (email.trim().toLowerCase() === (user?.email ?? '').toLowerCase()) {
      Alert.alert(t('auth.eposta'), t('profilDuzenle.ayniEposta'));
      return;
    }
    setEmailBusy(true);
    const sonuc = await EpostaGuncelle(email);
    setEmailBusy(false);
    if (!sonuc.ok) {
      Alert.alert(t('auth.eposta'), sonuc.hata);
      return;
    }
    Alert.alert(t('auth.eposta'), sonuc.mesaj);
  };

  const sifreKaydet = async () => {
    if (misafirEngel()) return;
    if (yeniSifre.length < 6) {
      Alert.alert(t('auth.sifre'), t('profilDuzenle.sifreMin'));
      return;
    }
    if (yeniSifre !== sifreTekrar) {
      Alert.alert(t('auth.sifre'), t('auth.sifrelerEslesmiyor'));
      return;
    }
    setSifreBusy(true);
    const { error } = await updatePassword(yeniSifre);
    setSifreBusy(false);
    if (error) {
      Alert.alert(t('auth.sifre'), error);
      return;
    }
    setYeniSifre('');
    setSifreTekrar('');
    Alert.alert(t('auth.sifre'), t('profilDuzenle.yeniSifreKaydedildi'));
  };

  const bankaKaydet = async () => {
    if (misafirEngel()) return;
    setBankaBusy(true);
    const sonuc = await BankaHesabiKaydet({
      account_holder: hesapSahibi,
      bank_name: bankaAdi,
      iban,
    });
    setBankaBusy(false);
    if (!sonuc.ok) {
      Alert.alert(t('profilDuzenle.banka'), sonuc.hata);
      return;
    }
    Alert.alert(t('profilDuzenle.banka'), t('profilDuzenle.bankaKaydedildi'));
  };

  const klavyeKaydir = useCallback(
    (e?: Parameters<typeof KlavyeFocusKaydir>[1]) => {
      KlavyeFocusKaydir(scrollRef.current, e, { ustBosluk: 72, delayMs: 80 });
    },
    [],
  );

  /** Formun en altı (banka) — ekstra boşluk + bir kez sona yaklaştır */
  const bankaKlavyeKaydir = useCallback(
    (e?: Parameters<typeof KlavyeFocusKaydir>[1]) => {
      scrollRef.current?.scrollToEnd({ animated: true });
      KlavyeFocusKaydir(scrollRef.current, e, {
        ustBosluk: 96,
        delayMs: Platform.OS === 'ios' ? 90 : 140,
      });
    },
    [],
  );

  const coverGoster = MedyaUriOnizlemeGuvenli(medyaUrl('cover'));
  const avatarGoster = MedyaUriOnizlemeGuvenli(medyaUrl('avatar'));

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title={t('profil.duzenle')}
        subtitle={t('profilDuzenle.altBaslik')}
        fallbackHref="/(tabs)/profile"
      />
      <KlavyeScrollView
        ref={scrollRef}
        style={styles.scrollFlex}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        ekstraPad={120}
      >
        <Text style={styles.section}>{t('profilDuzenle.fotograflar')}</Text>
        <View style={styles.coverWrap}>
          <Pressable
            onPress={() => medyaTikla('cover')}
            onLongPress={() => medyaAc('cover')}
            style={styles.coverPress}
            disabled={medyaBusy !== null}
            accessibilityLabel={t('profil.kapakFotografi')}
          >
            {coverGoster ? (
              <Image
                key={coverGoster}
                source={{ uri: coverGoster }}
                style={styles.cover}
              />
            ) : (
              <LinearGradient colors={[...RenkTokenlari.gradientPlaceholder]} style={styles.cover} />
            )}
            <View style={styles.coverOverlay} pointerEvents="none">
              {!coverGoster ? (
                <>
                  <Ionicons name="image-outline" size={18} color="#fff" />
                  <Text style={styles.coverHint}>
                    {t('profilDuzenle.kapakEkleHint')}
                  </Text>
                </>
              ) : null}
            </View>
          </Pressable>
          <Pressable
            style={styles.coverEditBtn}
            onPress={() => medyaAc('cover')}
            disabled={medyaBusy !== null}
            accessibilityLabel={t('profilDuzenle.kapakDuzenle')}
          >
            {medyaBusy === 'cover' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="camera-outline" size={16} color="#fff" />
                <Text style={styles.coverEditText}>{t('ortak.duzenle')}</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.avatarRow}>
          <View style={styles.avatarHit}>
            <Pressable
              onPress={() => medyaTikla('avatar')}
              onLongPress={() => medyaAc('avatar')}
              style={styles.avatarWrap}
              disabled={medyaBusy !== null}
              accessibilityLabel={t('profil.profilFotografi')}
            >
              {avatarGoster ? (
                <Image
                  key={avatarGoster}
                  source={{ uri: avatarGoster }}
                  style={styles.avatar}
                />
              ) : (
                <LinearGradient
                  colors={[...RenkTokenlari.gradientPrimary]}
                  style={styles.avatar}
                >
                  <Ionicons name="person" size={32} color="#12040C" />
                </LinearGradient>
              )}
            </Pressable>
            <Pressable
              style={styles.avatarCam}
              onPress={() => medyaAc('avatar')}
              disabled={medyaBusy !== null}
              hitSlop={8}
              accessibilityLabel={t('profilDuzenle.profilFotoDuzenle')}
            >
              {medyaBusy === 'avatar' ? (
                <ActivityIndicator color="#12040C" size="small" />
              ) : (
                <Ionicons name="camera" size={12} color="#12040C" />
              )}
            </Pressable>
          </View>
          <Text style={styles.avatarHint}>
            {t('profilDuzenle.avatarHint')}
          </Text>
        </View>

        <Text style={styles.section}>{t('profilDuzenle.kimlik')}</Text>
        <TextField
          label={t('profilDuzenle.ad')}
          value={ad}
          onChangeText={setDirty(setAd)}
          placeholder={t('profilDuzenle.adPlaceholder')}
          onFocus={klavyeKaydir}
        />
        <TextField
          label={t('profilDuzenle.soyad')}
          value={soyad}
          onChangeText={setDirty(setSoyad)}
          placeholder={t('profilDuzenle.soyadPlaceholder')}
          onFocus={klavyeKaydir}
        />
        <TextField
          label={t('auth.kullaniciAdi')}
          value={username}
          onChangeText={setDirty(setUsername)}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={t('profilDuzenle.kullaniciAdiPlaceholder')}
          onFocus={klavyeKaydir}
        />
        <TextField
          label={t('profil.hakkinda')}
          value={bio}
          onChangeText={setDirty(setBio)}
          placeholder={t('profilDuzenle.hakkindaPlaceholder')}
          multiline
          style={styles.bioInput}
          onFocus={klavyeKaydir}
        />

        <Text style={styles.section}>{t('profilDuzenle.cinsiyetDogum')}</Text>
        <ProfilSecimAlani
          label={t('profil.cinsiyet')}
          valueLabel={cinsiyetLabel}
          placeholder={t('profilDuzenle.sec')}
          options={CINSIYETLER.map((c) => ({ id: c.id, label: t(c.anahtar) }))}
          onSelect={(id) => {
            dirtyRef.current = true;
            setGender(id as Gender);
          }}
        />
        <Text style={styles.fieldHint}>{t('profilDuzenle.yasHint')}</Text>
        <View style={styles.dogumSatir}>
          <View style={{ flex: 1.1 }}>
            <ProfilSecimAlani
              label={t('auth.yil')}
              valueLabel={dogumYil}
              placeholder={t('auth.yil')}
              options={yilOpts}
              onSelect={(id) => {
                dirtyRef.current = true;
                setDogumYil(id);
              }}
              searchable
            />
          </View>
          <View style={{ flex: 0.85 }}>
            <ProfilSecimAlani
              label={t('auth.ay')}
              valueLabel={dogumAy}
              placeholder={t('auth.ay')}
              options={AYLAR}
              onSelect={(id) => {
                dirtyRef.current = true;
                setDogumAy(id);
                if (dogumGun && Number(dogumGun) > gunler(dogumYil || '2000', id).length) {
                  setDogumGun('');
                }
              }}
            />
          </View>
          <View style={{ flex: 0.85 }}>
            <ProfilSecimAlani
              label={t('auth.gun')}
              valueLabel={dogumGun}
              placeholder={t('auth.gun')}
              options={dogumGunOpts}
              onSelect={(id) => {
                dirtyRef.current = true;
                setDogumGun(id);
              }}
            />
          </View>
        </View>

        <Text style={styles.section}>{t('profilDuzenle.konum')}</Text>
        <Text style={styles.sectionSub}>
          {t('profilDuzenle.konumAlt')}
        </Text>
        <ProfilSecimAlani
          label={t('profil.ulke')}
          valueLabel={ulkeBayrakAd || countryCode}
          placeholder={t('auth.ulkeAra')}
          searchable
          options={ulkeSecenekleri}
          onSelect={(id) => {
            dirtyRef.current = true;
            setCountryCode(id);
            setRegionId('');
          }}
        />
        {ilListesi.length > 0 ? (
          <ProfilSecimAlani
            label={t('profil.il')}
            valueLabel={seciliIl ? `${seciliIl.code} · ${seciliIl.name}` : ''}
            placeholder={t('profilDuzenle.ilPlaceholder')}
            searchable
            options={ilListesi.map((i) => ({
              id: i.id,
              label: i.name,
              alt: t('profilDuzenle.plaka', { kod: i.code }),
            }))}
            onSelect={(id) => {
              dirtyRef.current = true;
              setRegionId(id);
            }}
          />
        ) : null}

        <TextField
          label={t('auth.telefon')}
          value={telefon}
          onChangeText={setDirty(setTelefon)}
          keyboardType="phone-pad"
          placeholder={t('profilDuzenle.telefonPlaceholder')}
          onFocus={klavyeKaydir}
        />
        <GradientButton
          title={t('profilDuzenle.profiliKaydet')}
          onPress={() => void profilKaydet()}
          loading={profilBusy}
        />

        <Text style={styles.section}>{t('auth.eposta')}</Text>
        <TextField
          label={t('profilDuzenle.epostaAdresi')}
          value={email}
          onChangeText={setDirty(setEmail)}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder={t('auth.epostaPlaceholder')}
          onFocus={klavyeKaydir}
        />
        <GradientButton
          title={t('profilDuzenle.epostayiGuncelle')}
          onPress={() => void emailKaydet()}
          loading={emailBusy}
          variant="ghost"
        />

        <Text style={styles.section}>{t('auth.sifre')}</Text>
        <TextField
          label={t('auth.yeniSifre')}
          value={yeniSifre}
          onChangeText={setYeniSifre}
          secureTextEntry
          placeholder={t('profilDuzenle.sifreMinPlaceholder')}
          onFocus={klavyeKaydir}
        />
        <TextField
          label={t('auth.sifreTekrar')}
          value={sifreTekrar}
          onChangeText={setSifreTekrar}
          secureTextEntry
          placeholder={t('profilDuzenle.tekrarPlaceholder')}
          onFocus={klavyeKaydir}
        />
        <GradientButton
          title={t('profilDuzenle.sifreyiDegistir')}
          onPress={() => void sifreKaydet()}
          loading={sifreBusy}
          variant="ghost"
        />

        <Text style={styles.section}>{t('profilDuzenle.bankaBolum')}</Text>
        <Text style={styles.sectionSub}>
          {t('profilDuzenle.bankaAlt')}
        </Text>
        {bankaYukleniyor ? (
          <ActivityIndicator
            color={RenkTokenlari.primary}
            style={{ marginVertical: 12 }}
          />
        ) : (
          <>
            <TextField
              label={t('profilDuzenle.hesapSahibi')}
              value={hesapSahibi}
              onChangeText={setHesapSahibi}
              placeholder={t('profilDuzenle.hesapSahibiPlaceholder')}
              onFocus={bankaKlavyeKaydir}
            />
            <TextField
              label={t('profilDuzenle.bankaAdi')}
              value={bankaAdi}
              onChangeText={setBankaAdi}
              placeholder={t('profilDuzenle.bankaAdiPlaceholder')}
              onFocus={bankaKlavyeKaydir}
            />
            <TextField
              label="IBAN"
              value={iban}
              onChangeText={setIban}
              autoCapitalize="characters"
              placeholder="TR00 0000 0000 0000 0000 0000 00"
              onFocus={bankaKlavyeKaydir}
            />
            <GradientButton
              title={t('profilDuzenle.bankaKaydet')}
              onPress={() => void bankaKaydet()}
              loading={bankaBusy}
            />
            {/* Klavye açıkken son alanların kaydırılacağı boşluk */}
            <View style={styles.bankaAltBosluk} />
          </>
        )}
      </KlavyeScrollView>

      <HesabiTamamlaKarti
        visible={upgradeAcik}
        onClose={() => setUpgradeAcik(false)}
        onCompleted={() => {
          void refreshProfile();
          void refreshWallet();
        }}
      />

      <ProfilMedyaBuyutucu
        uri={buyut?.uri ?? null}
        tur={buyut?.tur}
        onKapat={() => setBuyut(null)}
      />

      <ProfilMedyaSecenekleri
        visible={medyaMenuTur !== null}
        tur={medyaMenuTur}
        varMi={medyaMenuTur ? Boolean(medyaUrl(medyaMenuTur)) : false}
        busy={medyaBusy !== null}
        onKapat={() => setMedyaMenuTur(null)}
        onGoruntule={(tur) => {
          const url = medyaUrl(tur);
          if (url) setBuyut({ uri: url, tur });
        }}
        onEkleVeyaDegistir={(tur) => {
          void medyaSec(tur);
        }}
        onSil={(tur) => {
          medyaSil(tur);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollFlex: { flex: 1 },
  scroll: {
    paddingHorizontal: BoslukTokenlari.xl,
    paddingBottom: BoslukTokenlari.xxxl,
    gap: BoslukTokenlari.md,
  },
  bankaAltBosluk: {
    height: 180,
  },
  section: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    marginTop: BoslukTokenlari.lg,
  },
  sectionSub: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    marginTop: -4,
  },
  coverWrap: {
    position: 'relative',
  },
  coverPress: {
    height: 120,
    borderRadius: YaricapTokenlari.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  cover: { width: '100%', height: '100%' },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  coverHint: { ...TipografiTokenlari.caption, color: '#fff', fontWeight: '600' },
  coverEditBtn: {
    position: 'absolute',
    right: BoslukTokenlari.sm,
    bottom: BoslukTokenlari.sm,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(18,4,12,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  coverEditText: {
    ...TipografiTokenlari.micro,
    color: '#fff',
    fontWeight: '700',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.md,
    marginTop: -28,
    paddingLeft: BoslukTokenlari.sm,
  },
  avatarHit: {
    width: 72,
    height: 72,
    position: 'relative',
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: RenkTokenlari.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCam: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: RenkTokenlari.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: RenkTokenlari.bg,
    zIndex: 2,
  },
  avatarHint: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    flex: 1,
    marginTop: 20,
  },
  bioInput: {
    minHeight: 96,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  dogumSatir: {
    flexDirection: 'row',
    gap: BoslukTokenlari.sm,
  },
  fieldHint: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: -4,
  },
  ulkeKilit: {
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    paddingHorizontal: BoslukTokenlari.md,
    paddingVertical: 12,
    gap: 4,
  },
  ulkeKilitLabel: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '600',
  },
  ulkeKilitDeger: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
});
