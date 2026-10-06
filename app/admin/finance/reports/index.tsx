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
import { Screen } from '../../../../src/components/Screen';
import { EkranBasligi } from '../../../../src/components/EkranBasligi';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminStil } from '../../../../src/moduller/admin/bilesenler/AdminStil';
import {
  AdminFinanceReportCreate,
  AdminFinanceReportList,
} from '../../../../src/moduller/admin/finance/AdminFinanceApi';
import { REPORT_TYPES } from '../../../../src/moduller/admin/finance/tipler';
import { FinanceNav } from '../../../../src/moduller/admin/finance/bilesenler/FinanceUi';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../src/tasarim-sistemi/TipografiTokenlari';

export default function FinanceReportsEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [jobs, setJobs] = useState<any[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      const res = await AdminFinanceReportList();
      setJobs(res?.items ?? []);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Yüklenemedi');
      setJobs([]);
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

  const olustur = async (key: string) => {
    setBusyKey(key);
    try {
      const r = await AdminFinanceReportCreate(key, { period: 'month' });
      const id = r?.id;
      if (id) {
        router.push(`/admin/finance/reports/${id}` as any);
      } else {
        Alert.alert('Rapor', 'Oluşturuldu ama id yok');
        await yukle();
      }
    } catch (e) {
      Alert.alert('Rapor', e instanceof Error ? e.message : 'Oluşturulamadı');
    } finally {
      setBusyKey(null);
    }
  };

  if (!admin) return null;

  return (
    <Screen>
      <EkranBasligi title="Raporlar" subtitle="PDF · paylaş · yazdır" />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={<RefreshControl refreshing={yukleniyor} onRefresh={yukle} />}
      >
        <FinanceNav />
        <Text style={AdminStil.sectionLabel}>Rapor tipleri</Text>
        <View style={AdminStil.modulGrid}>
          {REPORT_TYPES.map((rt) => (
            <Pressable
              key={rt.key}
              style={AdminStil.modul}
              onPress={() => void olustur(rt.key)}
              disabled={busyKey === rt.key}
            >
              <Text style={AdminStil.modulLabel}>{rt.label}</Text>
              <Text style={AdminStil.modulAlt}>
                {busyKey === rt.key ? 'Oluşturuluyor…' : 'Oluştur'}
              </Text>
            </Pressable>
          ))}
        </View>

        {hata ? <Text style={{ color: RenkTokenlari.danger }}>{hata}</Text> : null}
        <Text style={AdminStil.sectionLabel}>Son raporlar</Text>
        {yukleniyor && jobs.length === 0 ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : jobs.length === 0 ? (
          <Text style={AdminStil.bos}>Rapor yok</Text>
        ) : (
          jobs.map((j) => (
            <Pressable
              key={j.id}
              style={AdminStil.kart}
              onPress={() => router.push(`/admin/finance/reports/${j.id}` as any)}
            >
              <Text style={AdminStil.kartBaslik}>
                {j.report_id} · {j.report_type}
              </Text>
              <Text style={AdminStil.kartAlt}>{j.status}</Text>
              <Text style={[TipografiTokenlari.micro, { color: RenkTokenlari.textDim }]}>
                {j.created_at ? new Date(j.created_at).toLocaleString('tr-TR') : ''}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
