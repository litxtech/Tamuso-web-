import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../../src/components/Screen';
import { EkranBasligi } from '../../../../src/components/EkranBasligi';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminStil } from '../../../../src/moduller/admin/bilesenler/AdminStil';
import { AdminFinanceAgencyDetailGetir } from '../../../../src/moduller/admin/finance/AdminFinanceApi';
import {
  FinanceCoin,
  FinanceKpiKart,
  FinanceNav,
  FinanceTry,
} from '../../../../src/moduller/admin/finance/bilesenler/FinanceUi';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../src/tasarim-sistemi/TipografiTokenlari';

export default function FinanceAgencyDetailEkrani() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [data, setData] = useState<any>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    setHata(null);
    try {
      setData(await AdminFinanceAgencyDetailGetir(String(id)));
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Yüklenemedi');
      setData(null);
    } finally {
      setYukleniyor(false);
    }
  }, [id]);

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
  const a = data?.agency;

  return (
    <Screen>
      <EkranBasligi title={a?.agency_name ?? 'Ajans'} subtitle="Ajans finans detayı" />
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
            <View style={AdminStil.kpiGrid}>
              <FinanceKpiKart label="Coin hacmi" value={FinanceCoin(a?.coin_volume)} />
              <FinanceKpiKart label="Hediye" value={FinanceCoin(a?.gift_volume)} />
              <FinanceKpiKart label="Creator kazancı" value={FinanceTry(a?.creator_earnings_try)} />
              <FinanceKpiKart label="Komisyon" value={FinanceTry(a?.agency_commission_try)} />
              <FinanceKpiKart label="Bekleyen" value={FinanceTry(a?.pending_payment_try)} tone="warning" />
              <FinanceKpiKart label="Borç" value={FinanceTry(a?.current_liability_try)} tone="warning" />
            </View>

            <Text style={AdminStil.sectionLabel}>Öne çıkan creatorlar</Text>
            {(data?.top_creators ?? []).map((c: any) => (
              <View key={c.creator_id} style={AdminStil.kart}>
                <Text style={AdminStil.kartBaslik}>{c.creator_name ?? '—'}</Text>
                <Text style={AdminStil.kartAlt}>
                  {FinanceTry(c.creator_earnings_try)} · Hediye {FinanceCoin(c.gift_volume)}
                </Text>
              </View>
            ))}

            <Text style={AdminStil.sectionLabel}>Hareketler</Text>
            {(data?.transactions ?? []).map((t: any) => (
              <View key={t.id} style={AdminStil.kart}>
                <Text style={AdminStil.kartBaslik}>
                  {t.reason ?? '—'} · {t.currency}
                </Text>
                <Text style={AdminStil.kartAlt}>
                  Δ {FinanceCoin(t.delta)} · sonrası {FinanceCoin(t.balance_after)}
                </Text>
                <Text style={[TipografiTokenlari.micro, { color: RenkTokenlari.textDim }]}>
                  {t.created_at ? new Date(t.created_at).toLocaleString('tr-TR') : ''}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
