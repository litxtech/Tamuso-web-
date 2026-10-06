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
import { AdminFinanceCoinEconomyGetir } from '../../../src/moduller/admin/finance/AdminFinanceApi';
import type { FinanceCoinEconomy } from '../../../src/moduller/admin/finance/tipler';
import {
  FinanceCoin,
  FinanceKpiKart,
  FinanceNav,
} from '../../../src/moduller/admin/finance/bilesenler/FinanceUi';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';

export default function FinanceCoinEconomyEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [data, setData] = useState<FinanceCoinEconomy | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      setData(await AdminFinanceCoinEconomyGetir());
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
  const b = data?.supply_breakdown;

  return (
    <Screen>
      <EkranBasligi title="Coin ekonomisi" subtitle="Arz · harcama · iade" />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={<RefreshControl refreshing={yukleniyor} onRefresh={yukle} />}
      >
        <FinanceNav />
        <View style={AdminStil.hero}>
          <Text style={AdminStil.heroEyebrow}>Kullanıcı coin bakiyesi</Text>
          <Text style={AdminStil.heroTitle}>{FinanceCoin(data?.user_coin_supply)}</Text>
          <Text style={AdminStil.heroAlt}>
            Kullanıcıların elindeki toplam coin
          </Text>
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
          <>
            <Text style={AdminStil.sectionLabel}>Akış</Text>
            <View style={AdminStil.kpiGrid}>
              <FinanceKpiKart label="Toplam satılan coin" value={FinanceCoin(data?.total_coin_sold)} />
              <FinanceKpiKart label="Harcanan" value={FinanceCoin(data?.total_coin_spent)} />
              <FinanceKpiKart label="Transfer" value={FinanceCoin(data?.total_coin_transferred)} />
              <FinanceKpiKart label="İade" value={FinanceCoin(data?.total_coin_refunded)} />
              <FinanceKpiKart label="Bonus" value={FinanceCoin(data?.total_bonus_coin)} />
              <FinanceKpiKart label="Oyun" value={FinanceCoin(data?.total_game_coin)} />
              <FinanceKpiKart label="Promosyon" value={FinanceCoin(data?.total_promotional_coin)} />
            </View>

            <Text style={AdminStil.sectionLabel}>Arz dağılımı</Text>
            <View style={AdminStil.kpiGrid}>
              <FinanceKpiKart label="Satın alınan" value={FinanceCoin(b?.purchased)} />
              <FinanceKpiKart label="Bonus" value={FinanceCoin(b?.bonus)} />
              <FinanceKpiKart label="Oyun" value={FinanceCoin(b?.game)} />
              <FinanceKpiKart label="Diğer" value={FinanceCoin(b?.other)} />
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
