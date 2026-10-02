import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useCeviri } from '../../src/i18n/useCeviri';
import { BosDurum } from '../../src/components/BosDurum';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { useAuth } from '../../src/contexts/AuthContext';
import { HesabiTamamlaKarti } from '../../src/moduller/misafir-hesabi/bilesenler/HesabiTamamlaKarti';
import { useMisafirIslemKapisi } from '../../src/moduller/misafir-hesabi/islemler/useMisafirIslemKapisi';
import { OzellikBayragiAktifMi } from '../../src/moduller/ozellik-bayraklari/OzellikBayragiAktifMi';
import { AgBaglantiDurumunuGetir } from '../../src/moduller/ag-baglantisi/okuma/AgBaglantiDurumunuGetir';
import {
  GracefulDegradationKarariVer,
  type GracefulDegradationKarari,
} from '../../src/moduller/ag-baglantisi/GracefulDegradationKarariVer';
import { DusukCihazModuAktifMi } from '../../src/moduller/performans/DusukCihazModuAktifMi';
import { MutabakatSonuclariniGetir } from '../../src/moduller/mutabakat/okuma/MutabakatSonuclariniGetir';
import {
  SertifikasyonKontrolleriniGetir,
  SertifikasyonKontrolGuncelle,
  type SertifikasyonKontrolu,
} from '../../src/moduller/sertifikasyon/okuma/SertifikasyonKontrolleriniGetir';
import { PlatformSaglikOzetiniGetir } from '../../src/moduller/sertifikasyon/okuma/PlatformSaglikOzetiniGetir';
import { HediyeAnimasyonStresTestiCalistir } from '../../src/moduller/yuk-testi/HediyeAnimasyonStresTestiCalistir';
import { LiveKitBaglantiStresSimulasyonu } from '../../src/moduller/yuk-testi/LiveKitBaglantiStresSimulasyonu';
import { AdminStil } from '../../src/moduller/admin/bilesenler/AdminStil';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

function durumEtiketi(
  status: string,
  t: (key: any, opts?: Record<string, unknown>) => string,
): { label: string; color: string; bg: string } {
  switch (status) {
    case 'pass':
      return {
        label: t('sertifikasyon.durumGecti'),
        color: RenkTokenlari.mint,
        bg: 'rgba(61,207,176,0.14)',
      };
    case 'fail':
      return {
        label: t('sertifikasyon.durumKaldi'),
        color: RenkTokenlari.danger,
        bg: 'rgba(232,75,106,0.14)',
      };
    case 'skip':
      return {
        label: t('sertifikasyon.durumAtlandi'),
        color: RenkTokenlari.textMuted,
        bg: RenkTokenlari.surface,
      };
    case 'pending':
    default:
      return {
        label: t('sertifikasyon.durumBekliyor'),
        color: RenkTokenlari.accent,
        bg: 'rgba(240,180,41,0.14)',
      };
  }
}

function kategoriAdi(
  cat: string,
  t: (key: any, opts?: Record<string, unknown>) => string,
): string {
  const map: Record<string, string> = {
    security: t('sertifikasyon.katGuvenlik'),
    network: t('sertifikasyon.katAg'),
    performance: t('sertifikasyon.katPerformans'),
    finance: t('sertifikasyon.katFinans'),
    media: t('sertifikasyon.katMedya'),
    android: 'Android',
    ios: 'iOS',
    ops: t('sertifikasyon.katOps'),
  };
  return map[cat] ?? cat;
}

function agTipiEtiketi(
  tip: string,
  t: (key: any, opts?: Record<string, unknown>) => string,
): string {
  const key = tip.toLowerCase();
  const map: Record<string, string> = {
    wifi: 'Wi‑Fi',
    cellular: t('sertifikasyon.agMobil'),
    none: t('sertifikasyon.agYok'),
    unknown: t('sertifikasyon.agBilinmiyor'),
  };
  return map[key] ?? tip;
}

export default function SertifikasyonHubEkrani() {
  const { t } = useCeviri();
  const { isGuest, refreshProfile, profile } = useAuth();
  const { upgradeAcik, upgradeKapat, islemiDene } = useMisafirIslemKapisi(isGuest);
  const isAdmin = profile?.is_admin === true;
  const hubOn = OzellikBayragiAktifMi('certification_hub_enabled');
  const stressOn = OzellikBayragiAktifMi('stress_tools_enabled');

  const [checks, setChecks] = useState<SertifikasyonKontrolu[]>([]);
  const [deg, setDeg] = useState<GracefulDegradationKarari | null>(null);
  const [agBagli, setAgBagli] = useState(true);
  const [agTip, setAgTip] = useState('—');
  const [agNet, setAgNet] = useState(true);
  const [dusukCihaz, setDusukCihaz] = useState(false);
  const [mutabakatSatirlari, setMutabakatSatirlari] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);

  const load = useCallback(async () => {
    setYukleniyor(true);
    try {
      const ag = await AgBaglantiDurumunuGetir();
      setAgTip(agTipiEtiketi(String(ag.tip), t));
      setAgBagli(!!ag.bagli);
      setAgNet(ag.internetErisilebilir !== false);
      setDusukCihaz(DusukCihazModuAktifMi());
      setDeg(GracefulDegradationKarariVer(ag));

      const [c, m, saglik] = await Promise.all([
        SertifikasyonKontrolleriniGetir().catch(() => []),
        MutabakatSonuclariniGetir(5).catch(() => []),
        PlatformSaglikOzetiniGetir().catch(() => null),
      ]);
      setChecks(c);
      setMutabakatSatirlari(
        m.length === 0
          ? []
          : m.map((r) => `${r.kind}: ${r.status}`),
      );

      if (saglik?.kill_switches && Object.keys(saglik.kill_switches).length > 0) {
        await SertifikasyonKontrolGuncelle({
          code: 'sec_kill_switches',
          status: 'pass',
          details: { keys: Object.keys(saglik.kill_switches) },
        }).catch(() => undefined);
      }
      if (ag.bagli === false || ag.internetErisilebilir === false) {
        await SertifikasyonKontrolGuncelle({
          code: 'net_offline',
          status: 'pass',
          details: { observed: true },
        }).catch(() => undefined);
      }
      if (DusukCihazModuAktifMi()) {
        await SertifikasyonKontrolGuncelle({
          code: 'android_low_end',
          status: 'pass',
          details: { mode: true },
        }).catch(() => undefined);
      }
      const refreshed = await SertifikasyonKontrolleriniGetir().catch(() => c);
      setChecks(refreshed);
    } catch {
      /* migration 011 */
    } finally {
      setYukleniyor(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      if (!isAdmin) {
        router.replace('/(tabs)/profile');
        return;
      }
      void load();
    }, [isAdmin, load]),
  );

  const ozet = useMemo(() => {
    const pass = checks.filter((c) => c.status === 'pass').length;
    const fail = checks.filter((c) => c.status === 'fail').length;
    const pending = checks.filter((c) => c.status === 'pending').length;
    return { pass, fail, pending, total: checks.length };
  }, [checks]);

  const gruplu = useMemo(() => {
    const map = new Map<string, SertifikasyonKontrolu[]>();
    for (const c of checks) {
      const key = c.category || 'ops';
      const list = map.get(key) ?? [];
      list.push(c);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [checks]);

  if (!isAdmin) {
    return (
      <Screen edges={['top']}>
        <View style={styles.yetkisiz}>
          <Text style={styles.yetkisizYazi}>{t('sertifikasyon.yetkisiz')}</Text>
        </View>
      </Screen>
    );
  }

  const stresHediye = () => {
    islemiDene('oy_kullan', async () => {
      if (!stressOn && !hubOn) {
        Alert.alert(t('sertifikasyon.alertKapali'), t('sertifikasyon.alertStresKapali'));
        return;
      }
      setBusy(true);
      try {
        const r = await HediyeAnimasyonStresTestiCalistir(40);
        Alert.alert(
          r.ok ? t('sertifikasyon.testGecti') : t('sertifikasyon.testKaldi'),
          t('sertifikasyon.hediyeSonuc', {
            eklenen: r.eklenen,
            dusuruldu: r.dusuruldu,
            sureMs: r.sureMs,
          }),
        );
        await load();
      } finally {
        setBusy(false);
      }
    });
  };

  const stresLivekit = () => {
    islemiDene('oy_kullan', async () => {
      if (!stressOn && !hubOn) {
        Alert.alert(t('sertifikasyon.alertKapali'), t('sertifikasyon.alertStresKapali'));
        return;
      }
      setBusy(true);
      try {
        const r = await LiveKitBaglantiStresSimulasyonu(5);
        Alert.alert(
          r.ok ? t('sertifikasyon.testGecti') : t('sertifikasyon.testKaldi'),
          `${t('sertifikasyon.livekitSonuc', {
            basarili: r.basarili,
            basarisiz: r.basarisiz,
            sureMs: r.sureMs,
          })}${r.hata ? `\n${r.hata}` : ''}`,
        );
        await load();
      } finally {
        setBusy(false);
      }
    });
  };

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri modulAdi="sertifikasyon">
        <EkranBasligi
          title={t('sertifikasyon.baslik')}
          subtitle={t('sertifikasyon.altBaslik')}
          fallbackHref="/admin"
        />
        <ScrollView
          contentContainerStyle={AdminStil.content}
          refreshControl={
            <RefreshControl refreshing={yukleniyor} onRefresh={() => void load()} />
          }
        >
          <View style={styles.bayrakSatir}>
              <View style={[styles.bayrak, hubOn ? styles.bayrakAcik : styles.bayrakKapali]}>
                <Text style={styles.bayrakYazi}>
                  {hubOn ? t('sertifikasyon.hubAcik') : t('sertifikasyon.hubKapali')}
                </Text>
              </View>
              <View style={[styles.bayrak, stressOn ? styles.bayrakAcik : styles.bayrakKapali]}>
                <Text style={styles.bayrakYazi}>
                  {stressOn ? t('sertifikasyon.stresAcik') : t('sertifikasyon.stresKapali')}
                </Text>
              </View>
          </View>

          <View style={AdminStil.kpiGrid}>
            <View style={AdminStil.kpi}>
              <Text style={[AdminStil.kpiN, { color: RenkTokenlari.mint }]}>{ozet.pass}</Text>
              <Text style={AdminStil.kpiL}>{t('sertifikasyon.kpiGecen')}</Text>
            </View>
            <View style={AdminStil.kpi}>
              <Text style={[AdminStil.kpiN, { color: RenkTokenlari.danger }]}>{ozet.fail}</Text>
              <Text style={AdminStil.kpiL}>{t('sertifikasyon.kpiKalan')}</Text>
            </View>
            <View style={AdminStil.kpi}>
              <Text style={[AdminStil.kpiN, { color: RenkTokenlari.accent }]}>
                {ozet.pending}
              </Text>
              <Text style={AdminStil.kpiL}>{t('sertifikasyon.kpiBekleyen')}</Text>
            </View>
            <View style={AdminStil.kpi}>
              <Text style={AdminStil.kpiN}>{ozet.total}</Text>
              <Text style={AdminStil.kpiL}>{t('sertifikasyon.kpiToplam')}</Text>
            </View>
          </View>

          <Text style={AdminStil.sectionLabel}>{t('sertifikasyon.bolumCihazAg')}</Text>
          <View style={styles.durumGrid}>
            <DurumKart
              icon="wifi"
              baslik={t('sertifikasyon.baglanti')}
              deger={agBagli ? agTip : t('sertifikasyon.yok')}
              iyi={agBagli && agNet}
            />
            <DurumKart
              icon="globe-outline"
              baslik={t('sertifikasyon.internet')}
              deger={agNet ? t('sertifikasyon.erisilebilir') : t('sertifikasyon.yok')}
              iyi={agNet}
            />
            <DurumKart
              icon="phone-portrait-outline"
              baslik={t('sertifikasyon.cihaz')}
              deger={dusukCihaz ? t('sertifikasyon.dusukUc') : t('sertifikasyon.normal')}
              iyi={!dusukCihaz}
            />
            <DurumKart
              icon="flash-outline"
              baslik={t('sertifikasyon.yumusakDusus')}
              deger={deg?.aktif ? t('sertifikasyon.aktif') : t('sertifikasyon.kapali')}
              iyi={!deg?.aktif}
            />
          </View>

          <View style={AdminStil.kart}>
            <Text style={AdminStil.kartBaslik}>{t('sertifikasyon.perfKapilari')}</Text>
            <Text style={AdminStil.kartAlt}>{t('sertifikasyon.perfKapilariAlt')}</Text>
            <SatirBaslik
              etiket={t('sertifikasyon.agirAnimasyon')}
              deger={
                deg?.agirAnimasyonIzinli
                  ? t('sertifikasyon.izinli')
                  : t('sertifikasyon.kisitli')
              }
            />
            <SatirBaslik
              etiket={t('sertifikasyon.canliYenidenBaglan')}
              deger={
                deg?.livekitYenidenBaglanIzinli
                  ? t('sertifikasyon.izinli')
                  : t('sertifikasyon.kapali')
              }
            />
            <SatirBaslik
              etiket={t('sertifikasyon.yalnizcaOnbellek')}
              deger={
                deg?.yalnizcaOnbellek ? t('sertifikasyon.evet') : t('sertifikasyon.hayir')
              }
            />
            {deg?.sebep?.length ? (
              <Text style={styles.sebep}>
                {t('sertifikasyon.sebep', { liste: deg.sebep.join(', ') })}
              </Text>
            ) : null}
          </View>

          <Text style={AdminStil.sectionLabel}>{t('sertifikasyon.mutabakat')}</Text>
          <View style={AdminStil.kart}>
            {mutabakatSatirlari.length === 0 ? (
              <Text style={AdminStil.kartAlt}>{t('sertifikasyon.mutabakatBos')}</Text>
            ) : (
              mutabakatSatirlari.map((s) => (
                <Text key={s} style={styles.mutabakatSatir}>
                  {s}
                </Text>
              ))
            )}
          </View>

          <Text style={AdminStil.sectionLabel}>{t('sertifikasyon.kontrolListesi')}</Text>
          {yukleniyor && checks.length === 0 ? (
            <ActivityIndicator color={RenkTokenlari.accent} />
          ) : checks.length === 0 ? (
            <BosDurum
              icon="checkmark-circle-outline"
              title={t('sertifikasyon.kontrolYok')}
              body={t('sertifikasyon.kontrolYokBody')}
            />
          ) : (
            gruplu.map(([cat, items]) => (
              <View key={cat} style={AdminStil.kart}>
                <Text style={styles.kategoriBaslik}>{kategoriAdi(cat, t)}</Text>
                {items.map((c) => {
                  const d = durumEtiketi(c.status, t);
                  return (
                    <View key={c.code} style={styles.kontrolSatir}>
                      <View style={styles.kontrolMetin}>
                        <Text style={styles.kontrolBaslik}>{c.title}</Text>
                        <Text style={styles.kontrolKod}>{c.code}</Text>
                      </View>
                      <View style={[styles.durumChip, { backgroundColor: d.bg }]}>
                        <Text style={[styles.durumChipYazi, { color: d.color }]}>
                          {d.label}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))
          )}

          <Text style={AdminStil.sectionLabel}>{t('sertifikasyon.yukTestleri')}</Text>
          <View style={AdminStil.kart}>
            <Text style={AdminStil.kartAlt}>{t('sertifikasyon.yukTestleriAlt')}</Text>
            <Pressable
              style={[styles.aksiyonBtn, busy && styles.aksiyonDisabled]}
              disabled={busy}
              onPress={stresHediye}
            >
              <Ionicons name="gift-outline" size={18} color={RenkTokenlari.text} />
              <View style={styles.aksiyonMetin}>
                <Text style={styles.aksiyonBaslik}>
                  {busy ? t('sertifikasyon.calisiyor') : t('sertifikasyon.hediyeStres')}
                </Text>
                <Text style={styles.aksiyonAlt}>{t('sertifikasyon.hediyeStresAlt')}</Text>
              </View>
            </Pressable>
            <Pressable
              style={[styles.aksiyonBtn, busy && styles.aksiyonDisabled]}
              disabled={busy}
              onPress={stresLivekit}
            >
              <Ionicons name="radio-outline" size={18} color={RenkTokenlari.text} />
              <View style={styles.aksiyonMetin}>
                <Text style={styles.aksiyonBaslik}>
                  {busy ? t('sertifikasyon.calisiyor') : t('sertifikasyon.baglantiYeniden')}
                </Text>
                <Text style={styles.aksiyonAlt}>{t('sertifikasyon.baglantiYenidenAlt')}</Text>
              </View>
            </Pressable>
            <Pressable
              style={styles.aksiyonBtn}
              onPress={() => router.push('/guvenlik' as any)}
            >
              <Ionicons name="shield-checkmark-outline" size={18} color={RenkTokenlari.mint} />
              <View style={styles.aksiyonMetin}>
                <Text style={styles.aksiyonBaslik}>{t('sertifikasyon.guvenlikMerkezi')}</Text>
                <Text style={styles.aksiyonAlt}>{t('sertifikasyon.guvenlikMerkeziAlt')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={RenkTokenlari.textDim} />
            </Pressable>
          </View>
        </ScrollView>

        <HesabiTamamlaKarti
          visible={upgradeAcik}
          onClose={upgradeKapat}
          onCompleted={() => {
            void refreshProfile();
            Alert.alert(t('ortak.tamam'), t('sertifikasyon.hesapGuncellendi'));
          }}
        />
      </ModulHataSiniri>
    </Screen>
  );
}

function DurumKart({
  icon,
  baslik,
  deger,
  iyi,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  baslik: string;
  deger: string;
  iyi: boolean;
}) {
  return (
    <View style={styles.durumKart}>
      <View
        style={[
          styles.durumIcon,
          { backgroundColor: iyi ? 'rgba(61,207,176,0.14)' : 'rgba(232,75,106,0.14)' },
        ]}
      >
        <Ionicons
          name={icon}
          size={16}
          color={iyi ? RenkTokenlari.mint : RenkTokenlari.danger}
        />
      </View>
      <Text style={styles.durumBaslik}>{baslik}</Text>
      <Text style={styles.durumDeger}>{deger}</Text>
    </View>
  );
}

function SatirBaslik({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <View style={AdminStil.satir}>
      <Text style={styles.satirEtiket}>{etiket}</Text>
      <Text style={styles.satirDeger}>{deger}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  yetkisiz: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  yetkisizYazi: { ...TipografiTokenlari.body, color: RenkTokenlari.textMuted },
  bayrakSatir: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  bayrak: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  bayrakAcik: { backgroundColor: 'rgba(61,207,176,0.16)' },
  bayrakKapali: { backgroundColor: 'rgba(232,75,106,0.16)' },
  bayrakYazi: { ...TipografiTokenlari.micro, color: RenkTokenlari.text, fontWeight: '700' },
  durumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: BoslukTokenlari.sm,
  },
  durumKart: {
    width: '48%',
    flexGrow: 1,
    minWidth: '46%',
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    gap: 6,
  },
  durumIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durumBaslik: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim },
  durumDeger: { ...TipografiTokenlari.body, color: RenkTokenlari.text, fontWeight: '700' },
  satirEtiket: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
  satirDeger: { ...TipografiTokenlari.caption, color: RenkTokenlari.text, fontWeight: '700' },
  sebep: { ...TipografiTokenlari.micro, color: RenkTokenlari.accent, marginTop: 4 },
  mutabakatSatir: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
  kategoriBaslik: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.accent,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  kontrolSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: RenkTokenlari.border,
  },
  kontrolMetin: { flex: 1, gap: 2 },
  kontrolBaslik: { ...TipografiTokenlari.body, color: RenkTokenlari.text, fontWeight: '600' },
  kontrolKod: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim },
  durumChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  durumChipYazi: { ...TipografiTokenlari.micro, fontWeight: '800' },
  aksiyonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  aksiyonDisabled: { opacity: 0.5 },
  aksiyonMetin: { flex: 1, gap: 2 },
  aksiyonBaslik: { ...TipografiTokenlari.body, color: RenkTokenlari.text, fontWeight: '700' },
  aksiyonAlt: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim },
});
