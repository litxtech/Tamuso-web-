import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
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
import { AdminFinanceReconcileRun } from '../../../src/moduller/admin/finance/AdminFinanceApi';
import {
  FinanceNav,
  FinanceTry,
} from '../../../src/moduller/admin/finance/bilesenler/FinanceUi';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';

const SOURCES = [
  { key: 'wallet_ledger', label: 'Cüzdan / Ledger' },
  { key: 'apple', label: 'Apple' },
  { key: 'google', label: 'Google' },
  { key: 'stripe', label: 'Stripe' },
] as const;

function mutabakatDurumu(s: string | null | undefined): string {
  const k = String(s || '').toLowerCase();
  if (k === 'review_required') return 'İnceleme gerekli';
  if (k === 'matched') return 'Eşleşti';
  if (k === 'unmatched') return 'Eşleşmedi';
  return s || '—';
}

export default function FinanceReconciliationEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [source, setSource] = useState<(typeof SOURCES)[number]['key']>('wallet_ledger');
  const [external, setExternal] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      if (!admin) router.replace('/(tabs)/profile');
    }, [admin]),
  );

  const calistir = async () => {
    setBusy(true);
    try {
      const ext =
        external.trim() === '' ? null : Number(String(external).replace(',', '.'));
      if (ext != null && !Number.isFinite(ext)) {
        Alert.alert('Mutabakat', 'Geçerli dış tutar girin');
        return;
      }
      const r = await AdminFinanceReconcileRun(source, ext, 'month');
      setResult(r);
    } catch (e) {
      Alert.alert('Mutabakat', e instanceof Error ? e.message : 'Hata');
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  if (!admin) return null;

  return (
    <Screen>
      <EkranBasligi title="Mutabakat" subtitle="Cüzdan · Apple · Google · Stripe" />
      <ScrollView contentContainerStyle={AdminStil.content} keyboardShouldPersistTaps="handled">
        <FinanceNav />
        <Text style={AdminStil.sectionLabel}>Kaynak</Text>
        <View style={AdminStil.aksiyonSatir}>
          {SOURCES.map((s) => (
            <Pressable
              key={s.key}
              style={[AdminStil.aksiyon, source === s.key && { borderColor: RenkTokenlari.borderAccent }]}
              onPress={() => setSource(s.key)}
            >
              <Text style={AdminStil.aksiyonYazi}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={AdminStil.input}
          placeholder="Dış tutar (₺) — opsiyonel"
          placeholderTextColor={RenkTokenlari.textDim}
          keyboardType="decimal-pad"
          value={external}
          onChangeText={setExternal}
        />
        <Pressable style={AdminStil.aksiyon} onPress={() => void calistir()} disabled={busy}>
          <Text style={AdminStil.aksiyonYazi}>{busy ? 'Çalışıyor…' : 'Mutabakat çalıştır'}</Text>
        </Pressable>
        {busy ? <ActivityIndicator color={RenkTokenlari.primarySoft} /> : null}

        {result ? (
          <View style={AdminStil.kart}>
            <Text style={AdminStil.kartBaslik}>
              {result.run_id} · {mutabakatDurumu(result.status)}
            </Text>
            <Text style={AdminStil.kartAlt}>
              Eşleşen {result.matched ?? 0} · Eşleşmeyen {result.unmatched ?? 0}
            </Text>
            <Text style={AdminStil.kartAlt}>
              Fark {FinanceTry(result.difference_try)} · İç{' '}
              {FinanceTry(result.internal_amount)} · Dış{' '}
              {FinanceTry(result.external_amount)}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
