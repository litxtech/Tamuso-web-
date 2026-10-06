import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { EkranBasligi } from '../../../src/components/EkranBasligi';
import { useAuth } from '../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminStil } from '../../../src/moduller/admin/bilesenler/AdminStil';
import {
  AdminFinanceExpenseUpsert,
  AdminFinanceExpensesListGetir,
} from '../../../src/moduller/admin/finance/AdminFinanceApi';
import {
  FinanceNav,
  FinanceTry,
} from '../../../src/moduller/admin/finance/bilesenler/FinanceUi';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';

const KATEGORILER = [
  { key: 'SERVER', label: 'Sunucu' },
  { key: 'LIVEKIT', label: 'LiveKit' },
  { key: 'AGORA', label: 'Agora' },
  { key: 'CLOUD', label: 'Bulut' },
  { key: 'STORAGE', label: 'Depolama' },
  { key: 'AI', label: 'YZ' },
  { key: 'MARKETING', label: 'Pazarlama' },
  { key: 'APPLE_FEES', label: 'Apple kesinti' },
  { key: 'GOOGLE_FEES', label: 'Google kesinti' },
  { key: 'PAYMENT_PROCESSOR', label: 'Ödeme işlemci' },
  { key: 'REFUNDS', label: 'İadeler' },
  { key: 'SALARY', label: 'Maaş' },
  { key: 'AGENCY_PAYOUT', label: 'Ajans ödeme' },
  { key: 'CREATOR_PAYOUT', label: 'Creator ödeme' },
  { key: 'OTHER', label: 'Diğer' },
] as const;

const KATEGORI_ETIKET: Record<string, string> = Object.fromEntries(
  KATEGORILER.map((k) => [k.key, k.label]),
);

function odemeDurumuEtiket(s: string | null | undefined): string {
  if (s === 'paid') return 'Ödendi';
  if (s === 'pending') return 'Bekliyor';
  if (s === 'cancelled') return 'İptal';
  return s || '—';
}

export default function FinanceExpensesEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [items, setItems] = useState<any[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediyor, setKaydediyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [category, setCategory] = useState<(typeof KATEGORILER)[number]['key']>('SERVER');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      const res = await AdminFinanceExpensesListGetir(50, 0);
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

  const kaydet = async () => {
    const n = Number(String(amount).replace(',', '.'));
    if (!Number.isFinite(n) || n < 0) {
      Alert.alert('Gider', 'Geçerli tutar girin');
      return;
    }
    setKaydediyor(true);
    try {
      await AdminFinanceExpenseUpsert({
        amount: n,
        currency: 'TRY',
        category,
        description: description.trim() || null,
        payment_status: 'paid',
      });
      setAmount('');
      setDescription('');
      await yukle();
    } catch (e) {
      Alert.alert('Gider', e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setKaydediyor(false);
    }
  };

  if (!admin) return null;

  return (
    <Screen>
      <EkranBasligi title="Giderler" subtitle="Liste · ekle" />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={<RefreshControl refreshing={yukleniyor} onRefresh={yukle} />}
        keyboardShouldPersistTaps="handled"
      >
        <FinanceNav />

        <Text style={AdminStil.sectionLabel}>Yeni gider</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={AdminStil.aksiyonSatir}>
            {KATEGORILER.map((c) => (
              <Pressable
                key={c.key}
                style={[AdminStil.aksiyon, category === c.key && { borderColor: RenkTokenlari.borderAccent }]}
                onPress={() => setCategory(c.key)}
              >
                <Text style={AdminStil.aksiyonYazi}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <TextInput
          style={AdminStil.input}
          placeholder="Tutar (₺)"
          placeholderTextColor={RenkTokenlari.textDim}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />
        <TextInput
          style={AdminStil.input}
          placeholder="Açıklama"
          placeholderTextColor={RenkTokenlari.textDim}
          value={description}
          onChangeText={setDescription}
        />
        <Pressable style={AdminStil.aksiyon} onPress={() => void kaydet()} disabled={kaydediyor}>
          <Text style={AdminStil.aksiyonYazi}>{kaydediyor ? 'Kaydediliyor…' : 'Kaydet'}</Text>
        </Pressable>

        {hata ? <Text style={{ color: RenkTokenlari.danger }}>{hata}</Text> : null}
        <Text style={AdminStil.sectionLabel}>Liste</Text>
        {yukleniyor && items.length === 0 ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : items.length === 0 ? (
          <Text style={AdminStil.bos}>Gider yok</Text>
        ) : (
          items.map((e) => (
            <View key={e.id} style={AdminStil.kart}>
              <Text style={AdminStil.kartBaslik}>
                {KATEGORI_ETIKET[e.category] ?? e.category} · {FinanceTry(e.amount)}
              </Text>
              <Text style={AdminStil.kartAlt}>
                {e.description || '—'} · {odemeDurumuEtiket(e.payment_status)}
              </Text>
              <Text style={[TipografiTokenlari.micro, { color: RenkTokenlari.textDim }]}>
                {e.expense_date}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
