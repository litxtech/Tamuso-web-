import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { BosDurum } from '../../src/components/BosDurum';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { useCeviri } from '../../src/i18n/useCeviri';
import {
  KillSwitchAktifMi,
  OzellikBayragiAktifMi,
} from '../../src/moduller/ozellik-bayraklari/OzellikBayragiAktifMi';
import { UlkeHeroKart } from '../../src/moduller/ulke-ligi/bilesenler/UlkeHeroKart';
import { UlkeKatkiciSatir } from '../../src/moduller/ulke-ligi/bilesenler/UlkeKatkiciSatir';
import {
  UlkeDetayGetir,
  UlkeKatkicilariGetir,
  UlkeSehirleriGetir,
} from '../../src/moduller/ulke-ligi/islemler/UlkeLigiApi';
import { ulkePuanKisa } from '../../src/moduller/ulke-ligi/utils/UlkeLigiFormat';
import { ulkeGorunenAd } from '../../src/moduller/kisiler-kesif/utils/KisilerYardimcilar';
import type {
  UlkeDetay,
  UlkeKatkici,
  UlkeLigiPeriod,
  UlkeSehirSatiri,
} from '../../src/moduller/ulke-ligi/tipler';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

type Tab = 'genel' | 'katcicilar' | 'sehirler';

export default function UlkeDetayEkrani() {
  const { t } = useCeviri();
  const params = useLocalSearchParams<{ code?: string }>();
  const code = String(params.code ?? '')
    .trim()
    .toUpperCase()
    .slice(0, 2);

  const [tab, setTab] = useState<Tab>('genel');
  const [period, setPeriod] = useState<UlkeLigiPeriod>('weekly');
  const [detay, setDetay] = useState<UlkeDetay | null>(null);
  const [katcicilar, setKatcicilar] = useState<UlkeKatkici[]>([]);
  const [sehirler, setSehirler] = useState<UlkeSehirSatiri[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState(false);

  const acik =
    OzellikBayragiAktifMi('country_league_enabled') &&
    !KillSwitchAktifMi('kill_country_league_display');

  const yukle = useCallback(async () => {
    if (!acik || code.length !== 2) {
      setYukleniyor(false);
      return;
    }
    setYukleniyor(true);
    setHata(false);
    try {
      const d = await UlkeDetayGetir(code);
      setDetay(d);
      const [k, s] = await Promise.all([
        OzellikBayragiAktifMi('country_league_contributors_enabled')
          ? UlkeKatkicilariGetir({
              countryCode: code,
              period,
              limit: 40,
            }).catch(() => ({ rows: [] as UlkeKatkici[] }))
          : Promise.resolve({ rows: [] as UlkeKatkici[] }),
        OzellikBayragiAktifMi('country_league_city_integration_enabled')
          ? UlkeSehirleriGetir(code, 40).catch(() => [] as UlkeSehirSatiri[])
          : Promise.resolve([] as UlkeSehirSatiri[]),
      ]);
      setKatcicilar(k.rows);
      setSehirler(s);
    } catch {
      setHata(true);
      setDetay(null);
    } finally {
      setYukleniyor(false);
    }
  }, [acik, code, period]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  const tabs = useMemo(() => {
    const list: { id: Tab; label: string }[] = [
      { id: 'genel', label: t('ulkeLigi.tabGenel') },
    ];
    if (OzellikBayragiAktifMi('country_league_contributors_enabled')) {
      list.push({ id: 'katcicilar', label: t('ulkeLigi.tabKatcicilar') });
    }
    if (OzellikBayragiAktifMi('country_league_city_integration_enabled')) {
      list.push({ id: 'sehirler', label: t('ulkeLigi.tabSehirler') });
    }
    return list;
  }, [t]);

  if (!acik) {
    return (
      <Screen edges={['top']}>
        <EkranBasligi title={t('ulkeLigi.baslik')} fallbackHref="/ulke" />
        <BosDurum
          icon="globe-outline"
          title={t('ulkeLigi.kapaliBaslik')}
          body={t('ulkeLigi.kapaliBody')}
        />
      </Screen>
    );
  }

  const ad = code.length === 2 ? ulkeGorunenAd(code) : '—';
  const puan =
    period === 'weekly'
      ? (detay?.points_weekly ?? 0)
      : (detay?.points_all_time ?? 0);
  const sira =
    period === 'weekly' ? detay?.rank_weekly ?? null : detay?.rank_all_time ?? null;
  const gap =
    period === 'weekly'
      ? detay?.gap_to_next_weekly
      : detay?.gap_to_next_all_time;

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri modulAdi="ulke-detay">
        <EkranBasligi
          title={ad}
          subtitle={t('ulkeLigi.katkiBaslik')}
          fallbackHref="/ulke"
        />

        {yukleniyor && !detay ? (
          <ActivityIndicator color={RenkTokenlari.accent} style={{ marginTop: 40 }} />
        ) : hata || !detay ? (
          <View style={styles.hataWrap}>
            <BosDurum
              icon="cloud-offline-outline"
              title={t('ulkeLigi.hataBaslik')}
              body={t('ulkeLigi.hataBody')}
            />
            <Pressable style={styles.retry} onPress={() => void yukle()}>
              <Text style={styles.retryYazi}>{t('ulkeLigi.tekrarDene')}</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={
              tab === 'katcicilar'
                ? katcicilar
                : tab === 'sehirler'
                  ? sehirler
                  : []
            }
            keyExtractor={(item, i) =>
              tab === 'katcicilar'
                ? (item as UlkeKatkici).user_id || String(i)
                : (item as UlkeSehirSatiri).city_id || String(i)
            }
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={yukleniyor}
                onRefresh={() => void yukle()}
                tintColor={RenkTokenlari.accent}
              />
            }
            ListHeaderComponent={
              <View style={styles.header}>
                <UlkeHeroKart
                  countryCode={code}
                  rank={sira}
                  points={puan}
                  gapToNext={gap}
                  periodLabel={
                    period === 'weekly'
                      ? t('ulkeLigi.tabHaftalik')
                      : t('ulkeLigi.tabTumZamanlar')
                  }
                  contributorCount={detay.contributor_count}
                />

                <View style={styles.periodTabs}>
                  {(
                    [
                      ['weekly', t('ulkeLigi.tabHaftalik')] as const,
                      ['all_time', t('ulkeLigi.tabTumZamanlar')] as const,
                    ] as const
                  ).map(([id, label]) => (
                    <Pressable
                      key={id}
                      style={[styles.chip, period === id && styles.chipAktif]}
                      onPress={() => setPeriod(id)}
                    >
                      <Text
                        style={[
                          styles.chipYazi,
                          period === id && styles.chipYaziAktif,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.stats}>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>{t('ulkeLigi.tabHaftalik')}</Text>
                    <Text style={styles.statVal}>
                      {ulkePuanKisa(detay.points_weekly)}
                    </Text>
                    {detay.rank_weekly != null ? (
                      <Text style={styles.statRank}>#{detay.rank_weekly}</Text>
                    ) : null}
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>
                      {t('ulkeLigi.tabTumZamanlar')}
                    </Text>
                    <Text style={styles.statVal}>
                      {ulkePuanKisa(detay.points_all_time)}
                    </Text>
                    {detay.rank_all_time != null ? (
                      <Text style={styles.statRank}>#{detay.rank_all_time}</Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.tabs}>
                  {tabs.map((tb) => (
                    <Pressable
                      key={tb.id}
                      style={[styles.tab, tab === tb.id && styles.tabAktif]}
                      onPress={() => setTab(tb.id)}
                    >
                      <Text
                        style={[
                          styles.tabText,
                          tab === tb.id && styles.tabTextAktif,
                        ]}
                      >
                        {tb.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {tab === 'genel' ? (
                  <View style={styles.genel}>
                    {gap != null && gap > 0 ? (
                      <Text style={styles.genelBody}>
                        {t('ulkeLigi.gapMetin', { n: ulkePuanKisa(gap) })}
                      </Text>
                    ) : (
                      <Text style={styles.genelBody}>
                        {t('ulkeLigi.gizlilikHint')}
                      </Text>
                    )}
                  </View>
                ) : null}
              </View>
            }
            ListEmptyComponent={
              tab === 'genel' ? null : tab === 'katcicilar' ? (
                <BosDurum
                  icon="people-outline"
                  title={t('ulkeLigi.katkiciBos')}
                  body=""
                />
              ) : (
                <BosDurum
                  icon="business-outline"
                  title={t('ulkeLigi.sehirBos')}
                  body=""
                />
              )
            }
            renderItem={({ item, index }) => {
              if (tab === 'katcicilar') {
                const k = item as UlkeKatkici;
                return (
                  <UlkeKatkiciSatir
                    satir={k}
                    onPress={
                      k.anonymous || !k.user_id
                        ? undefined
                        : () => router.push(`/kullanici/${k.user_id}` as never)
                    }
                  />
                );
              }
              if (tab === 'sehirler') {
                const s = item as UlkeSehirSatiri;
                return (
                  <Pressable
                    style={styles.sehirRow}
                    onPress={() => router.push(`/sehir/${s.city_id}` as never)}
                  >
                    <Text style={styles.sehirRank}>#{index + 1}</Text>
                    <Text style={styles.sehirName} numberOfLines={1}>
                      {s.name}
                    </Text>
                    <Text style={styles.sehirPts}>
                      {ulkePuanKisa(s.power_score)}
                    </Text>
                  </Pressable>
                );
              }
              return null;
            }}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        )}
      </ModulHataSiniri>
    </Screen>
  );
}

const rowDir = 'row' as const;

const styles = StyleSheet.create({
  list: { padding: BoslukTokenlari.md, paddingBottom: 120 },
  header: { gap: 12, marginBottom: 8 },
  periodTabs: { flexDirection: rowDir, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  chipAktif: {
    borderColor: 'rgba(139,92,246,0.55)',
    backgroundColor: 'rgba(139,92,246,0.15)',
  },
  chipYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  chipYaziAktif: { color: RenkTokenlari.text },
  stats: { flexDirection: rowDir, gap: 8 },
  stat: {
    flex: 1,
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    gap: 4,
  },
  statLabel: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim },
  statVal: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontWeight: '800',
    writingDirection: 'ltr',
  },
  statRank: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.accent,
    fontWeight: '700',
    writingDirection: 'ltr',
  },
  tabs: { flexDirection: rowDir, gap: 6 },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    alignItems: 'center',
  },
  tabAktif: {
    borderColor: RenkTokenlari.accent,
    backgroundColor: 'rgba(232,64,145,0.12)',
  },
  tabText: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  tabTextAktif: { color: RenkTokenlari.accent },
  genel: {
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  genelBody: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
  sehirRow: {
    flexDirection: rowDir,
    alignItems: 'center',
    gap: 12,
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  sehirRank: {
    width: 36,
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    fontWeight: '800',
    textAlign: 'center',
    writingDirection: 'ltr',
  },
  sehirName: {
    flex: 1,
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  sehirPts: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontWeight: '800',
    writingDirection: 'ltr',
  },
  hataWrap: { gap: 12, paddingHorizontal: BoslukTokenlari.lg },
  retry: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: 'rgba(232,64,145,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(232,64,145,0.45)',
  },
  retryYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
});
