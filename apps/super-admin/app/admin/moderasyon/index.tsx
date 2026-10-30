import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../../../../src/components/Screen';
import { EkranBasligi } from '../../../../../src/components/EkranBasligi';
import { useAuth } from '../../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminRaporListesi } from '../../../../../src/moduller/admin/platform/AdminPlatformIslemleri';
import type { AdminRapor } from '../../../../../src/moduller/admin/tipler/PlatformTipleri';
import {
  AdminStil,
  RaporDurumEtiketi,
} from '../../../../../src/moduller/admin/bilesenler/AdminStil';
import { RenkTokenlari } from '../../../../../src/tasarim-sistemi/RenkTokenlari';

function kisiAd(k?: {
  display_name?: string | null;
  username?: string | null;
} | null) {
  if (!k) return null;
  return k.display_name?.trim() || (k.username ? `@${k.username}` : null);
}

function slaMetin(iso?: string | null): { yazi: string; renk: string } {
  if (!iso) return { yazi: 'SLA —', renk: RenkTokenlari.textDim };
  const kalanMs = new Date(iso).getTime() - Date.now();
  const saat = Math.floor(kalanMs / 3_600_000);
  const dk = Math.floor((Math.abs(kalanMs) % 3_600_000) / 60_000);
  if (kalanMs < 0) {
    return {
      yazi: `GECİKMİŞ ${Math.abs(saat)}s ${dk}dk`,
      renk: RenkTokenlari.danger,
    };
  }
  if (kalanMs < 2 * 3_600_000) {
    return { yazi: `${saat}s ${dk}dk kaldı`, renk: RenkTokenlari.accent };
  }
  return { yazi: `${saat}s ${dk}dk kaldı`, renk: RenkTokenlari.mint };
}

type Sekme = 'yeni' | 'oncelikli' | 'gecikmis' | 'hepsi';

export default function AdminModerasyonEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [raporlar, setRaporlar] = useState<AdminRapor[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [sekme, setSekme] = useState<Sekme>('yeni');

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      setRaporlar(await AdminRaporListesi(120));
    } catch (e) {
      Alert.alert(
        'Moderasyon',
        e instanceof Error ? e.message : 'Raporlar yüklenemedi',
      );
      setRaporlar([]);
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!admin) {
        router.replace('/(tabs)/profile');
        return;
      }
      void yukle();
    }, [admin, yukle]),
  );

  const filtreli = raporlar.filter((r) => {
    const acik = r.status === 'open' || r.status === 'reviewing';
    const sla = r.sla_due_at ? new Date(r.sla_due_at).getTime() : 0;
    const gecikmis = !!sla && sla < Date.now() && acik;
    const oncelik =
      r.priority === 'critical' ||
      r.priority === 'high' ||
      (r.context as { priority?: string } | null)?.priority === 'critical';
    if (sekme === 'hepsi') return true;
    if (sekme === 'gecikmis') return gecikmis;
    if (sekme === 'oncelikli') return acik && (oncelik || gecikmis);
    return acik;
  });

  const ozet = {
    yeni: raporlar.filter((r) => r.status === 'open' || r.status === 'reviewing')
      .length,
    kritik: raporlar.filter(
      (r) =>
        (r.status === 'open' || r.status === 'reviewing') &&
        (r.priority === 'critical' || r.priority === 'high'),
    ).length,
    sla2: raporlar.filter((r) => {
      if (!(r.status === 'open' || r.status === 'reviewing') || !r.sla_due_at)
        return false;
      const k = new Date(r.sla_due_at).getTime() - Date.now();
      return k > 0 && k < 2 * 3_600_000;
    }).length,
  };

  if (!admin) return null;

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Moderasyon"
        subtitle="24s SLA · rapor kuyruğu"
        fallbackHref="/admin"
      />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={
          <RefreshControl
            refreshing={yukleniyor}
            onRefresh={() => void yukle()}
            tintColor={RenkTokenlari.primarySoft}
          />
        }
      >
        <View style={AdminStil.kpiGrid}>
          <View style={AdminStil.kpi}>
            <Text style={AdminStil.kpiN}>{ozet.yeni}</Text>
            <Text style={AdminStil.kpiL}>Açık</Text>
          </View>
          <View style={AdminStil.kpi}>
            <Text style={[AdminStil.kpiN, { color: RenkTokenlari.danger }]}>
              {ozet.kritik}
            </Text>
            <Text style={AdminStil.kpiL}>Öncelikli</Text>
          </View>
          <View style={AdminStil.kpi}>
            <Text style={[AdminStil.kpiN, { color: RenkTokenlari.accent }]}>
              {ozet.sla2}
            </Text>
            <Text style={AdminStil.kpiL}>SLA &lt; 2s</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {(
            [
              ['yeni', 'Yeni'],
              ['oncelikli', 'Öncelikli'],
              ['gecikmis', 'Gecikmiş'],
              ['hepsi', 'Tümü'],
            ] as const
          ).map(([id, label]) => (
            <Pressable
              key={id}
              onPress={() => setSekme(id)}
              style={[
                AdminStil.chip,
                sekme === id && { backgroundColor: RenkTokenlari.primary },
              ]}
            >
              <Text
                style={[
                  AdminStil.chipYazi,
                  sekme === id && { color: RenkTokenlari.textOnPrimary },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {yukleniyor && !raporlar.length ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : !filtreli.length ? (
          <Text style={AdminStil.bos}>Bu sekmede rapor yok</Text>
        ) : (
          filtreli.map((r) => {
            const hedef = kisiAd(r.target);
            const bildiren = kisiAd(r.reporter);
            const sla = slaMetin(r.sla_due_at);
            return (
              <Pressable
                key={r.id}
                style={AdminStil.kart}
                onPress={() =>
                  router.push(`/admin/moderasyon/${r.id}` as any)
                }
              >
                <View style={AdminStil.satir}>
                  <Text style={AdminStil.kartBaslik} numberOfLines={2}>
                    {r.reason}
                  </Text>
                  <View style={AdminStil.chip}>
                    <Text style={AdminStil.chipYazi}>
                      {RaporDurumEtiketi(r.status)}
                    </Text>
                  </View>
                </View>
                <Text style={[AdminStil.kartAlt, { color: sla.renk, fontWeight: '700' }]}>
                  SLA: {sla.yazi}
                  {r.priority && r.priority !== 'normal'
                    ? ` · ${String(r.priority).toUpperCase()}`
                    : ''}
                </Text>
                {hedef ? (
                  <Text style={AdminStil.kartAlt}>
                    Bildirilen: {hedef}
                    {r.target?.banned_at ? ' · banlı' : ''}
                  </Text>
                ) : null}
                {r.content_type === 'room' || r.room_id ? (
                  <Text style={AdminStil.kartAlt}>
                    Ses odası
                    {r.room?.title ? ` · ${r.room.title}` : ''}
                  </Text>
                ) : null}
                {r.content_type === 'live' || r.content_type === 'live_session' ? (
                  <Text style={AdminStil.kartAlt}>Canlı yayın bildirimi</Text>
                ) : null}
                {bildiren ? (
                  <Text style={AdminStil.kartAlt}>Bildiren: {bildiren}</Text>
                ) : null}
                {r.ozet || r.details ? (
                  <Text style={AdminStil.kartAlt} numberOfLines={2}>
                    {r.ozet || r.details}
                  </Text>
                ) : null}
                <View style={AdminStil.satir}>
                  <Text style={AdminStil.kartAlt}>
                    {new Date(r.created_at).toLocaleString('tr-TR')}
                  </Text>
                  <Text
                    style={[
                      AdminStil.aksiyonYazi,
                      { color: RenkTokenlari.primarySoft },
                    ]}
                  >
                    İncele →
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
