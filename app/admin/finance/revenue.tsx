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
import { AdminFinanceRevenueGetir } from '../../../src/moduller/admin/finance/AdminFinanceApi';
import type { FinancePeriod } from '../../../src/moduller/admin/finance/tipler';
import {
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

export default function FinanceRevenueEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [period, setPeriod] = useState<FinancePeriod>('month');
  const [data, setData] = useState<any>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      setData(await AdminFinanceRevenueGetir(period));
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
      <EkranBasligi title="Gelir" subtitle="Operasyonel özet" />
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
              <FinanceKpiKart label="Brüt gelir" value={FinanceTry(data?.brut_revenue_try)} tone="positive" />
              <FinanceKpiKart label="Coin satış" value={FinanceTry(data?.coin_sales_try)} />
              <FinanceKpiKart label="İadeler" value={FinanceTry(data?.refunds_try)} tone="negative" />
              <FinanceKpiKart label="Chargeback" value={FinanceTry(data?.chargebacks_try)} tone="negative" />
              <FinanceKpiKart label="Platform gider" value={FinanceTry(data?.platform_costs_try)} tone="negative" />
              <FinanceKpiKart label="Mağaza kesintisi" value={FinanceTry(data?.store_fees_estimate_try)} estimate />
              <FinanceKpiKart label="Creator alacağı" value={FinanceTry(data?.creator_payable_try)} tone="warning" />
              <FinanceKpiKart label="Ajans alacağı" value={FinanceTry(data?.agency_payable_try)} tone="warning" />
              <FinanceKpiKart
                label="Net sonuç"
                value={FinanceTry(data?.net_operational_result_try)}
                tone={(data?.net_operational_result_try ?? 0) >= 0 ? 'positive' : 'negative'}
              />
            </View>
            {data?.note ? <Text style={AdminStil.kartAlt}>{data.note}</Text> : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
