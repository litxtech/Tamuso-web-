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
import { AdminFinancePnlGetir } from '../../../src/moduller/admin/finance/AdminFinanceApi';
import {
  FinanceKpiKart,
  FinanceNav,
  FinanceTry,
} from '../../../src/moduller/admin/finance/bilesenler/FinanceUi';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';

export default function FinancePnlEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [data, setData] = useState<any>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      setData(await AdminFinancePnlGetir());
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
  const c = data?.current;
  const e = data?.month_end_estimate;

  return (
    <Screen>
      <EkranBasligi title="Kâr / zarar" subtitle="Bu ay ve ay sonu tahmini" />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={<RefreshControl refreshing={yukleniyor} onRefresh={yukle} />}
      >
        <FinanceNav />
        {hata ? <Text style={{ color: RenkTokenlari.danger }}>{hata}</Text> : null}
        {yukleniyor && !data ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : (
          <>
            <Text style={AdminStil.sectionLabel}>Bu ay</Text>
            <View style={AdminStil.kpiGrid}>
              <FinanceKpiKart label="Gelir" value={FinanceTry(c?.revenue_try)} tone="positive" />
              <FinanceKpiKart label="Brüt satış" value={FinanceTry(c?.gross_sales_try)} />
              <FinanceKpiKart label="İadeler" value={FinanceTry(c?.refunds_try)} tone="negative" />
              <FinanceKpiKart label="Chargeback" value={FinanceTry(c?.chargebacks_try)} tone="negative" />
              <FinanceKpiKart label="Mağaza kesintisi" value={FinanceTry(c?.store_fees_estimate_try)} estimate />
              <FinanceKpiKart label="İşlemci kesintisi" value={FinanceTry(c?.processor_fees_estimate_try)} estimate />
              <FinanceKpiKart label="Gider" value={FinanceTry(c?.operating_expenses_try)} tone="negative" />
              <FinanceKpiKart label="Creator alacağı" value={FinanceTry(c?.creator_payable_try)} tone="warning" />
              <FinanceKpiKart label="Ajans alacağı" value={FinanceTry(c?.agency_payable_try)} tone="warning" />
              <FinanceKpiKart label="Brüt sonuç" value={FinanceTry(c?.gross_result_try)} />
              <FinanceKpiKart
                label="Net sonuç"
                value={FinanceTry(c?.net_operational_result_try)}
                tone={(c?.net_operational_result_try ?? 0) >= 0 ? 'positive' : 'negative'}
              />
            </View>

            <Text style={AdminStil.sectionLabel}>Ay sonu tahmini</Text>
            <View style={AdminStil.kpiGrid}>
              <FinanceKpiKart label="Beklenen gelir" value={FinanceTry(e?.expected_revenue_try)} estimate />
              <FinanceKpiKart label="Beklenen gider" value={FinanceTry(e?.expected_expense_try)} estimate />
              <FinanceKpiKart
                label="Beklenen net"
                value={FinanceTry(e?.expected_net_try)}
                estimate
                tone={(e?.expected_net_try ?? 0) >= 0 ? 'positive' : 'negative'}
              />
            </View>
            {data?.note ? (
              <Text style={AdminStil.kartAlt}>
                Operasyonel finans özeti — vergi muhasebesi değildir.
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
