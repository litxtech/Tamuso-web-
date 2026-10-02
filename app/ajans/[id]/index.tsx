import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { EkranBasligi, guvenliGeriDon } from '../../../src/components/EkranBasligi';
import { ModulHataSiniri } from '../../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { AjansAtmosfer } from '../../../src/moduller/ajanslar/bilesenler/AjansAtmosfer';
import { AjansBolumRayi } from '../../../src/moduller/ajanslar/bilesenler/AjansBolumRayi';
import {
  AjansCekmeceMenu,
  AjansMenuDugmesi,
} from '../../../src/moduller/ajanslar/bilesenler/AjansCekmeceMenu';
import {
  AjansBolumBaslik,
  AjansHint,
  AjansHeroKapak,
  AjansKart,
  AjansKpiHucre,
  AjansListeSatir,
} from '../../../src/moduller/ajanslar/bilesenler/AjansYonetimPrimitifleri';
import {
  ajansHref,
  useAjansRouteId,
} from '../../../src/moduller/ajanslar/kancalar/useAjansRouteId';
import {
  AjansBugunOzetGetir,
  AjansDashboardKpiGetir,
  AjansIzinlerim,
  AjansIzinVar,
  AjansSeviyeProgressGetir,
  AjansUyariMotoruGetir,
  saniyeSaatMetni,
  type AjansBugunOzet,
  type AjansDashboardKpi,
  type AjansIzinler,
  type AjansUyari,
} from '../../../src/moduller/ajanslar/islemler/AjansYonetimV2Islemleri';
import {
  AjansBugunEtiket,
  AjansEksikCevir,
  AjansUyariBaslik,
  AjansUyariGovde,
} from '../../../src/moduller/ajanslar/i18n/AjansEtiketleri';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useTemayaAboneOl } from '../../../src/tasarim-sistemi/tema/useTemayaAboneOl';
import { useCeviri } from '../../../src/i18n/useCeviri';

function seviyeEtiket(code: string | null | undefined) {
  return (code ?? 'bronze').toUpperCase();
}

export default function AjansKontrolMerkeziEkrani() {
  useTemayaAboneOl();
  const { t } = useCeviri();
  const id = useAjansRouteId();
  const [menuAcik, setMenuAcik] = useState(false);
  const [kpi, setKpi] = useState<AjansDashboardKpi | null>(null);
  const [bugun, setBugun] = useState<AjansBugunOzet | null>(null);
  const [uyarilar, setUyarilar] = useState<AjansUyari[]>([]);
  const [izinler, setIzinler] = useState<AjansIzinler | null>(null);
  const [seviye, setSeviye] = useState<Record<string, unknown> | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [kpiAcik, setKpiAcik] = useState(false);

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    setHata(null);
    try {
      const iz = await AjansIzinlerim(id);
      setIzinler(iz);
      const [k, b, u, s] = await Promise.all([
        AjansDashboardKpiGetir(id),
        AjansBugunOzetGetir(id),
        AjansUyariMotoruGetir(id).catch(() => []),
        AjansSeviyeProgressGetir(id).catch(() => null),
      ]);
      setKpi(k);
      setBugun(b);
      setUyarilar(u);
      setSeviye(s);
    } catch (e) {
      setHata(e instanceof Error ? e.message : t('ajans.yuklenemedi'));
      setKpi(null);
    } finally {
      setYukleniyor(false);
    }
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  const a = kpi?.agency;
  const anaKpi = kpi
    ? [
        { l: t('ajans.kpiUyeler'), v: String(kpi.uyeler), emph: true },
        { l: t('ajans.kpiCevrimici'), v: String(kpi.cevrimici), emph: true },
        { l: t('ajans.kpiCanli'), v: String(kpi.canli_yayinda), emph: true },
        { l: t('ajans.kpiSesOdasi'), v: String(kpi.ses_odasinda), emph: true },
      ]
    : [];
  const ekstraKpi = kpi
    ? [
        { l: t('ajans.kpiBekleyen'), v: String(kpi.bekleyen_basvuru) },
        { l: t('ajans.kpiBuAyYayin'), v: saniyeSaatMetni(kpi.bu_ay_yayin_saniye) },
        { l: t('ajans.kpiBuAySes'), v: saniyeSaatMetni(kpi.bu_ay_ses_saniye) },
        {
          l: t('ajans.kpiAktivite'),
          v: saniyeSaatMetni(kpi.bu_ay_platform_aktivite_saniye),
        },
      ]
    : [];

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri
        modulAdi="ajans-kontrol"
        varyant="ekran"
        fallbackHref="/(tabs)/profile"
      >
        <View style={styles.root}>
          <AjansAtmosfer />
          <EkranBasligi
            title={a?.name?.trim() || t('ajans.ozetBolum')}
            subtitle={a?.name?.trim() ? t('ajans.ozetBolum') : undefined}
            border
            onBack={() => guvenliGeriDon('/(tabs)/profile')}
            right={<AjansMenuDugmesi onPress={() => setMenuAcik(true)} />}
          />
          <AjansBolumRayi agencyId={id} aktif="ozet" />
          {yukleniyor && !kpi ? (
            <ActivityIndicator
              color={RenkTokenlari.primarySoft}
              style={{ marginTop: 32 }}
            />
          ) : hata && !kpi ? (
            <Text style={styles.hata}>{hata}</Text>
          ) : kpi && a ? (
            <ScrollView
              contentContainerStyle={styles.content}
              refreshControl={
                <RefreshControl
                  refreshing={yukleniyor}
                  onRefresh={() => void yukle()}
                  tintColor={RenkTokenlari.primarySoft}
                />
              }
            >
              <AjansHeroKapak
                name={a.name}
                subtitle={a.username ? `@${a.username}` : a.agency_public_id}
                logoUrl={a.logo_url}
                bannerUrl={a.banner_url}
                levelLabel={seviyeEtiket(a.level_code)}
                verified={!!a.is_verified}
                meta={t('ajans.metaUye', {
                  id: a.agency_public_id,
                  count: kpi.uyeler,
                })}
                actionLabel={
                  AjansIzinVar(izinler, 'agency.manage_settings')
                    ? t('ajans.ajansiYonet')
                    : undefined
                }
                onAction={
                  AjansIzinVar(izinler, 'agency.manage_settings')
                    ? () => router.push(ajansHref(id, 'ayarlar') as any)
                    : undefined
                }
              />

              {seviye ? (
                <AjansKart>
                  <View style={styles.seviyeBas}>
                    <Text style={styles.seviyeBaslik}>
                      {seviyeEtiket(String(seviye.current ?? a.level_code))}
                      {seviye.next
                        ? ` → ${seviyeEtiket(String(seviye.next))}`
                        : t('ajans.seviyeMax')}
                    </Text>
                    <Text style={styles.seviyePct}>
                      %{Number(seviye.progress_pct) || 0}
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(100, Number(seviye.progress_pct) || 0)}%`,
                        },
                      ]}
                    />
                  </View>
                  {Array.isArray(seviye.eksikler) && seviye.eksikler.length ? (
                    <AjansHint>
                      {t('ajans.eksikOnEk', {
                        liste: (seviye.eksikler as string[])
                          .map((x) => AjansEksikCevir(String(x), t))
                          .join(', '),
                      })}
                    </AjansHint>
                  ) : null}
                </AjansKart>
              ) : null}

              <AjansBolumBaslik>{t('ajans.anlikDurum')}</AjansBolumBaslik>
              <View style={styles.kpiGrid}>
                {anaKpi.map((x) => (
                  <AjansKpiHucre
                    key={x.l}
                    label={x.l}
                    value={x.v}
                    emphasize={x.emph}
                  />
                ))}
              </View>
              {kpiAcik ? (
                <View style={styles.kpiGrid}>
                  {ekstraKpi.map((x) => (
                    <AjansKpiHucre key={x.l} label={x.l} value={x.v} />
                  ))}
                </View>
              ) : null}
              <Pressable
                onPress={() => setKpiAcik((v) => !v)}
                style={styles.daha}
              >
                <Text style={styles.dahaYazi}>
                  {kpiAcik ? t('ajans.dahaAz') : t('ajans.dahaFazlaMetrik')}
                </Text>
                <Ionicons
                  name={kpiAcik ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={RenkTokenlari.primarySoft}
                />
              </Pressable>

              <AjansBolumBaslik>{t('ajans.bugun')}</AjansBolumBaslik>
              <AjansKart>
                {(bugun?.maddeler ?? []).length === 0 ? (
                  <AjansHint>{t('ajans.henuzVeriYok')}</AjansHint>
                ) : (
                  (bugun?.maddeler ?? []).map((m) => (
                    <AjansListeSatir
                      key={m.key}
                      title={AjansBugunEtiket(m.key, t)}
                      subtitle={t('ajans.kayitSayisi', { count: m.count })}
                      leading={
                        <View style={styles.bugunSayi}>
                          <Text style={styles.bugunSayiYazi}>{m.count}</Text>
                        </View>
                      }
                      onPress={() =>
                        router.push(ajansHref(id, m.href) as any)
                      }
                    />
                  ))
                )}
              </AjansKart>

              <AjansBolumBaslik>{t('ajans.dikkat')}</AjansBolumBaslik>
              <AjansKart accent={uyarilar.length > 0}>
                {uyarilar.length === 0 ? (
                  <AjansHint>{t('ajans.uyariYok')}</AjansHint>
                ) : (
                  uyarilar.slice(0, 8).map((u, i) => (
                    <AjansListeSatir
                      key={`${u.code}-${i}`}
                      title={AjansUyariBaslik(u.code, t)}
                      subtitle={AjansUyariGovde(u.code, u.body, t)}
                      onPress={
                        u.href
                          ? () => router.push(ajansHref(id, u.href) as any)
                          : undefined
                      }
                    />
                  ))
                )}
              </AjansKart>
            </ScrollView>
          ) : (
            <Text style={styles.hata}>{t('ajans.ajansBulunamadi')}</Text>
          )}

          <AjansCekmeceMenu
            acik={menuAcik}
            onKapat={() => setMenuAcik(false)}
            agencyId={id}
            agencyName={a?.name}
            aktif="ozet"
            onOgeSec={(href) => router.push(href as any)}
          />
        </View>
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: BoslukTokenlari.sm,
    paddingBottom: BoslukTokenlari.xxxl,
    gap: BoslukTokenlari.md,
  },
  seviyeBas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seviyeBaslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  seviyePct: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: RenkTokenlari.primarySoft,
    borderRadius: 4,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  daha: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  dahaYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '600',
  },
  bugunSayi: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: RenkTokenlari.pressFill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.borderAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bugunSayiYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.primarySoft,
    fontWeight: '800',
  },
  hata: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.danger,
    textAlign: 'center',
    marginTop: 48,
    paddingHorizontal: 24,
  },
});
