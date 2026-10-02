import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { EkranBasligi } from '../../../src/components/EkranBasligi';
import { useAuth } from '../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminStil } from '../../../src/moduller/admin/bilesenler/AdminStil';
import {
  AdminUlkeLigiHaftayiKapat,
  AdminUlkeLigiOzetGetir,
  AdminUlkeLigiPromoPuan,
  AdminUlkeLigiUlkeAktiflikAyarla,
  AdminUlkeLigiUrunPuanAyarla,
  AdminUlkeLigiUygunlukAyarla,
} from '../../../src/moduller/ulke-ligi/islemler/UlkeLigiApi';
import type { AdminUlkeLigiOzet } from '../../../src/moduller/ulke-ligi/tipler';
import { useCeviri } from '../../../src/i18n/useCeviri';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

export default function AdminUlkeLigiEkrani() {
  const { t } = useCeviri();
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [ozet, setOzet] = useState<AdminUlkeLigiOzet | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [mesgul, setMesgul] = useState(false);
  const [urunId, setUrunId] = useState('');
  const [urunPuan, setUrunPuan] = useState('');
  const [ulkeKodu, setUlkeKodu] = useState('');
  const [ulkeSebep, setUlkeSebep] = useState('');
  const [promoKodu, setPromoKodu] = useState('');
  const [promoPuan, setPromoPuan] = useState('');
  const [promoSebep, setPromoSebep] = useState('');

  const yukle = useCallback(async () => {
    if (!admin) return;
    setYukleniyor(true);
    try {
      setOzet(await AdminUlkeLigiOzetGetir());
    } catch {
      setOzet(null);
    } finally {
      setYukleniyor(false);
    }
  }, [admin]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  if (!admin) {
    return (
      <Screen edges={['top']}>
        <EkranBasligi title={t('ulkeLigi.adminBaslik')} fallbackHref="/admin" />
        <Text style={styles.forbidden}>Forbidden</Text>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title={t('ulkeLigi.adminBaslik')}
        subtitle={t('ulkeLigi.adminAlt')}
        fallbackHref="/admin"
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={yukleniyor} onRefresh={() => void yukle()} />
        }
      >
        {yukleniyor && !ozet ? (
          <ActivityIndicator color={RenkTokenlari.accent} />
        ) : (
          <>
            <View style={AdminStil.kart}>
              <Text style={styles.bolum}>{t('ulkeLigi.adminOzet')}</Text>
              <Text style={styles.meta}>
                week: {ozet?.week_code ?? '—'} · countries:{' '}
                {ozet?.enabled_countries ?? '—'}/{ozet?.total_countries ?? '—'} ·
                events: {ozet?.active_contributors ?? '—'}
              </Text>
            </View>

            <View style={AdminStil.kart}>
              <Text style={styles.bolum}>{t('ulkeLigi.adminUygunluk')}</Text>
              {(ozet?.eligibility ?? []).map((e) => (
                <View key={e.category} style={styles.satir}>
                  <Text style={styles.satirAd}>{e.label ?? e.category}</Text>
                  <Switch
                    value={e.enabled}
                    disabled={mesgul}
                    onValueChange={(v) => {
                      void (async () => {
                        setMesgul(true);
                        const r = await AdminUlkeLigiUygunlukAyarla(e.category, v);
                        setMesgul(false);
                        if (!r.ok) Alert.alert(t('ulkeLigi.adminHata'), r.hata);
                        else void yukle();
                      })();
                    }}
                  />
                </View>
              ))}
            </View>

            <View style={AdminStil.kart}>
              <Text style={styles.bolum}>{t('ulkeLigi.adminUrunler')}</Text>
              {(ozet?.products ?? []).slice(0, 12).map((p) => (
                <Text key={p.product_id} style={styles.meta}>
                  {p.product_id}: {p.points} {p.enabled ? '' : '(off)'}
                </Text>
              ))}
              <TextInput
                style={styles.input}
                placeholder={t('ulkeLigi.adminUrunId')}
                placeholderTextColor={RenkTokenlari.textDim}
                value={urunId}
                onChangeText={setUrunId}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder={t('ulkeLigi.adminPuan')}
                placeholderTextColor={RenkTokenlari.textDim}
                value={urunPuan}
                onChangeText={setUrunPuan}
                keyboardType="number-pad"
              />
              <Pressable
                style={styles.btn}
                disabled={mesgul}
                onPress={() => {
                  void (async () => {
                    setMesgul(true);
                    const r = await AdminUlkeLigiUrunPuanAyarla(
                      urunId.trim(),
                      Number(urunPuan) || 0,
                      true,
                    );
                    setMesgul(false);
                    Alert.alert(
                      r.ok ? t('ulkeLigi.adminBasarili') : t('ulkeLigi.adminHata'),
                      r.hata,
                    );
                    if (r.ok) void yukle();
                  })();
                }}
              >
                <Text style={styles.btnText}>{t('ulkeLigi.adminKaydet')}</Text>
              </Pressable>
            </View>

            <View style={AdminStil.kart}>
              <Text style={styles.bolum}>{t('ulkeLigi.adminUlkeAktif')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('ulkeLigi.adminUlkeKodu')}
                placeholderTextColor={RenkTokenlari.textDim}
                value={ulkeKodu}
                onChangeText={setUlkeKodu}
                autoCapitalize="characters"
                maxLength={2}
              />
              <TextInput
                style={styles.input}
                placeholder={t('ulkeLigi.adminSebep')}
                placeholderTextColor={RenkTokenlari.textDim}
                value={ulkeSebep}
                onChangeText={setUlkeSebep}
              />
              <View style={styles.rowBtns}>
                <Pressable
                  style={[styles.btn, styles.btnFlex]}
                  disabled={mesgul}
                  onPress={() => {
                    void (async () => {
                      setMesgul(true);
                      const r = await AdminUlkeLigiUlkeAktiflikAyarla(
                        ulkeKodu,
                        true,
                        ulkeSebep || 'enable',
                      );
                      setMesgul(false);
                      Alert.alert(
                        r.ok ? t('ulkeLigi.adminBasarili') : t('ulkeLigi.adminHata'),
                        r.hata,
                      );
                    })();
                  }}
                >
                  <Text style={styles.btnText}>{t('ulkeLigi.adminAktifEt')}</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.btnFlex, styles.btnDanger]}
                  disabled={mesgul}
                  onPress={() => {
                    void (async () => {
                      setMesgul(true);
                      const r = await AdminUlkeLigiUlkeAktiflikAyarla(
                        ulkeKodu,
                        false,
                        ulkeSebep || 'disable',
                      );
                      setMesgul(false);
                      Alert.alert(
                        r.ok ? t('ulkeLigi.adminBasarili') : t('ulkeLigi.adminHata'),
                        r.hata,
                      );
                    })();
                  }}
                >
                  <Text style={styles.btnText}>{t('ulkeLigi.adminKapat')}</Text>
                </Pressable>
              </View>
            </View>

            <View style={AdminStil.kart}>
              <Text style={styles.bolum}>{t('ulkeLigi.adminPromo')}</Text>
              <Text style={styles.hint}>{t('ulkeLigi.adminPromoHint')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('ulkeLigi.adminUlkeKodu')}
                placeholderTextColor={RenkTokenlari.textDim}
                value={promoKodu}
                onChangeText={setPromoKodu}
                autoCapitalize="characters"
                maxLength={2}
              />
              <TextInput
                style={styles.input}
                placeholder={t('ulkeLigi.adminPuan')}
                placeholderTextColor={RenkTokenlari.textDim}
                value={promoPuan}
                onChangeText={setPromoPuan}
                keyboardType="number-pad"
              />
              <TextInput
                style={styles.input}
                placeholder={t('ulkeLigi.adminSebep')}
                placeholderTextColor={RenkTokenlari.textDim}
                value={promoSebep}
                onChangeText={setPromoSebep}
              />
              <Pressable
                style={styles.btn}
                disabled={mesgul}
                onPress={() => {
                  void (async () => {
                    setMesgul(true);
                    const r = await AdminUlkeLigiPromoPuan(
                      promoKodu,
                      Number(promoPuan) || 0,
                      promoSebep,
                    );
                    setMesgul(false);
                    Alert.alert(
                      r.ok ? t('ulkeLigi.adminBasarili') : t('ulkeLigi.adminHata'),
                      r.hata,
                    );
                  })();
                }}
              >
                <Text style={styles.btnText}>{t('ulkeLigi.adminPromoUygula')}</Text>
              </Pressable>
            </View>

            <Pressable
              style={[styles.btn, styles.btnDanger]}
              disabled={mesgul}
              onPress={() => {
                Alert.alert(t('ulkeLigi.adminHaftaKapat'), t('ulkeLigi.adminHaftaKapatOnay'), [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'OK',
                    style: 'destructive',
                    onPress: () => {
                      void (async () => {
                        setMesgul(true);
                        const r = await AdminUlkeLigiHaftayiKapat();
                        setMesgul(false);
                        Alert.alert(
                          r.ok ? t('ulkeLigi.adminBasarili') : t('ulkeLigi.adminHata'),
                          r.hata ?? r.week_code ?? undefined,
                        );
                        if (r.ok) void yukle();
                      })();
                    },
                  },
                ]);
              }}
            >
              <Text style={styles.btnText}>{t('ulkeLigi.adminHaftaKapat')}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: BoslukTokenlari.md,
    paddingBottom: 120,
    gap: 12,
  },
  forbidden: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.danger,
    textAlign: 'center',
    marginTop: 40,
  },
  bolum: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontWeight: '800',
    marginBottom: 8,
  },
  meta: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted, marginBottom: 4 },
  hint: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim, marginBottom: 8 },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
  },
  satirAd: { ...TipografiTokenlari.body, color: RenkTokenlari.text, flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: YaricapTokenlari.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: RenkTokenlari.text,
    marginBottom: 8,
    backgroundColor: RenkTokenlari.bgElevated,
  },
  btn: {
    backgroundColor: RenkTokenlari.accent,
    borderRadius: YaricapTokenlari.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnFlex: { flex: 1 },
  btnDanger: { backgroundColor: RenkTokenlari.danger },
  btnText: { ...TipografiTokenlari.body, color: '#fff', fontWeight: '800' },
  rowBtns: { flexDirection: 'row', gap: 8 },
});
