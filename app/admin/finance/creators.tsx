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
import { AdminFinanceCreatorsGetir } from '../../../src/moduller/admin/finance/AdminFinanceApi';
import {
  FinanceCoin,
  FinanceNav,
  FinanceTry,
} from '../../../src/moduller/admin/finance/bilesenler/FinanceUi';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';

export default function FinanceCreatorsEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [items, setItems] = useState<any[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      const res = await AdminFinanceCreatorsGetir(50, 0);
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
      <EkranBasligi title="Creatorlar" subtitle="Kazanç sıralaması" />
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
          items.map((c) => (
            <Pressable
              key={c.user_id}
              style={AdminStil.kart}
              onPress={() => router.push(`/admin/finance/users/${c.user_id}` as any)}
            >
              <Text style={AdminStil.kartBaslik}>{c.display_name ?? '—'}</Text>
              <Text style={AdminStil.kartAlt}>
                {FinanceTry(c.creator_earnings_try)} · {FinanceCoin(c.diamonds)} elmas · Hediye{' '}
                {FinanceCoin(c.gift_volume)}
                {c.agency_name ? ` · ${c.agency_name}` : ''}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
