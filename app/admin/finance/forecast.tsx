import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
import { AdminFinanceForecastGetir } from '../../../src/moduller/admin/finance/AdminFinanceApi';
import {
  FinanceKpiKart,
  FinanceNav,
  FinanceTry,
} from '../../../src/moduller/admin/finance/bilesenler/FinanceUi';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';

export default function FinanceForecastEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [data, setData] = useState<any>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      setData(await AdminFinanceForecastGetir());
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Yüklenemedi');
      setData(null);
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

  if (!admin) return null;

  return (
    <Screen>
      <EkranBasligi title="Tahmin" subtitle="Ay sonu projeksiyonu" />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={<RefreshControl refreshing={yukleniyor} onRefresh={yukle} />}
      >
        <FinanceNav />
        <View style={AdminStil.hero}>
          <Text style={AdminStil.heroEyebrow}>Tahmini net</Text>
          <Text style={AdminStil.heroTitle}>
            {FinanceTry(data?.estimated_month_end_net_try)}
          </Text>
          <Text style={AdminStil.heroAlt}>Ay sonu net projeksiyonu</Text>
        </View>

        {hata ? <Text style={{ color: RenkTokenlari.danger }}>{hata}</Text> : null}
        {yukleniyor && !data ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : (
          <View style={AdminStil.kpiGrid}>
            <FinanceKpiKart
              label="Güncel alacak"
              value={FinanceTry(data?.current_payable_try)}
              tone="warning"
            />
            <FinanceKpiKart
              label="Bekleyen ödeme"
              value={FinanceTry(data?.pending_payout_try)}
              tone="warning"
            />
            <FinanceKpiKart
              label="Ay sonu yükümlülük"
              value={FinanceTry(data?.estimated_month_end_liability_try)}
              estimate
              tone="warning"
            />
            <FinanceKpiKart
              label="Ay sonu gelir"
              value={FinanceTry(data?.estimated_month_end_revenue_try)}
              estimate
            />
            <FinanceKpiKart
              label="Ay sonu gider"
              value={FinanceTry(data?.estimated_month_end_expense_try)}
              estimate
            />
            <FinanceKpiKart
              label="Ay sonu net"
              value={FinanceTry(data?.estimated_month_end_net_try)}
              estimate
              tone="positive"
            />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
