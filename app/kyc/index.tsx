import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useCeviri } from '../../src/i18n/useCeviri';
import {
  KycBasvuruGonder,
  KycSonBasvuruGetir,
  type KycDocType,
} from '../../src/moduller/kyc/islemler/KycBasvuru';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

/** GG.AA.YYYY — rakam yazıldıkça nokta ekler */
function dogumTarihiFormatla(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

/** GG.AA.YYYY → YYYY-MM-DD (API) */
function dogumTarihiIso(tr: string): string | null {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(tr.trim());
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900) return null;
  const iso = `${String(yyyy).padStart(4, '0')}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  const dt = new Date(`${iso}T12:00:00`);
  if (
    Number.isNaN(dt.getTime()) ||
    dt.getFullYear() !== yyyy ||
    dt.getMonth() + 1 !== mm ||
    dt.getDate() !== dd
  ) {
    return null;
  }
  return iso;
}

export default function KycEkrani() {
  const { t } = useCeviri();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [izin, izinIste] = useCameraPermissions();
  const camRef = useRef<CameraView>(null);

  const BELGE_TIPLERI: { id: KycDocType; label: string }[] = [
    { id: 'id_card', label: t('kyc.belgeKimlik') },
    { id: 'passport', label: t('kyc.belgePasaport') },
    { id: 'drivers_license', label: t('kyc.belgeEhliyet') },
    { id: 'temporary_id', label: t('kyc.belgeGecici') },
  ];
  const CANLILIK_ADIMLARI = [
    t('kyc.canlilikDuz'),
    t('kyc.canlilikSol'),
    t('kyc.canlilikSag'),
    t('kyc.canlilikGulumse'),
  ] as const;

  const [docType, setDocType] = useState<KycDocType>('id_card');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [hometown, setHometown] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState(() => t('kyc.ulkeVarsayilan'));
  const [nationality, setNationality] = useState(() => t('kyc.ulkeVarsayilan'));
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [livenessStep, setLivenessStep] = useState(0);
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [livenessAktif, setLivenessAktif] = useState(false);
  const [gonderiyor, setGonderiyor] = useState(false);
  const [durum, setDurum] = useState<string | null>(null);

  useEffect(() => {
    void KycSonBasvuruGetir().then((b) => {
      if (b?.status) setDurum(String(b.status));
    });
  }, []);

  const fotoSec = async (hedef: 'front' | 'back') => {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (r.canceled || !r.assets[0]) return;
    if (hedef === 'front') setFrontUri(r.assets[0].uri);
    else setBackUri(r.assets[0].uri);
  };

  const canlilikBaslat = async () => {
    if (!izin?.granted) {
      const n = await izinIste();
      if (!n.granted) {
        Alert.alert(t('kyc.kamera'), t('kyc.kameraIzin'));
        return;
      }
    }
    setLivenessAktif(true);
    setLivenessStep(0);
    setLivenessPassed(false);
    setSelfieUri(null);
  };

  const canlilikKareAl = useCallback(async () => {
    try {
      const shot = await camRef.current?.takePictureAsync({
        quality: 0.7,
        skipProcessing: true,
      });
      if (!shot?.uri) return;
      if (livenessStep >= CANLILIK_ADIMLARI.length - 1) {
        setSelfieUri(shot.uri);
        setLivenessPassed(true);
        setLivenessAktif(false);
        Alert.alert(t('kyc.canlilik'), t('kyc.canlilikTamam'));
        return;
      }
      setLivenessStep((s) => s + 1);
    } catch {
      Alert.alert(t('kyc.kamera'), t('kyc.kareAlinamadi'));
    }
  }, [livenessStep]);

  const gonder = async () => {
    if (!frontUri || !selfieUri || !livenessPassed) {
      Alert.alert(t('kyc.eksik'), t('kyc.eksikBelgeSelfie'));
      return;
    }
    const arkaZorunlu =
      docType === 'temporary_id' ||
      docType === 'id_card' ||
      docType === 'drivers_license';
    if (arkaZorunlu && !backUri) {
      Alert.alert(t('kyc.belge'), t('kyc.arkaYuzZorunlu'));
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert(t('kyc.eksik'), t('kyc.adSoyadZorunlu'));
      return;
    }
    if (!phone.trim() || !email.trim()) {
      Alert.alert(t('kyc.eksik'), t('kyc.telefonEpostaZorunlu'));
      return;
    }
    const birthIso = dogumTarihiIso(birthDate);
    if (!birthIso) {
      Alert.alert(t('kyc.dogumTarihi'), t('kyc.dogumTarihiFormat'));
      return;
    }
    const yas =
      new Date().getFullYear() - Number(birthIso.slice(0, 4));
    if (yas < 18) {
      Alert.alert(t('kyc.yas'), t('kyc.yas18'));
      return;
    }
    setGonderiyor(true);
    const r = await KycBasvuruGonder({
      docType,
      firstName,
      lastName,
      birthDate: birthIso,
      hometown,
      phone,
      email,
      country,
      nationality,
      docFrontUri: frontUri,
      docBackUri: backUri,
      selfieUri,
      livenessPassed,
      livenessMeta: {
        steps: CANLILIK_ADIMLARI.length,
        completed: true,
        age: yas,
      },
    });
    setGonderiyor(false);
    if (!r.ok) {
      Alert.alert(t('kyc.baslik'), r.hata);
      return;
    }
    setDurum('pending');
    Alert.alert(t('kyc.gonderildi'), t('kyc.basvuruIncelemede'), [
      { text: t('ortak.tamam'), onPress: () => router.back() },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <EkranBasligi title={t('kyc.baslik')} subtitle={t('kyc.altBaslik')} />
      <ScrollView
        contentContainerStyle={[
          styles.pad,
          { paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {durum ? (
          <Text style={styles.durum}>
            {t('kyc.sonDurum', {
              durum:
                durum === 'pending'
                  ? t('kyc.durumIncelemede')
                  : durum === 'approved'
                    ? t('kyc.durumOnaylandi')
                    : durum === 'rejected'
                      ? t('kyc.durumReddedildi')
                      : durum,
            })}
          </Text>
        ) : null}

        <Text style={styles.bolum}>{t('kyc.belgeTipi')}</Text>
        <View style={styles.chipSatir}>
          {BELGE_TIPLERI.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => setDocType(b.id)}
              style={[styles.chip, docType === b.id && styles.chipAktif]}
            >
              <Text
                style={[
                  styles.chipYazi,
                  docType === b.id && styles.chipYaziAktif,
                ]}
              >
                {b.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.bolum}>{t('kyc.kisiselBilgiler')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('kyc.placeholderAd')}
          placeholderTextColor={RenkTokenlari.textDim}
          value={firstName}
          onChangeText={setFirstName}
        />
        <TextInput
          style={styles.input}
          placeholder={t('kyc.placeholderSoyad')}
          placeholderTextColor={RenkTokenlari.textDim}
          value={lastName}
          onChangeText={setLastName}
        />
        <TextInput
          style={styles.input}
          placeholder={t('kyc.placeholderDogum')}
          placeholderTextColor={RenkTokenlari.textDim}
          value={birthDate}
          onChangeText={(raw) => setBirthDate(dogumTarihiFormatla(raw))}
          keyboardType="number-pad"
          maxLength={10}
        />
        <TextInput
          style={styles.input}
          placeholder={t('kyc.placeholderMemleket')}
          placeholderTextColor={RenkTokenlari.textDim}
          value={hometown}
          onChangeText={setHometown}
        />
        <TextInput
          style={styles.input}
          placeholder={t('kyc.placeholderTelefon')}
          placeholderTextColor={RenkTokenlari.textDim}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <TextInput
          style={styles.input}
          placeholder={t('kyc.placeholderEposta')}
          placeholderTextColor={RenkTokenlari.textDim}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder={t('kyc.placeholderUlke')}
          placeholderTextColor={RenkTokenlari.textDim}
          value={country}
          onChangeText={setCountry}
        />
        <Text style={styles.alanIpucu}>{t('kyc.ipucuIkamet')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('kyc.placeholderUyruk')}
          placeholderTextColor={RenkTokenlari.textDim}
          value={nationality}
          onChangeText={setNationality}
        />
        <Text style={styles.alanIpucu}>{t('kyc.ipucuUyruk')}</Text>

        <Text style={styles.bolum}>{t('kyc.belgeFotograflari')}</Text>
        <Pressable style={styles.btnIkincil} onPress={() => void fotoSec('front')}>
          <Text style={styles.btnIkincilYazi}>
            {frontUri ? t('kyc.onYuzSecildi') : t('kyc.onYuzSec')}
          </Text>
        </Pressable>
        {docType !== 'passport' ? (
          <Pressable
            style={styles.btnIkincil}
            onPress={() => void fotoSec('back')}
          >
            <Text style={styles.btnIkincilYazi}>
              {backUri ? t('kyc.arkaYuzSecildi') : t('kyc.arkaYuzSec')}
            </Text>
          </Pressable>
        ) : null}

        <Text style={styles.bolum}>{t('kyc.canlilikKontrolu')}</Text>
        {!livenessAktif ? (
          <Pressable style={styles.btn} onPress={() => void canlilikBaslat()}>
            <Text style={styles.btnYazi}>
              {livenessPassed ? t('kyc.canlilikTamamRozet') : t('kyc.selfieBaslat')}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.camWrap}>
            <CameraView ref={camRef} style={styles.cam} facing="front" />
            <Text style={styles.camTalimat}>
              {CANLILIK_ADIMLARI[livenessStep]}
            </Text>
            <Pressable style={styles.btn} onPress={() => void canlilikKareAl()}>
              <Text style={styles.btnYazi}>{t('kyc.kareAl')}</Text>
            </Pressable>
          </View>
        )}

        <Pressable
          style={[styles.btn, gonderiyor && { opacity: 0.5 }]}
          disabled={gonderiyor}
          onPress={() => void gonder()}
        >
          <Text style={styles.btnYazi}>
            {gonderiyor ? t('kyc.gonderiliyor') : t('kyc.basvuruGonder')}
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: BoslukTokenlari.lg, gap: 10 },
  durum: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.accent,
    fontWeight: '700',
  },
  bolum: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '800',
    marginTop: 8,
  },
  chipSatir: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  chipAktif: {
    borderColor: RenkTokenlari.accent,
    backgroundColor: 'rgba(240,180,41,0.16)',
  },
  chipYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  chipYaziAktif: { color: RenkTokenlari.accent, fontWeight: '800' },
  input: {
    backgroundColor: RenkTokenlari.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: RenkTokenlari.text,
  },
  alanIpucu: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: -4,
    marginBottom: 2,
  },
  btn: {
    marginTop: 8,
    backgroundColor: RenkTokenlari.primary,
    borderRadius: YaricapTokenlari.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnYazi: {
    ...TipografiTokenlari.body,
    color: '#fff',
    fontWeight: '800',
  },
  btnIkincil: {
    backgroundColor: RenkTokenlari.surface,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  btnIkincilYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  camWrap: { gap: 8 },
  cam: { width: '100%', height: 280, borderRadius: 16, overflow: 'hidden' },
  camTalimat: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.accent,
    fontWeight: '800',
    textAlign: 'center',
  },
});
