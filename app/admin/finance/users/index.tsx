import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../../../src/components/Screen';
import { EkranBasligi } from '../../../../src/components/EkranBasligi';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminStil } from '../../../../src/moduller/admin/bilesenler/AdminStil';
import { AdminFinanceUsersGetir } from '../../../../src/moduller/admin/finance/AdminFinanceApi';
import {
  FinanceCoin,
  FinanceNav,
  FinanceTry,
} from '../../../../src/moduller/admin/finance/bilesenler/FinanceUi';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';

export default function FinanceUsersEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [q, setQ] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async (sorgu?: string) => {
    setYukleniyor(true);
    setHata(null);
    try {
      const res = await AdminFinanceUsersGetir(40, 0, sorgu?.trim() || undefined);
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
      void yukle(q);
    }, [admin, yukle]),
  );

  if (!admin) return null;

  return (
    <Screen>
      <EkranBasligi title="Kullanıcılar" subtitle="Coin · risk · ajans" />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={<RefreshControl refreshing={yukleniyor} onRefresh={() => yukle(q)} />}
        keyboardShouldPersistTaps="handled"
      >
        <FinanceNav />
        <TextInput
          style={AdminStil.input}
          placeholder="Ara: isim · kullanıcı adı · id"
          placeholderTextColor={RenkTokenlari.textDim}
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => void yukle(q)}
          returnKeyType="search"
        />
        <Pressable style={AdminStil.aksiyon} onPress={() => void yukle(q)}>
          <Text style={AdminStil.aksiyonYazi}>Ara</Text>
        </Pressable>

        {hata ? <Text style={{ color: RenkTokenlari.danger }}>{hata}</Text> : null}
        {yukleniyor && items.length === 0 ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : items.length === 0 ? (
          <Text style={AdminStil.bos}>Kayıt yok</Text>
        ) : (
          items.map((u) => (
            <View key={u.user_id} style={AdminStil.kart}>
              <Text style={AdminStil.kartBaslik}>
                {u.display_name ?? u.username ?? '—'}
                {u.risk_status && u.risk_status !== 'OK' ? ` · ${u.risk_status}` : ''}
              </Text>
              <Text style={AdminStil.kartAlt}>
                Coin {FinanceCoin(u.current_coin)} · Alınan {FinanceCoin(u.coin_purchased)} ·
                Harcanan {FinanceCoin(u.coin_spent)}
                {u.agency_name ? ` · ${u.agency_name}` : ''}
              </Text>
              <Text style={AdminStil.kartAlt}>
                Creator kazancı {FinanceTry(u.creator_earnings_try)}
              </Text>
              <Pressable
                style={AdminStil.aksiyon}
                onPress={() => router.push(`/admin/finance/users/${u.user_id}` as any)}
              >
                <Text style={AdminStil.aksiyonYazi}>Finansı gör</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
