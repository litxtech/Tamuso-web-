import React, { useCallback, useMemo, useState } from 'react';
import {
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
import {
  AktifEtkinlikleriGetir,
  type PlatformEtkinligi,
} from '../../src/moduller/etkinlikler/okuma/AktifEtkinlikleriGetir';
import {
  AktifGorevleriGetir,
  GorevIlerlemelerimiGetir,
  GorevIlerlet,
  GorevOdulAl,
  type Gorev,
  type GorevIlerleme,
} from '../../src/moduller/gorevler/islemler/GorevIslemleri';
import { RozetlerimiGetir } from '../../src/moduller/gorevler/okuma/RozetlerimiGetir';
import { OzellikBayragiAktifMi } from '../../src/moduller/ozellik-bayraklari/OzellikBayragiAktifMi';
import { AdminStil } from '../../src/moduller/admin/bilesenler/AdminStil';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { TamusoBanner } from '../../src/banner';

function etkinlikDurum(
  status: string,
  t: (key: import('../../src/i18n/useCeviri').CeviriAnahtari) => string,
): { label: string; color: string } {
  switch (status) {
    case 'live':
    case 'active':
      return { label: t('platform.durumCanli'), color: RenkTokenlari.live };
    case 'scheduled':
      return { label: t('platform.durumPlanlandi'), color: RenkTokenlari.accent };
    case 'ended':
      return { label: t('platform.durumBitti'), color: RenkTokenlari.textDim };
    default:
      return { label: status, color: RenkTokenlari.textMuted };
  }
}

export default function OperasyonHubEkrani() {
  const { t } = useCeviri();
  const { isGuest, refreshProfile, refreshWallet, profile } = useAuth();
  const { upgradeAcik, upgradeKapat, islemiDene } = useMisafirIslemKapisi(isGuest);
  const eventsOn = OzellikBayragiAktifMi('events_enabled');
  const missionsOn = OzellikBayragiAktifMi('missions_enabled');
  const adminMi = profile?.is_admin === true;

  const kisayollar = [
    {
      icon: 'megaphone-outline' as const,
      label: t('platform.duyurular'),
      alt: t('platform.duyurularAlt'),
      href: '/duyuru',
      tint: RenkTokenlari.accent,
    },
    {
      icon: 'document-text-outline' as const,
      label: t('platform.politikalar'),
      alt: t('platform.politikalarAlt'),
      href: '/politika',
      tint: RenkTokenlari.violet,
    },
    {
      icon: 'shield-checkmark-outline' as const,
      label: t('platform.guvenlik'),
      alt: t('platform.guvenlikAlt'),
      href: '/guvenlik',
      tint: RenkTokenlari.danger,
    },
    {
      icon: 'notifications-outline' as const,
      label: t('platform.bildirimler'),
      alt: t('platform.bildirimlerAlt'),
      href: '/bildirimler',
      tint: RenkTokenlari.mint,
    },
    {
      icon: 'ribbon-outline' as const,
      label: t('platform.sertifikasyon'),
      alt: t('platform.sertifikasyonAlt'),
      href: '/sertifikasyon',
      tint: RenkTokenlari.primarySoft,
    },
  ];

  const [events, setEvents] = useState<PlatformEtkinligi[]>([]);
  const [missions, setMissions] = useState<Gorev[]>([]);
  const [progress, setProgress] = useState<Record<string, GorevIlerleme>>({});
  const [badgeCount, setBadgeCount] = useState(0);
  const [yukleniyor, setYukleniyor] = useState(false);

  const load = useCallback(async () => {
    setYukleniyor(true);
    try {
      const [e, m, p, b] = await Promise.all([
        AktifEtkinlikleriGetir().catch(() => []),
        AktifGorevleriGetir().catch(() => []),
        GorevIlerlemelerimiGetir().catch(() => []),
        RozetlerimiGetir().catch(() => []),
      ]);
      setEvents(e);
      setMissions(m);
      const map: Record<string, GorevIlerleme> = {};
      for (const row of p) map[row.mission_id] = row;
      setProgress(map);
      setBadgeCount(b.length);
    } catch {
      /* migration 010 */
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const gorevOzet = useMemo(() => {
    let hazir = 0;
    let tamam = 0;
    for (const g of missions) {
      const p = progress[g.id];
      if (p?.claimed_at) tamam += 1;
      else if (p?.completed_at) hazir += 1;
    }
    return { hazir, tamam, aktif: missions.length };
  }, [missions, progress]);

  const ilerlet = (code: string) => {
    islemiDene('oy_kullan', async () => {
      if (!missionsOn) {
        Alert.alert(t('platform.alertKapali'), t('platform.alertGorevKapali'));
        return;
      }
      const r = await GorevIlerlet(code);
      if (!r.ok) Alert.alert(t('platform.alertGorev'), r.hata);
      await load();
    });
  };

  const odul = (code: string) => {
    islemiDene('oy_kullan', async () => {
      const r = await GorevOdulAl(code);
      if (!r.ok) Alert.alert(t('platform.alertOdul'), r.hata);
      else {
        await refreshWallet();
        Alert.alert(t('platform.alertAlindi'), t('platform.alertAlindiBody'));
      }
      await load();
    });
  };

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri modulAdi="etkinlikler">
        <EkranBasligi
          title={t('platform.baslik')}
          subtitle={t('platform.alt')}
          fallbackHref={adminMi ? '/admin' : undefined}
        />
        <ScrollView
          contentContainerStyle={AdminStil.content}
          refreshControl={
            <RefreshControl refreshing={yukleniyor} onRefresh={() => void load()} />
          }
        >
          <View style={styles.bayrakSatir}>
              <View style={[styles.bayrak, eventsOn ? styles.bayrakAcik : styles.bayrakKapali]}>
                <Text style={styles.bayrakYazi}>
                  {eventsOn ? t('platform.etkinlikAcik') : t('platform.etkinlikKapali')}
                </Text>
              </View>
              <View
                style={[styles.bayrak, missionsOn ? styles.bayrakAcik : styles.bayrakKapali]}
              >
                <Text style={styles.bayrakYazi}>
                  {missionsOn ? t('platform.gorevAcik') : t('platform.gorevKapali')}
                </Text>
              </View>
          </View>

          <TamusoBanner placement="GAME_CENTER_TOP" screen="GAME_CENTER" />

          <View style={AdminStil.kpiGrid}>
            <View style={AdminStil.kpi}>
              <Text style={AdminStil.kpiN}>{events.length}</Text>
              <Text style={AdminStil.kpiL}>{t('platform.kpiEtkinlik')}</Text>
            </View>
            <View style={AdminStil.kpi}>
              <Text style={AdminStil.kpiN}>{gorevOzet.aktif}</Text>
              <Text style={AdminStil.kpiL}>{t('platform.kpiGorev')}</Text>
            </View>
            <View style={AdminStil.kpi}>
              <Text style={[AdminStil.kpiN, { color: RenkTokenlari.accent }]}>
                {gorevOzet.hazir}
              </Text>
              <Text style={AdminStil.kpiL}>{t('platform.kpiOdul')}</Text>
            </View>
            <View style={AdminStil.kpi}>
              <Text style={[AdminStil.kpiN, { color: RenkTokenlari.mint }]}>{badgeCount}</Text>
              <Text style={AdminStil.kpiL}>{t('platform.kpiRozet')}</Text>
            </View>
          </View>

          <Text style={AdminStil.sectionLabel}>{t('platform.kisayollar')}</Text>
          <View style={AdminStil.modulGrid}>
            {kisayollar.map((k) => (
              <Pressable
                key={k.href}
                style={AdminStil.modul}
                onPress={() => router.push(k.href as any)}
              >
                <View style={[AdminStil.modulIcon, { backgroundColor: `${k.tint}22` }]}>
                  <Ionicons name={k.icon} size={18} color={k.tint} />
                </View>
                <Text style={AdminStil.modulLabel}>{k.label}</Text>
                <Text style={AdminStil.modulAlt}>{k.alt}</Text>
              </Pressable>
            ))}
          </View>

          <TamusoBanner placement="GAME_CENTER_MIDDLE" screen="GAME_CENTER" />

          <Text style={AdminStil.sectionLabel}>{t('platform.etkinlikler')}</Text>
          {!eventsOn ? (
            <View style={AdminStil.kart}>
              <Text style={AdminStil.kartAlt}>
                {t('platform.etkinlikKapaliBody')}
              </Text>
            </View>
          ) : events.length === 0 ? (
            <BosDurum
              icon="calendar-outline"
              title={t('platform.etkinlikBosBaslik')}
              body={t('platform.etkinlikBosBody')}
            />
          ) : (
            events.map((ev) => {
              const d = etkinlikDurum(ev.status, t);
              return (
                <View key={ev.id} style={styles.etkinlikKart}>
                  <View style={[styles.etkinlikNokta, { backgroundColor: d.color }]} />
                  <View style={styles.etkinlikMetin}>
                    <Text style={styles.etkinlikDurum}>{d.label}</Text>
                    <Text style={styles.etkinlikBaslik}>{ev.title}</Text>
                  </View>
                </View>
              );
            })
          )}

          <Text style={AdminStil.sectionLabel}>{t('platform.gorevler')}</Text>
          {!missionsOn ? (
            <View style={AdminStil.kart}>
              <Text style={AdminStil.kartAlt}>
                {t('platform.gorevKapaliBody')}
              </Text>
            </View>
          ) : missions.length === 0 ? (
            <BosDurum
              icon="flag-outline"
              title={t('platform.gorevBosBaslik')}
              body={t('platform.gorevBosBody')}
            />
          ) : (
            missions.map((item) => {
              const p = progress[item.id];
              const cur = p?.progress ?? 0;
              const hedef = Math.max(1, item.goal_target);
              const oran = Math.min(1, cur / hedef);
              const done = !!p?.completed_at;
              const claimed = !!p?.claimed_at;
              return (
                <View key={item.id} style={styles.gorevKart}>
                  <View style={styles.gorevUst}>
                    <Text style={styles.gorevBaslik}>{item.title}</Text>
                    <Text style={styles.gorevOdul}>+{item.reward_coins} coin</Text>
                  </View>
                  <Text style={styles.gorevMeta}>
                    {t('platform.ilerleme', { cur, hedef: item.goal_target })}
                    {claimed ? t('platform.alindi') : done ? t('platform.odulHazir') : ''}
                  </Text>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${oran * 100}%` }]} />
                  </View>
                  {!done ? (
                    <Pressable style={styles.gorevBtn} onPress={() => ilerlet(item.code)}>
                      <Text style={styles.gorevBtnYazi}>{t('platform.ilerlet')}</Text>
                    </Pressable>
                  ) : !claimed ? (
                    <Pressable
                      style={[styles.gorevBtn, styles.gorevBtnOdul]}
                      onPress={() => odul(item.code)}
                    >
                      <Text style={styles.gorevBtnYazi}>{t('platform.oduluAl')}</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.gorevTamam}>{t('platform.tamamlandi')}</Text>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>

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
  bayrakSatir: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  bayrak: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  bayrakAcik: { backgroundColor: 'rgba(61,207,176,0.16)' },
  bayrakKapali: { backgroundColor: 'rgba(232,75,106,0.16)' },
  bayrakYazi: { ...TipografiTokenlari.micro, color: RenkTokenlari.text, fontWeight: '700' },
  etkinlikKart: {
    flexDirection: 'row',
    gap: 12,
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    alignItems: 'center',
  },
  etkinlikNokta: { width: 8, height: 8, borderRadius: 4 },
  etkinlikMetin: { flex: 1, gap: 2 },
  etkinlikDurum: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.accent,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  etkinlikBaslik: { ...TipografiTokenlari.body, color: RenkTokenlari.text, fontWeight: '700' },
  gorevKart: {
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    gap: 8,
  },
  gorevUst: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  gorevBaslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
    flex: 1,
  },
  gorevOdul: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.accent,
    fontWeight: '800',
  },
  gorevMeta: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
  barBg: {
    height: 6,
    borderRadius: 999,
    backgroundColor: RenkTokenlari.surface,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: RenkTokenlari.mint,
  },
  gorevBtn: {
    marginTop: 2,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.sm,
    backgroundColor: RenkTokenlari.primary,
  },
  gorevBtnOdul: { backgroundColor: RenkTokenlari.violet },
  gorevBtnYazi: {
    ...TipografiTokenlari.caption,
    color: '#fff',
    fontWeight: '800',
  },
  gorevTamam: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.mint,
    fontWeight: '700',
  },
});
