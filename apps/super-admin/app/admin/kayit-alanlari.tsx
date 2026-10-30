import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../../../../src/components/Screen';
import { EkranBasligi } from '../../../../src/components/EkranBasligi';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminKayitAlanIslemleri } from '../../../../src/moduller/kimlik-dogrulama/kayit-alanlari/AdminKayitAlanIslemleri';
import {
  VARSAYILAN_KAYIT_ALAN_AYARLARI,
  type KayitAlanAyarlari,
  type KayitAlanModu,
  type KayitOzelAlan,
  type KayitOzelAlanTuru,
  type YerlesikKayitAlani,
} from '../../../../src/moduller/kimlik-dogrulama/kayit-alanlari/tipler';
import { useCeviri } from '../../../../src/i18n/useCeviri';
import type { CeviriAnahtari } from '../../../../src/i18n/useCeviri';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

const MODLAR: KayitAlanModu[] = ['required', 'optional', 'hidden'];
const FORM_SIRASI: YerlesikKayitAlani[] = [
  'avatar',
  'gender',
  'birth_date',
  'phone',
  'email',
];

const ALAN_ANAHTAR: Record<YerlesikKayitAlani, CeviriAnahtari> = {
  phone: 'kayitAlan.phone',
  gender: 'kayitAlan.gender',
  birth_date: 'kayitAlan.birth_date',
  email: 'kayitAlan.email',
  avatar: 'kayitAlan.avatar',
};

const MOD_ANAHTAR: Record<KayitAlanModu, CeviriAnahtari> = {
  required: 'kayitAlan.zorunlu',
  optional: 'kayitAlan.istegeBagli',
  hidden: 'kayitAlan.gizli',
};

const ETKI_ANAHTAR: Record<KayitAlanModu, CeviriAnahtari> = {
  required: 'kayitAlan.etkiZorunlu',
  optional: 'kayitAlan.etkiIstege',
  hidden: 'kayitAlan.etkiGizli',
};

const TURLER: KayitOzelAlanTuru[] = ['text', 'number', 'select'];

function turAnahtar(tur: KayitOzelAlanTuru): CeviriAnahtari {
  if (tur === 'number') return 'kayitAlan.sayi';
  if (tur === 'select') return 'kayitAlan.secenek';
  return 'kayitAlan.metin';
}

export default function AdminKayitAlanlariEkrani() {
  const { t } = useCeviri();
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [data, setData] = useState<KayitAlanAyarlari>(
    VARSAYILAN_KAYIT_ALAN_AYARLARI,
  );
  const [alanlar, setAlanlar] = useState(VARSAYILAN_KAYIT_ALAN_AYARLARI.alanlar);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediyor, setKaydediyor] = useState(false);
  const [yeniEtiket, setYeniEtiket] = useState('');
  const [yeniTur, setYeniTur] = useState<KayitOzelAlanTuru>('text');
  const [yeniZorunlu, setYeniZorunlu] = useState(false);
  const [yeniSecenekler, setYeniSecenekler] = useState('');
  const [ekleniyor, setEkleniyor] = useState(false);

  const yukle = useCallback(async () => {
    if (!admin) return;
    setYukleniyor(true);
    try {
      const d = await AdminKayitAlanIslemleri.getir();
      setData(d);
      setAlanlar({ ...d.alanlar, birth_date: 'required' });
    } catch (e) {
      Alert.alert(
        t('kayitAlan.alt'),
        e instanceof Error ? e.message : t('ortak.birHataOlustu'),
      );
    } finally {
      setYukleniyor(false);
    }
  }, [admin, t]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  const kirli = useMemo(
    () =>
      FORM_SIRASI.some((key) => {
        const yerel = key === 'birth_date' ? 'required' : alanlar[key];
        const kayitli = key === 'birth_date' ? 'required' : data.alanlar[key];
        return yerel !== kayitli;
      }),
    [alanlar, data.alanlar],
  );

  const onizleme = useMemo(() => {
    const satirlar: { id: string; ad: string; zorunlu: boolean }[] = [];
    const ekleYerlesik = (key: YerlesikKayitAlani) => {
      const mod = key === 'birth_date' ? 'required' : alanlar[key];
      if (mod === 'hidden') return;
      satirlar.push({
        id: key,
        ad: t(ALAN_ANAHTAR[key]),
        zorunlu: mod === 'required',
      });
    };
    ekleYerlesik('avatar');
    ekleYerlesik('gender');
    satirlar.push(
      { id: 'username', ad: t('auth.kullaniciAdi'), zorunlu: true },
      { id: 'display', ad: t('auth.gorunenAd'), zorunlu: true },
    );
    ekleYerlesik('birth_date');
    ekleYerlesik('phone');
    ekleYerlesik('email');
    satirlar.push({ id: 'password', ad: t('auth.sifre'), zorunlu: true });
    for (const alan of data.ozel_alanlar) {
      satirlar.push({
        id: alan.id,
        ad: alan.etiket,
        zorunlu: alan.mod === 'required',
      });
    }
    return satirlar;
  }, [alanlar, data.ozel_alanlar, t]);

  if (!admin) {
    return (
      <Screen>
        <EkranBasligi title={t('kayitAlan.baslik')} fallbackHref="/admin" />
        <Text style={styles.uyari}>{t('ortak.hesapGerekli')}</Text>
      </Screen>
    );
  }

  const kaydet = async () => {
    setKaydediyor(true);
    try {
      const d = await AdminKayitAlanIslemleri.yerlesikGuncelle({
        ...alanlar,
        birth_date: 'required',
      });
      setData(d);
      setAlanlar({ ...d.alanlar, birth_date: 'required' });
      Alert.alert(t('ortak.kaydedildi'), t('kayitAlan.kaydedildi'));
    } catch (e) {
      Alert.alert(t('ortak.hata'), e instanceof Error ? e.message : t('ortak.kaydedilemedi'));
    } finally {
      setKaydediyor(false);
    }
  };

  const ozelEkle = async () => {
    if (!yeniEtiket.trim()) {
      Alert.alert(t('kayitAlan.yeniAlan'), t('kayitAlan.etiketGerekli'));
      return;
    }
    const secenekler =
      yeniTur === 'select'
        ? yeniSecenekler
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
    if (yeniTur === 'select' && secenekler.length === 0) {
      Alert.alert(t('kayitAlan.secenekler'), t('kayitAlan.secenekGerekli'));
      return;
    }
    setEkleniyor(true);
    try {
      const d = await AdminKayitAlanIslemleri.ozelEkle({
        etiket: yeniEtiket.trim(),
        alan_turu: yeniTur,
        mod: yeniZorunlu ? 'required' : 'optional',
        secenekler,
        sira: data.ozel_alanlar.length,
      });
      setData(d);
      setYeniEtiket('');
      setYeniSecenekler('');
      setYeniZorunlu(false);
      setYeniTur('text');
    } catch (e) {
      Alert.alert(t('ortak.hata'), e instanceof Error ? e.message : t('ortak.birHataOlustu'));
    } finally {
      setEkleniyor(false);
    }
  };

  const ozelModDegistir = async (alan: KayitOzelAlan, mod: 'required' | 'optional') => {
    if (alan.mod === mod) return;
    try {
      const d = await AdminKayitAlanIslemleri.ozelGuncelle(alan.id, { mod });
      setData(d);
    } catch (e) {
      Alert.alert(t('ortak.hata'), e instanceof Error ? e.message : t('ortak.kaydedilemedi'));
    }
  };

  const ozelSil = (alan: KayitOzelAlan) => {
    Alert.alert(t('ortak.sil'), t('kayitAlan.silSoru'), [
      { text: t('ortak.vazgec'), style: 'cancel' },
      {
        text: t('ortak.sil'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              const d = await AdminKayitAlanIslemleri.ozelSil(alan.id);
              setData(d);
            } catch (e) {
              Alert.alert(
                t('ortak.hata'),
                e instanceof Error ? e.message : t('ortak.birHataOlustu'),
              );
            }
          })();
        },
      },
    ]);
  };

  const iletisimKapali = alanlar.phone === 'hidden' && alanlar.email === 'hidden';

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title={t('kayitAlan.baslik')}
        subtitle={t('kayitAlan.alt')}
        fallbackHref="/admin"
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={yukleniyor} onRefresh={() => void yukle()} />
        }
        keyboardShouldPersistTaps="handled"
      >
        {yukleniyor && !data.updated_at ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : null}

        <View style={styles.kart}>
          <Text style={styles.kartBaslik}>{t('kayitAlan.herZaman')}</Text>
          <Text style={styles.yardim}>{t('kayitAlan.herZamanAlt')}</Text>
          <Text style={styles.sabit}>
            {t('auth.kullaniciAdi')} · {t('auth.gorunenAd')} · {t('auth.sifre')}
          </Text>
        </View>

        {FORM_SIRASI.map((key) => {
          const kilit = key === 'birth_date';
          const mod = kilit ? 'required' : alanlar[key];
          return (
            <View key={key} style={styles.kart}>
              <Text style={styles.kartBaslik}>{t(ALAN_ANAHTAR[key])}</Text>
              <Text style={styles.yardim}>
                {kilit ? t('kayitAlan.dogumKilit') : t(ETKI_ANAHTAR[mod])}
              </Text>
              {key === 'email' && mod !== 'hidden' ? (
                <Text style={styles.yardim}>{t('kayitAlan.epostaNot')}</Text>
              ) : null}
              {kilit ? (
                <View style={styles.kilit}>
                  <Text style={styles.kilitYazi}>{t('kayitAlan.zorunlu')}</Text>
                </View>
              ) : (
                <View style={styles.segment}>
                  {MODLAR.map((secim, index) => {
                    const aktif = mod === secim;
                    return (
                      <Pressable
                        key={secim}
                        onPress={() => setAlanlar((prev) => ({ ...prev, [key]: secim }))}
                        style={[
                          styles.parca,
                          index > 0 && styles.parcaCizgi,
                          aktif && styles.parcaAktif,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: aktif }}
                      >
                        <Text style={[styles.parcaYazi, aktif && styles.parcaYaziAktif]}>
                          {t(MOD_ANAHTAR[secim])}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {iletisimKapali ? (
          <Text style={styles.uyariKutu}>{t('kayitAlan.iletisimUyari')}</Text>
        ) : null}

        {kirli ? <Text style={styles.yardim}>{t('kayitAlan.kaydedilmedi')}</Text> : null}
        <Pressable
          onPress={() => void kaydet()}
          disabled={!kirli || kaydediyor || iletisimKapali}
          style={[styles.kaydet, (!kirli || iletisimKapali) && styles.kaydetKapali]}
        >
          {kaydediyor ? (
            <ActivityIndicator color={RenkTokenlari.textOnPrimary} />
          ) : (
            <Text style={styles.kaydetYazi}>{t('kayitAlan.kaydet')}</Text>
          )}
        </Pressable>

        <View style={styles.kart}>
          <Text style={styles.kartBaslik}>{t('kayitAlan.onizleme')}</Text>
          <Text style={styles.yardim}>{t('kayitAlan.onizlemeAlt')}</Text>
          {onizleme.map((satir, index) => (
            <View key={satir.id} style={styles.onizSatir}>
              <Text style={styles.onizAd}>
                {index + 1}. {satir.ad}
              </Text>
              <Text style={styles.onizMod}>
                {satir.zorunlu ? t('kayitAlan.zorunlu') : t('kayitAlan.istegeBagli')}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.bolum}>{t('kayitAlan.ozelBaslik')}</Text>
        <Text style={styles.yardim}>{t('kayitAlan.ozelAlt')}</Text>

        {data.ozel_alanlar.length === 0 ? (
          <Text style={styles.bos}>{t('kayitAlan.ozelBos')}</Text>
        ) : (
          data.ozel_alanlar.map((alan) => (
            <View key={alan.id} style={styles.kart}>
              <View style={styles.baslikSatir}>
                <View style={styles.flex1}>
                  <Text style={styles.kartBaslik}>{alan.etiket}</Text>
                  <Text style={styles.yardim}>
                    {t(turAnahtar(alan.alan_turu))}
                    {alan.alan_turu === 'select' && alan.secenekler.length
                      ? ` · ${alan.secenekler.join(', ')}`
                      : ''}
                  </Text>
                </View>
                <Pressable onPress={() => ozelSil(alan)} hitSlop={8}>
                  <Text style={styles.sil}>{t('ortak.sil')}</Text>
                </Pressable>
              </View>
              <View style={styles.segment}>
                {(['required', 'optional'] as const).map((secim, index) => {
                  const aktif = alan.mod === secim;
                  return (
                    <Pressable
                      key={secim}
                      onPress={() => void ozelModDegistir(alan, secim)}
                      style={[
                        styles.parca,
                        index > 0 && styles.parcaCizgi,
                        aktif && styles.parcaAktif,
                      ]}
                    >
                      <Text style={[styles.parcaYazi, aktif && styles.parcaYaziAktif]}>
                        {t(MOD_ANAHTAR[secim])}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        )}

        <View style={styles.kart}>
          <Text style={styles.kartBaslik}>{t('kayitAlan.yeniAlan')}</Text>
          <Text style={styles.etiket}>{t('kayitAlan.etiket')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('kayitAlan.etiketOrnek')}
            placeholderTextColor={RenkTokenlari.textDim}
            value={yeniEtiket}
            onChangeText={setYeniEtiket}
          />
          <Text style={styles.etiket}>{t('kayitAlan.tur')}</Text>
          <View style={styles.segment}>
            {TURLER.map((tur, index) => {
              const aktif = yeniTur === tur;
              return (
                <Pressable
                  key={tur}
                  onPress={() => setYeniTur(tur)}
                  style={[
                    styles.parca,
                    index > 0 && styles.parcaCizgi,
                    aktif && styles.parcaAktif,
                  ]}
                >
                  <Text style={[styles.parcaYazi, aktif && styles.parcaYaziAktif]}>
                    {t(turAnahtar(tur))}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {yeniTur === 'select' ? (
            <>
              <Text style={styles.etiket}>{t('kayitAlan.secenekler')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('kayitAlan.secenekOrnek')}
                placeholderTextColor={RenkTokenlari.textDim}
                value={yeniSecenekler}
                onChangeText={setYeniSecenekler}
              />
            </>
          ) : null}
          <Text style={styles.etiket}>{t('kayitAlan.zorunlu')}</Text>
          <View style={styles.segment}>
            {(['optional', 'required'] as const).map((secim, index) => {
              const aktif = (yeniZorunlu ? 'required' : 'optional') === secim;
              return (
                <Pressable
                  key={secim}
                  onPress={() => setYeniZorunlu(secim === 'required')}
                  style={[
                    styles.parca,
                    index > 0 && styles.parcaCizgi,
                    aktif && styles.parcaAktif,
                  ]}
                >
                  <Text style={[styles.parcaYazi, aktif && styles.parcaYaziAktif]}>
                    {t(MOD_ANAHTAR[secim])}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={() => void ozelEkle()}
            disabled={ekleniyor}
            style={[styles.kaydet, ekleniyor && styles.kaydetKapali]}
          >
            {ekleniyor ? (
              <ActivityIndicator color={RenkTokenlari.textOnPrimary} />
            ) : (
              <Text style={styles.kaydetYazi}>{t('kayitAlan.alanEkle')}</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingBottom: BoslukTokenlari.xxxl,
    gap: BoslukTokenlari.md,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  uyari: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.danger,
    padding: BoslukTokenlari.xl,
  },
  kart: {
    borderRadius: YaricapTokenlari.lg,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.surface,
    padding: BoslukTokenlari.lg,
    gap: BoslukTokenlari.sm,
  },
  kartBaslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  yardim: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    lineHeight: 18,
  },
  sabit: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    overflow: 'hidden',
    backgroundColor: RenkTokenlari.bg,
  },
  parca: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: BoslukTokenlari.xs,
    paddingVertical: BoslukTokenlari.sm,
  },
  parcaCizgi: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: RenkTokenlari.border,
  },
  parcaAktif: {
    backgroundColor: RenkTokenlari.primary,
  },
  parcaYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
  },
  parcaYaziAktif: {
    color: RenkTokenlari.textOnPrimary,
    fontWeight: '700',
  },
  kilit: {
    alignSelf: 'flex-start',
    paddingHorizontal: BoslukTokenlari.md,
    paddingVertical: BoslukTokenlari.sm,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bg,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  kilitYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  uyariKutu: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.danger,
    lineHeight: 18,
  },
  kaydet: {
    minHeight: 48,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: BoslukTokenlari.lg,
  },
  kaydetKapali: { opacity: 0.45 },
  kaydetYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textOnPrimary,
    fontWeight: '700',
  },
  onizSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: BoslukTokenlari.md,
    minHeight: 32,
  },
  onizAd: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    flex: 1,
  },
  onizMod: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    letterSpacing: 0,
  },
  bolum: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    marginTop: BoslukTokenlari.sm,
  },
  bos: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
  },
  baslikSatir: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: BoslukTokenlari.md,
  },
  flex1: { flex: 1 },
  sil: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.danger,
    fontWeight: '700',
  },
  etiket: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    marginTop: BoslukTokenlari.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: YaricapTokenlari.md,
    paddingHorizontal: BoslukTokenlari.md,
    paddingVertical: BoslukTokenlari.md,
    color: RenkTokenlari.text,
    backgroundColor: RenkTokenlari.bg,
    ...TipografiTokenlari.body,
  },
});
