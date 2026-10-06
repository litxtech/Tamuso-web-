import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { EkranBasligi } from '../../../src/components/EkranBasligi';
import { useAuth } from '../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminStil } from '../../../src/moduller/admin/bilesenler/AdminStil';
import { AdminFinanceSalesGetir } from '../../../src/moduller/admin/finance/AdminFinanceApi';
import type { FinancePeriod } from '../../../src/moduller/admin/finance/tipler';
import {
  FinanceCoin,
  FinanceKpiKart,
  FinanceNav,
  FinanceTry,
} from '../../../src/moduller/admin/finance/bilesenler/FinanceUi';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';

const DONEMLER: { key: FinancePeriod; label: string }[] = [
  { key: 'today', label: 'Bugün' },
  { key: 'yesterday', label: 'Dün' },
  { key: '7d', label: '7g' },
  { key: '30d', label: '30g' },
  { key: 'month', label: 'Bu ay' },
  { key: 'last_month', label: 'Geçen ay' },
];

export default function FinanceSalesEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [period, setPeriod] = useState<FinancePeriod>('today');
  const [data, setData] = useState<any>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      setData(await AdminFinanceSalesGetir(period, 50));
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Yüklenemedi');
      setData(null);
    } finally {
      setYukleniyor(false);
    }
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      if (!admin) {
        router.replace('/(tabs)/profile');
        return;
      }
      void yukle();
    }, [admin, yukle]),
  );

  if (!admin) return null;

  return (
    <Screen>
      <EkranBasligi title="Satışlar" subtitle="Dönem · ajans · kullanıcı" />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={<RefreshControl refreshing={yukleniyor} onRefresh={yukle} />}
      >
        <FinanceNav />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={AdminStil.aksiyonSatir}>
            {DONEMLER.map((d) => (
              <Pressable
                key={d.key}
                style={[AdminStil.aksiyon, period === d.key && { borderColor: RenkTokenlari.borderAccent }]}
                onPress={() => setPeriod(d.key)}
              >
                <Text style={AdminStil.aksiyonYazi}>{d.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {hata ? <Text style={{ color: RenkTokenlari.danger }}>{hata}</Text> : null}
        {yukleniyor && !data ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : (
          <>
            <View style={AdminStil.kpiGrid}>
              <FinanceKpiKart label="Toplam satış" value={FinanceTry(data?.total_sales_try)} />
              <FinanceKpiKart label="Coin" value={FinanceCoin(data?.total_coins)} />
            </View>

            <Text style={AdminStil.sectionLabel}>En çok satan ajanslar</Text>
            {(data?.top_agencies ?? []).length === 0 ? (
              <Text style={AdminStil.bos}>Kayıt yok</Text>
            ) : (
              (data?.top_agencies ?? []).map((a: any) => (
                <Pressable
                  key={a.agency_id}
                  style={AdminStil.kart}
                  onPress={() => router.push(`/admin/finance/agencies/${a.agency_id}` as any)}
                >
                  <Text style={AdminStil.kartBaslik}>{a.agency_name ?? '—'}</Text>
                  <Text style={AdminStil.kartAlt}>
                    {FinanceTry(a.sales_try)} · {FinanceCoin(a.coins)} coin · {a.purchase_count ?? 0} işlem
                  </Text>
                </Pressable>
              ))
            )}

            <Text style={AdminStil.sectionLabel}>Kullanıcı satışları</Text>
            {(data?.user_sales ?? []).map((u: any) => (
              <Pressable
                key={u.user_id}
                style={AdminStil.kart}
                onPress={() => router.push(`/admin/finance/users/${u.user_id}` as any)}
              >
                <Text style={AdminStil.kartBaslik}>
                  {u.display_name ?? u.username ?? '—'}
                </Text>
                <Text style={AdminStil.kartAlt}>
                  {FinanceTry(u.sales_try)} · {FinanceCoin(u.coins)} coin
                  {u.agency_name ? ` · ${u.agency_name}` : ''}
                </Text>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
