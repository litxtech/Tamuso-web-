import React, { useCallback, useEffect, useState } from 'react';
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
import { AdminFinanceTransactionsGetir } from '../../../src/moduller/admin/finance/AdminFinanceApi';
import {
  FinanceCoin,
  FinanceNav,
  FinanceTry,
} from '../../../src/moduller/admin/finance/bilesenler/FinanceUi';
import { supabase } from '../../../src/lib/supabase';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';

export default function FinanceTransactionsEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [items, setItems] = useState<any[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      const res = await AdminFinanceTransactionsGetir(50);
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

  useEffect(() => {
    if (!admin) return;
    const ch = supabase
      .channel('finance-tx-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'finance_live_events' },
        () => void yukle(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [admin, yukle]);

  if (!admin) return null;

  return (
    <Screen>
      <EkranBasligi title="Hareketler" subtitle="Anlık finans akışı" />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={<RefreshControl refreshing={yukleniyor} onRefresh={yukle} />}
      >
        <FinanceNav />
        {hata ? <Text style={{ color: RenkTokenlari.danger }}>{hata}</Text> : null}
        {yukleniyor && items.length === 0 ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : items.length === 0 ? (
          <Text style={AdminStil.bos}>Hareket yok</Text>
        ) : (
          items.map((ev) => (
            <View key={ev.id} style={AdminStil.kart}>
              <Text style={AdminStil.kartBaslik}>
                {ev.title ?? '—'} · {ev.event_type}
              </Text>
              <Text style={AdminStil.kartAlt}>
                {ev.subtitle ?? ''}
                {ev.amount_coin != null ? ` · ${FinanceCoin(ev.amount_coin)} coin` : ''}
                {ev.amount_try != null ? ` · ${FinanceTry(ev.amount_try)}` : ''}
              </Text>
              <Text style={[TipografiTokenlari.micro, { color: RenkTokenlari.textDim }]}>
                {ev.created_at ? new Date(ev.created_at).toLocaleString('tr-TR') : ''}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
