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
import { Screen } from '../../../../src/components/Screen';
import { EkranBasligi } from '../../../../src/components/EkranBasligi';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminStil } from '../../../../src/moduller/admin/bilesenler/AdminStil';
import { AdminFinanceAgenciesGetir } from '../../../../src/moduller/admin/finance/AdminFinanceApi';
import {
  FinanceCoin,
  FinanceNav,
  FinanceTry,
} from '../../../../src/moduller/admin/finance/bilesenler/FinanceUi';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';

export default function FinanceAgenciesEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [items, setItems] = useState<any[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      const res = await AdminFinanceAgenciesGetir(50, 0);
      setItems(res?.items ?? []);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Yüklenemedi');
      setItems([]);
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
      <EkranBasligi title="Ajanslar" subtitle="Ciro · komisyon · borç" />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={<RefreshControl refreshing={yukleniyor} onRefresh={yukle} />}
      >
        <FinanceNav />
        {hata ? <Text style={{ color: RenkTokenlari.danger }}>{hata}</Text> : null}
        {yukleniyor && items.length === 0 ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : items.length === 0 ? (
          <Text style={AdminStil.bos}>Kayıt yok</Text>
        ) : (
          items.map((a) => (
            <Pressable
              key={a.agency_id}
              style={AdminStil.kart}
              onPress={() => router.push(`/admin/finance/agencies/${a.agency_id}` as any)}
            >
              <Text style={AdminStil.kartBaslik}>{a.agency_name ?? '—'}</Text>
              <Text style={AdminStil.kartAlt}>
                Satış {FinanceCoin(a.coin_sold_attributed)} · Borç{' '}
                {FinanceTry(a.current_liability_try)} · Bekleyen{' '}
                {FinanceTry(a.pending_payout_try)}
              </Text>
              <Text style={AdminStil.kartAlt}>
                Creator {FinanceTry(a.creator_earnings_try)} · Ödenen {FinanceTry(a.paid_try)}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
