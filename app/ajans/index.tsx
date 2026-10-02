import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { GradientButton } from '../../src/components/GradientButton';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useCeviri } from '../../src/i18n/useCeviri';
import type { CeviriAnahtari } from '../../src/i18n/useCeviri';
import { BosDurum } from '../../src/components/BosDurum';
import { KlavyeKapatan } from '../../src/components/KlavyeKapatan';
import { KlavyeGuvenliAlan } from '../../src/bilesenler/klavye/KlavyeGuvenliAlan';
import { useKlavyeYuksekligi } from '../../src/bilesenler/klavye/useKlavyeYuksekligi';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { useAuth } from '../../src/contexts/AuthContext';
import { HesabiTamamlaKarti } from '../../src/moduller/misafir-hesabi/bilesenler/HesabiTamamlaKarti';
import { useMisafirIslemKapisi } from '../../src/moduller/misafir-hesabi/islemler/useMisafirIslemKapisi';
import { AjansBasvurusuOlustur } from '../../src/moduller/ajanslar/islemler/AjansIslemleri';
import { AjansBasvurularimiGetir } from '../../src/moduller/ajanslar/okuma/AjanslariGetir';
import {
  AjansListesiModernGetir,
  type AjansListeKart,
} from '../../src/moduller/ajanslar/okuma/AjansProfilGetir';
import { AjansKesfetKarti } from '../../src/moduller/ajanslar/bilesenler/AjansKesfetKarti';
import { useAjansYonetim } from '../../src/moduller/ajanslar/kancalar/useAjansYonetim';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

type FormState = {
  name: string;
  agencyType: 'INDIVIDUAL' | 'COMPANY';
  contactFirstName: string;
  contactLastName: string;
  country: string;
  city: string;
  address: string;
  email: string;
  phone: string;
  whatsapp: string;
  website: string;
  expectedHosts: string;
  experience: string;
  description: string;
  whyTamuso: string;
  existingNetwork: string;
  languages: string;
  targetCountries: string;
  referralCode: string;
};

const BOS_FORM: FormState = {
  name: '',
  agencyType: 'INDIVIDUAL',
  contactFirstName: '',
  contactLastName: '',
  country: '',
  city: '',
  address: '',
  email: '',
  phone: '',
  whatsapp: '',
  website: '',
  expectedHosts: '',
  experience: '',
  description: '',
  whyTamuso: '',
  existingNetwork: '',
  languages: '',
  targetCountries: '',
  referralCode: '',
};

type CevirFn = (key: CeviriAnahtari, opts?: Record<string, unknown>) => string;

function durumEtiketi(status: string, t: CevirFn) {
  const map: Record<string, CeviriAnahtari> = {
    pending: 'ajans.durumInceleniyor',
    under_review: 'ajans.durumInceleniyor',
    approved: 'ajans.durumOnaylandi',
    rejected: 'ajans.durumReddedildi',
    active: 'ajans.durumAktif',
    SUBMITTED: 'ajans.durumInceleniyor',
    UNDER_REVIEW: 'ajans.durumInceleniyor',
    MORE_INFORMATION_REQUIRED: 'ajans.durumInceleniyor',
    VERIFICATION_REQUIRED: 'ajans.verDurumBekliyor',
    VERIFICATION_IN_REVIEW: 'ajans.verDurumInceleniyor',
    VERIFIED: 'ajans.verDurumOk',
    APPROVED: 'ajans.durumOnaylandi',
    ACTIVE: 'ajans.durumAktif',
    REJECTED: 'ajans.durumReddedildi',
  };
  const key = map[status];
  return key ? t(key) : status;
}

function formDogrula(f: FormState, t: CevirFn): string | null {
  if (f.name.trim().length < 3) return t('ajans.dogrulamaAd');
  if (f.contactFirstName.trim().length < 1) return t('ajans.verYetkiliAd');
  if (f.contactLastName.trim().length < 1) return t('ajans.verYetkiliSoyad');
  if (f.country.trim().length < 2) return t('ajans.dogrulamaUlke');
  if (!f.email.trim().includes('@') || f.email.trim().length < 5) {
    return t('ajans.dogrulamaEposta');
  }
  if (f.phone.trim().replace(/\s/g, '').length < 7) {
    return t('ajans.dogrulamaTelefon');
  }
  const hosts = Number(f.expectedHosts);
  if (!Number.isFinite(hosts) || hosts < 1) {
    return t('ajans.dogrulamaHost');
  }
  if (f.description.trim().length < 20) {
    return t('ajans.dogrulamaAciklama');
  }
  return null;
}

export default function AjansEkrani() {
  const { t } = useCeviri();
  const { user, isGuest, refreshProfile, refreshWallet } = useAuth();
  const { upgradeAcik, upgradeKapat, islemiDene } = useMisafirIslemKapisi(isGuest);
  const {
    yetkili,
    yonetimHref,
    yukleniyor: yetkiYukleniyor,
  } = useAjansYonetim();
  const [form, setForm] = useState<FormState>(BOS_FORM);
  const [liste, setListe] = useState<AjansListeKart[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [basvuruAcik, setBasvuruAcik] = useState(false);
  const { yukseklik: klavyeH, acik: klavyeAcik } = useKlavyeYuksekligi(24);

  const setAlan = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((onceki) => ({ ...onceki, [key]: value }));
  };

  const load = useCallback(async () => {
    setYukleniyor(true);
    try {
      const [p, a] = await Promise.all([
        AjansListesiModernGetir(40).catch(() => []),
        AjansBasvurularimiGetir().catch(() => []),
      ]);
      setListe(p);
      setApps(a);
    } catch {
      setListe([]);
      setApps([]);
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Kabul edilmiş ajans sahibi → başvuru değil yönetim paneli
      if (yetkiYukleniyor) return;
      if (yetkili) {
        router.replace(yonetimHref as any);
        return;
      }
      void load();
    }, [load, yetkili, yonetimHref, yetkiYukleniyor]),
  );

  const basvur = () => {
    islemiDene('ajans_olustur', async () => {
      const hata = formDogrula(form, t);
      if (hata) {
        Alert.alert(t('ajans.alertBasvuru'), hata);
        return;
      }
      setLoading(true);
      const sonuc = await AjansBasvurusuOlustur({
        agencyName: form.name.trim(),
        agencyType: form.agencyType,
        contactFirstName: form.contactFirstName.trim(),
        contactLastName: form.contactLastName.trim(),
        country: form.country.trim(),
        city: form.city.trim() || undefined,
        address: form.address.trim() || undefined,
        email: form.email.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim() || undefined,
        website: form.website.trim() || undefined,
        expectedHosts: Number(form.expectedHosts),
        experience: form.experience.trim() || undefined,
        description: form.description.trim(),
        whyTamuso: form.whyTamuso.trim() || undefined,
        existingNetwork: form.existingNetwork.trim() || undefined,
        languages: form.languages
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        targetCountries: form.targetCountries
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        referralCode: form.referralCode.trim() || undefined,
        idempotencyKey: `app-${user?.id ?? 'x'}-${Date.now()}`,
      });
      setLoading(false);
      if (!sonuc.ok) {
        Alert.alert(t('ajans.alertBasvuru'), sonuc.hata);
        return;
      }
      setForm(BOS_FORM);
      setBasvuruAcik(false);
      Alert.alert(t('ajans.alertAlindiBaslik'), t('ajans.alertAlindiBody'));
      await load();
    });
  };

  const bekleyenVar = useMemo(
    () =>
      apps.some((a) =>
        [
          'pending',
          'under_review',
          'SUBMITTED',
          'UNDER_REVIEW',
          'MORE_INFORMATION_REQUIRED',
          'PRE_APPROVED',
          'VERIFICATION_REQUIRED',
          'VERIFICATION_IN_REVIEW',
          'DRAFT',
        ].includes(a.status),
      ),
    [apps],
  );

  if (yetkiYukleniyor || yetkili) {
    return (
      <Screen edges={['top']}>
        <ModulHataSiniri modulAdi="ajanslar">
          <EkranBasligi
            title={t('ajans.ajanslar')}
            subtitle={t('ajans.yonlendiriliyor')}
            fallbackHref={"/(tabs)" as any}
          />
          <ActivityIndicator
            color={RenkTokenlari.primarySoft}
            style={{ marginTop: 40 }}
          />
        </ModulHataSiniri>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri modulAdi="ajanslar">
        <EkranBasligi
          title={t('ajans.ajanslar')}
          subtitle={t('ajans.altKesfet')}
          fallbackHref={"/(tabs)" as any}
        />
        <KlavyeGuvenliAlan style={{ flex: 1 }}>
        <KlavyeKapatan style={{ flex: 1 }}>
          <FlatList
            data={liste}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.list,
              Platform.OS === 'android' && klavyeAcik
                ? { paddingBottom: 40 + klavyeH }
                : null,
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
            ListHeaderComponent={
              <View style={styles.headerBlock}>
                <Pressable
                  style={styles.basvuruToggle}
                  onPress={() => setBasvuruAcik((v) => !v)}
                >
                  <Text style={styles.basvuruToggleYazi}>
                    {basvuruAcik ? t('ajans.basvuruGizle') : t('ajans.basvuruAc')}
                  </Text>
                </Pressable>

                {basvuruAcik ? (
                  <View style={styles.formCard}>
                    <Text style={styles.formBaslik}>{t('ajans.formBaslik')}</Text>
                    <Text style={styles.section}>{t('ajans.verAjansTuru')}</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                      {(
                        [
                          ['INDIVIDUAL', 'ajans.verBireysel'],
                          ['COMPANY', 'ajans.verKurumsal'],
                        ] as const
                      ).map(([k, labelKey]) => (
                        <Pressable
                          key={k}
                          style={[
                            styles.basvuruToggle,
                            form.agencyType === k && { borderColor: RenkTokenlari.primarySoft },
                          ]}
                          onPress={() => setAlan('agencyType', k)}
                        >
                          <Text style={styles.basvuruToggleYazi}>{t(labelKey)}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <TextField
                      label={t('ajans.labelAd')}
                      value={form.name}
                      onChangeText={(v) => setAlan('name', v)}
                      placeholder={t('ajans.phAd')}
                    />
                    <TextField
                      label={t('ajans.verYetkiliAd')}
                      value={form.contactFirstName}
                      onChangeText={(v) => setAlan('contactFirstName', v)}
                    />
                    <TextField
                      label={t('ajans.verYetkiliSoyad')}
                      value={form.contactLastName}
                      onChangeText={(v) => setAlan('contactLastName', v)}
                    />
                    <TextField
                      label={t('ajans.labelUlke')}
                      value={form.country}
                      onChangeText={(v) => setAlan('country', v)}
                      placeholder={t('ajans.phUlke')}
                      autoCapitalize="characters"
                    />
                    <TextField
                      label={t('ajans.verSehir')}
                      value={form.city}
                      onChangeText={(v) => setAlan('city', v)}
                    />
                    <TextField
                      label={t('ajans.verAdresAlan')}
                      value={form.address}
                      onChangeText={(v) => setAlan('address', v)}
                    />
                    <TextField
                      label={t('ajans.labelEposta')}
                      value={form.email}
                      onChangeText={(v) => setAlan('email', v)}
                      placeholder={t('ajans.phEposta')}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <TextField
                      label={t('ajans.labelTelefon')}
                      value={form.phone}
                      onChangeText={(v) => setAlan('phone', v)}
                      placeholder={t('ajans.phTelefon')}
                      keyboardType="phone-pad"
                    />
                    <TextField
                      label={t('ajans.verWhatsapp')}
                      value={form.whatsapp}
                      onChangeText={(v) => setAlan('whatsapp', v)}
                      keyboardType="phone-pad"
                    />
                    <TextField
                      label={t('ajans.verWebsite')}
                      value={form.website}
                      onChangeText={(v) => setAlan('website', v)}
                      autoCapitalize="none"
                    />
                    <TextField
                      label={t('ajans.labelHost')}
                      value={form.expectedHosts}
                      onChangeText={(v) => setAlan('expectedHosts', v)}
                      placeholder={t('ajans.phHost')}
                      keyboardType="number-pad"
                    />
                    <TextField
                      label={t('ajans.labelDeneyim')}
                      value={form.experience}
                      onChangeText={(v) => setAlan('experience', v)}
                      placeholder={t('ajans.phDeneyim')}
                    />
                    <TextField
                      label={t('ajans.verNedenTamuso')}
                      value={form.whyTamuso}
                      onChangeText={(v) => setAlan('whyTamuso', v)}
                      multiline
                    />
                    <TextField
                      label={t('ajans.verNetwork')}
                      value={form.existingNetwork}
                      onChangeText={(v) => setAlan('existingNetwork', v)}
                      multiline
                    />
                    <TextField
                      label={t('ajans.verDiller')}
                      value={form.languages}
                      onChangeText={(v) => setAlan('languages', v)}
                    />
                    <TextField
                      label={t('ajans.verUlkeler')}
                      value={form.targetCountries}
                      onChangeText={(v) => setAlan('targetCountries', v)}
                    />
                    <TextField
                      label={t('ajans.verReferral')}
                      value={form.referralCode}
                      onChangeText={(v) => setAlan('referralCode', v)}
                    />
                    <TextField
                      label={t('ajans.labelAciklama')}
                      value={form.description}
                      onChangeText={(v) => setAlan('description', v)}
                      placeholder={t('ajans.phAciklama')}
                      multiline
                    />
                    <GradientButton
                      title={t('ajans.gonder')}
                      onPress={basvur}
                      loading={loading}
                      disabled={bekleyenVar}
                    />
                  </View>
                ) : null}

                {apps.length > 0 ? (
                  <>
                    <Text style={styles.section}>{t('ajans.basvurularim')}</Text>
                    <View style={styles.appsCard}>
                      {apps.map((a, i) => (
                        <View
                          key={a.id}
                          style={[
                            styles.appRow,
                            i === apps.length - 1 && styles.appRowLast,
                          ]}
                        >
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text style={styles.appName}>{a.agency_name}</Text>
                            {a.country ? (
                              <Text style={styles.appMeta}>{a.country}</Text>
                            ) : null}
                          </View>
                          <Text style={styles.appStatus}>
                            {durumEtiketi(a.status, t)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </>
                ) : null}

                <Text style={styles.section}>{t('ajans.populer')}</Text>
                {yukleniyor && liste.length === 0 ? (
                  <ActivityIndicator
                    color={RenkTokenlari.primarySoft}
                    style={{ marginVertical: 20 }}
                  />
                ) : null}
              </View>
            }
            ListEmptyComponent={
              yukleniyor ? null : (
                <BosDurum
                  icon="business-outline"
                  title={t('ajans.bosBaslik')}
                  body={t('ajans.bosBody')}
                />
              )
            }
            renderItem={({ item }) => (
              <AjansKesfetKarti
                ajans={item}
                sahipMi={item.owner_id === user?.id}
                onPress={() =>
                  router.push(`/ajans/profil/${item.id}` as any)
                }
              />
            )}
          />
        </KlavyeKapatan>
        </KlavyeGuvenliAlan>
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
  list: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingBottom: BoslukTokenlari.xxxl,
  },
  headerBlock: { gap: BoslukTokenlari.sm, marginBottom: BoslukTokenlari.sm },
  basvuruToggle: {
    paddingVertical: 12,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
    alignItems: 'center',
    backgroundColor: RenkTokenlari.bgCard,
  },
  basvuruToggleYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
  formCard: {
    padding: BoslukTokenlari.lg,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    gap: BoslukTokenlari.sm,
  },
  formBaslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontWeight: '800',
    marginBottom: 4,
  },
  section: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginTop: BoslukTokenlari.sm,
  },
  appsCard: {
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    overflow: 'hidden',
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: BoslukTokenlari.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
  },
  appRowLast: { borderBottomWidth: 0 },
  appName: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '600',
  },
  appMeta: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  appStatus: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
});
