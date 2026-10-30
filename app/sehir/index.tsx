import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useCeviri } from '../../src/i18n/useCeviri';
import { BosDurum } from '../../src/components/BosDurum';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { useAuth, useWallet } from '../../src/contexts/AuthContext';
import { HesabiTamamlaKarti } from '../../src/moduller/misafir-hesabi/bilesenler/HesabiTamamlaKarti';
import { useMisafirIslemKapisi } from '../../src/moduller/misafir-hesabi/islemler/useMisafirIslemKapisi';
import { SehirDestekle } from '../../src/moduller/sehirler/islemler/SehirDestekle';
import {
  SehirleriGetir,
  type GeoSehir,
} from '../../src/moduller/sehirler/okuma/SehirleriGetir';
import {
  AnaSehirGetir,
  DesteklenenSehirleriGetir,
  type DesteklenenSehir,
} from '../../src/moduller/sehirler/okuma/DesteklenenSehirleriGetir';
import { ResmiSehirOdalariniGetir } from '../../src/moduller/sehirler/okuma/ResmiSehirOdalariniGetir';
import {
  SehirGorevlerimiGetir,
  SehirGorevOdulAl,
  type SehirGorev,
} from '../../src/moduller/sehirler/islemler/SehirModernIslemleri';
import { AktifLigSezonunuGetir } from '../../src/moduller/sehir-ligi/okuma/SehirLigiSiralamasiniGetir';
import { AktifSehirSavaslariniGetir } from '../../src/moduller/sehir-savaslari/okuma/AktifSehirSavaslariniGetir';
import { SehirStil } from '../../src/moduller/sehirler/bilesenler/SehirStil';
import { OzellikBayragiAktifMi } from '../../src/moduller/ozellik-bayraklari/OzellikBayragiAktifMi';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

export default function SehirHubEkrani() {
  const { t } = useCeviri();
  const { isGuest, refreshProfile } = useAuth();
  const { refreshWallet } = useWallet();
  const { upgradeAcik, upgradeKapat, islemiDene } = useMisafirIslemKapisi(isGuest);
  const leagueOn = OzellikBayragiAktifMi('city_league_enabled');

  const [cities, setCities] = useState<GeoSehir[]>([]);
  const [anaSehir, setAnaSehir] = useState<DesteklenenSehir | null>(null);
  const [supportedIds, setSupportedIds] = useState<Set<string>>(new Set());
  const [roomCount, setRoomCount] = useState(0);
  const [seasonTitle, setSeasonTitle] = useState('—');
  const [liveBattleCount, setLiveBattleCount] = useState(0);
  const [gorevler, setGorevler] = useState<SehirGorev[]>([]);
  const [busyCityId, setBusyCityId] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  const load = useCallback(async () => {
    setYukleniyor(true);
    try {
      const [c, s, r, ana, season, battles, gorev] = await Promise.all([
        SehirleriGetir().catch(() => []),
        DesteklenenSehirleriGetir().catch(() => []),
        ResmiSehirOdalariniGetir(20).catch(() => []),
        AnaSehirGetir().catch(() => null),
        AktifLigSezonunuGetir().catch(() => null),
        AktifSehirSavaslariniGetir().catch(() => []),
        SehirGorevlerimiGetir().catch(() => []),
      ]);
      setCities(c);
      setSupportedIds(new Set(s.map((x) => x.city_id)));
      setAnaSehir(ana);
      setRoomCount(r.length);
      setSeasonTitle(season?.title ?? t('sehir.aktifSezonYok'));
      setLiveBattleCount(battles.filter((b) => b.status === 'live').length);
      setGorevler(gorev);
    } catch {
      /* migration */
    } finally {
      setYukleniyor(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const siraliSehirler = useMemo(() => {
    const copy = [...cities];
    copy.sort((a, b) => {
      const aSup = supportedIds.has(a.id) ? 1 : 0;
      const bSup = supportedIds.has(b.id) ? 1 : 0;
      if (aSup !== bSup) return bSup - aSup;
      return Number(b.power_score) - Number(a.power_score);
    });
    return copy;
  }, [cities, supportedIds]);

  const destekle = (cityId: string) => {
    islemiDene('oy_kullan', async () => {
      if (!leagueOn) {
        Alert.alert(t('sehir.alertKapali'), t('sehir.alertLigKapali'));
        return;
      }
      setBusyCityId(cityId);
      const sonuc = await SehirDestekle({ cityId, isPrimary: true });
      setBusyCityId(null);
      if (!sonuc.ok) {
        Alert.alert(t('sehir.alertDestek'), sonuc.hata);
        return;
      }
      Alert.alert(t('sehir.alertSecildi'), t('sehir.alertSecildiBody'));
      await load();
    });
  };

  const listHeader = (
    <View style={styles.headerBlock}>
      <View style={styles.headerBleed}>
        <EkranBasligi
          title={t('sehir.sehirler')}
          subtitle={t('sehir.altHub')}
        />
      </View>

      <LinearGradient
        colors={[...RenkTokenlari.gradientCard]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroEyebrow}>{t('sehir.nasilCalisir')}</Text>
        <Text style={styles.heroTitle}>{t('sehir.heroTitle')}</Text>
        {[t('sehir.adim1'), t('sehir.adim2'), t('sehir.adim3')].map((a) => (
          <Text key={a} style={styles.heroAdim}>
            {a}
          </Text>
        ))}
      </LinearGradient>

      <View style={styles.kpiRow}>
        <View style={styles.kpi}>
          <Text style={styles.kpiN}>{roomCount}</Text>
          <Text style={styles.kpiL}>{t('sehir.kpiOda')}</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiN}>{liveBattleCount}</Text>
          <Text style={styles.kpiL}>{t('sehir.kpiSavas')}</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={[styles.kpiN, { fontSize: 13 }]} numberOfLines={2}>
            {seasonTitle}
          </Text>
          <Text style={styles.kpiL}>{t('sehir.kpiSezon')}</Text>
        </View>
      </View>

      {anaSehir?.city ? (
        <Pressable
          style={styles.anaKart}
          onPress={() => router.push(`/sehir/${anaSehir.city_id}` as any)}
        >
          <View style={styles.anaUst}>
            <View style={styles.anaBadge}>
              <Ionicons name="home" size={16} color={RenkTokenlari.mint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.anaEyebrow}>{t('sehir.seninSehir')}</Text>
              <Text style={styles.anaTitle}>{anaSehir.city.name}</Text>
              <Text style={styles.anaMeta}>
                {t('sehir.gucDestekci', {
                  guc: anaSehir.city.power_score,
                  count: anaSehir.city.supporter_count,
                })}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={RenkTokenlari.textDim} />
          </View>
          <Text style={styles.anaHint}>{t('sehir.anaHint')}</Text>
        </Pressable>
      ) : (
        <View style={styles.anaKartBos}>
          <Ionicons name="location-outline" size={22} color={RenkTokenlari.accent} />
          <Text style={styles.anaBosTitle}>{t('sehir.henuzSehirYok')}</Text>
          <Text style={styles.anaBosBody}>{t('sehir.henuzSehirBody')}</Text>
        </View>
      )}

      <View style={styles.navRow}>
        {(
          [
            {
              label: t('sehir.navLig'),
              alt: t('sehir.navLigAlt'),
              icon: 'trophy-outline' as const,
              href: '/sehir/lig',
              tint: RenkTokenlari.accent,
            },
            {
              label: t('sehir.navSavas'),
              alt: t('sehir.navSavasAlt'),
              icon: 'flash-outline' as const,
              href: '/sehir/savas',
              tint: RenkTokenlari.danger,
            },
            {
              label: t('sehir.navSecim'),
              alt: t('sehir.navSecimAlt'),
              icon: 'checkbox-outline' as const,
              href: '/sehir/secim',
              tint: RenkTokenlari.mint,
            },
          ] as const
        ).map((n) => (
          <Pressable
            key={n.href}
            style={styles.nav}
            onPress={() => router.push(n.href as any)}
          >
            <View style={[styles.navIcon, { backgroundColor: `${n.tint}22` }]}>
              <Ionicons name={n.icon} size={16} color={n.tint} />
            </View>
            <Text style={styles.navText}>{n.label}</Text>
            <Text style={styles.navAlt}>{n.alt}</Text>
          </Pressable>
        ))}
      </View>

      {gorevler.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={SehirStil.section}>{t('sehir.haftalikGorevler')}</Text>
          {gorevler.map((g) => {
            const hedef = Math.max(1, Number(g.goal_target) || 1);
            const cur = Number(g.progress) || 0;
            const oran = Math.min(1, cur / hedef);
            const done = !!g.completed_at || cur >= hedef;
            const claimed = !!g.claimed_at;
            return (
              <View key={g.id} style={SehirStil.kart}>
                <Text style={SehirStil.kartBaslik}>{g.title}</Text>
                <Text style={SehirStil.meta}>{g.description}</Text>
                <Text style={SehirStil.meta}>
                  {cur}/{hedef} · {g.reward_label ?? `+${g.reward_coins} coin`}
                </Text>
                <View style={SehirStil.barBg}>
                  <View style={[SehirStil.barFill, { width: `${oran * 100}%` }]} />
                </View>
                {done && !claimed ? (
                  <Pressable
                    style={SehirStil.btnSecondary}
                    onPress={() => {
                      islemiDene('oy_kullan', async () => {
                        const r = await SehirGorevOdulAl(g.id);
                        if (!r.ok)
                          Alert.alert(
                            t('sehir.alertGorev'),
                            r.hata ?? t('sehir.alertAlinamadi'),
                          );
                        else {
                          await refreshWallet();
                          Alert.alert(
                            t('sehir.alertOdul'),
                            t('sehir.odulCoin', { count: r.reward_coins ?? 0 }),
                          );
                          await load();
                        }
                      });
                    }}
                  >
                    <Text style={SehirStil.btnSecondaryText}>{t('sehir.oduluAl')}</Text>
                  </Pressable>
                ) : claimed ? (
                  <Text style={SehirStil.link}>{t('sehir.tamamlandi')}</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}

      <Text style={styles.section}>{t('sehir.sehirSec')}</Text>
      <Text style={styles.sectionHint}>{t('sehir.sehirSecHint')}</Text>
    </View>
  );

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri modulAdi="sehirler">
        <FlatList
          data={siraliSehirler}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={listHeader}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={yukleniyor} onRefresh={() => void load()} />
          }
          ListEmptyComponent={
            <BosDurum
              icon="location-outline"
              title={t('sehir.bosBaslik')}
              body={t('sehir.bosBody')}
            />
          }
          renderItem={({ item }) => {
            const destekli = supportedIds.has(item.id);
            const anaMi = anaSehir?.city_id === item.id;
            const buBusy = busyCityId === item.id;
            return (
              <Pressable
                onPress={() => router.push(`/sehir/${item.id}` as any)}
                style={[styles.card, (destekli || anaMi) && styles.cardActive]}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cityBadge}>
                    <Ionicons name="location" size={14} color={RenkTokenlari.primarySoft} />
                  </View>
                  <View style={styles.cardCopy}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardMeta}>
                      {item.plate_code
                        ? t('sehir.plaka', { kod: item.plate_code })
                        : item.country_code}{' '}
                      · {t('sehir.destekci', { count: item.supporter_count })}
                    </Text>
                  </View>
                  {anaMi ? (
                    <View style={styles.pillAna}>
                      <Text style={styles.pillAnaText}>{t('sehir.pillAna')}</Text>
                    </View>
                  ) : destekli ? (
                    <View style={styles.pillDestek}>
                      <Text style={styles.pillDestekText}>{t('sehir.pillDestek')}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.statChip}>
                    <Text style={styles.statVal}>{item.power_score}</Text>
                    <Text style={styles.statLbl}>{t('sehir.gucLbl')}</Text>
                  </View>
                  <View style={styles.statChip}>
                    <Text style={styles.statVal}>{item.supporter_count}</Text>
                    <Text style={styles.statLbl}>{t('sehir.destekciLbl')}</Text>
                  </View>
                </View>
                <Pressable
                  style={[styles.cta, anaMi && styles.ctaGhost, buBusy && { opacity: 0.5 }]}
                  disabled={buBusy || busyCityId !== null}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    if (anaMi) {
                      router.push(`/sehir/${item.id}` as any);
                      return;
                    }
                    destekle(item.id);
                  }}
                >
                  <Text style={styles.ctaText}>
                    {buBusy
                      ? '…'
                      : anaMi
                        ? t('sehir.sehirDetay')
                        : destekli
                          ? t('sehir.anaSehirYap')
                          : t('sehir.destekleAna')}
                  </Text>
                </Pressable>
              </Pressable>
            );
          }}
        />
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
  headerBlock: {
    gap: BoslukTokenlari.md,
    marginBottom: BoslukTokenlari.sm,
  },
  headerBleed: { marginHorizontal: -BoslukTokenlari.lg },
  hero: {
    borderRadius: YaricapTokenlari.lg,
    padding: BoslukTokenlari.lg,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    gap: 6,
  },
  heroEyebrow: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.mint,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontWeight: '800',
    marginBottom: 4,
  },
  heroAdim: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    lineHeight: 18,
  },
  kpiRow: { flexDirection: 'row', gap: BoslukTokenlari.sm },
  kpi: {
    flex: 1,
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    gap: 4,
    minHeight: 72,
  },
  kpiN: { ...TipografiTokenlari.body, color: RenkTokenlari.text, fontWeight: '800' },
  kpiL: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim },
  anaKart: {
    padding: BoslukTokenlari.lg,
    borderRadius: YaricapTokenlari.lg,
    backgroundColor: 'rgba(61,207,176,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(61,207,176,0.35)',
    gap: 10,
  },
  anaUst: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  anaBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(61,207,176,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  anaEyebrow: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.mint,
    fontWeight: '800',
  },
  anaTitle: { ...TipografiTokenlari.h2, color: RenkTokenlari.text, fontWeight: '800' },
  anaMeta: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
  anaHint: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim, lineHeight: 16 },
  anaKartBos: {
    padding: BoslukTokenlari.lg,
    borderRadius: YaricapTokenlari.lg,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
    gap: 8,
    alignItems: 'flex-start',
  },
  anaBosTitle: { ...TipografiTokenlari.body, color: RenkTokenlari.text, fontWeight: '800' },
  anaBosBody: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted, lineHeight: 18 },
  navRow: { flexDirection: 'row', gap: BoslukTokenlari.sm },
  nav: {
    flex: 1,
    paddingVertical: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    alignItems: 'center',
    gap: 4,
  },
  navIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: { ...TipografiTokenlari.caption, color: RenkTokenlari.text, fontWeight: '700' },
  navAlt: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim, fontSize: 9 },
  section: { ...TipografiTokenlari.h2, color: RenkTokenlari.text },
  sectionHint: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim, marginTop: -4 },
  list: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingBottom: BoslukTokenlari.xxxl,
    gap: BoslukTokenlari.md,
    flexGrow: 1,
  },
  card: {
    padding: BoslukTokenlari.lg,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    gap: BoslukTokenlari.md,
  },
  cardActive: { borderColor: RenkTokenlari.borderAccent },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: BoslukTokenlari.md },
  cityBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(232,64,145,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: { flex: 1, gap: 2, minWidth: 0 },
  cardTitle: { ...TipografiTokenlari.body, color: RenkTokenlari.text, fontWeight: '700' },
  cardMeta: { ...TipografiTokenlari.micro, color: RenkTokenlari.textMuted },
  pillAna: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(61,207,176,0.16)',
  },
  pillAnaText: { ...TipografiTokenlari.micro, color: RenkTokenlari.mint, fontSize: 9, fontWeight: '800' },
  pillDestek: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.surface,
  },
  pillDestekText: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  statsRow: { flexDirection: 'row', gap: BoslukTokenlari.sm },
  statChip: {
    flex: 1,
    backgroundColor: RenkTokenlari.surface,
    borderRadius: YaricapTokenlari.sm,
    paddingVertical: BoslukTokenlari.sm,
    alignItems: 'center',
    gap: 2,
  },
  statVal: { ...TipografiTokenlari.body, color: RenkTokenlari.text, fontWeight: '700' },
  statLbl: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim },
  cta: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: YaricapTokenlari.sm,
    backgroundColor: RenkTokenlari.primary,
  },
  ctaGhost: {
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  ctaText: { ...TipografiTokenlari.caption, color: '#fff', fontWeight: '800' },
});
