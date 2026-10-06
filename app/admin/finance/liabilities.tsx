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
import { AdminFinanceLiabilitiesGetir } from '../../../src/moduller/admin/finance/AdminFinanceApi';
import {
  FinanceKpiKart,
  FinanceNav,
  FinanceTry,
} from '../../../src/moduller/admin/finance/bilesenler/FinanceUi';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';

export default function FinanceLiabilitiesEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [data, setData] = useState<any>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      setData(await AdminFinanceLiabilitiesGetir());
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
  const b = data?.breakdown;

  return (
    <Screen>
      <EkranBasligi title="Yükümlülükler" subtitle="Creator · ajans · çekim · iade" />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={<RefreshControl refreshing={yukleniyor} onRefresh={yukle} />}
      >
        <FinanceNav />
        <View style={AdminStil.hero}>
          <Text style={AdminStil.heroEyebrow}>Toplam yükümlülük</Text>
          <Text style={AdminStil.heroTitle}>{FinanceTry(data?.total_liability_try)}</Text>
          {data?.generated_at ? (
            <Text style={[TipografiTokenlari.micro, { color: RenkTokenlari.textDim }]}>
              {new Date(data.generated_at).toLocaleString('tr-TR')}
            </Text>
          ) : null}
        </View>

        {hata ? <Text style={{ color: RenkTokenlari.danger }}>{hata}</Text> : null}
        {yukleniyor && !data ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : (
          <View style={AdminStil.kpiGrid}>
            <FinanceKpiKart label="Creator alacağı" value={FinanceTry(b?.creator_payable_try)} tone="warning" />
            <FinanceKpiKart label="Ajans alacağı" value={FinanceTry(b?.agency_payable_try)} tone="warning" />
            <FinanceKpiKart label="Bekleyen çekimler" value={FinanceTry(b?.pending_withdrawals_try)} />
            <FinanceKpiKart label="Bekleyen iadeler" value={FinanceTry(b?.pending_refunds_try)} />
            <FinanceKpiKart label="Diğer borçlar" value={FinanceTry(b?.other_payables_try)} />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
