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
  AdminFinanceSettingsGetir,
  AdminFinanceSettingsGuncelle,
  AdminFinanceSimulate,
} from '../../../src/moduller/admin/finance/AdminFinanceApi';
import {
  FinanceCoin,
  FinanceKpiKart,
  FinanceNav,
  FinanceTry,
} from '../../../src/moduller/admin/finance/bilesenler/FinanceUi';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';

const PRESETS = [100_000, 500_000, 1_000_000, 5_000_000, 10_000_000, 50_000_000, 100_000_000];

export default function FinanceSimulatorEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [custom, setCustom] = useState('');
  const [result, setResult] = useState<any>(null);
  const [rates, setRates] = useState<any>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [appleFee, setAppleFee] = useState('');
  const [googleFee, setGoogleFee] = useState('');
  const [agencyRate, setAgencyRate] = useState('');

  const yukleSettings = useCallback(async () => {
    try {
      const s = await AdminFinanceSettingsGetir();
      setRates(s?.rates ?? null);
      setAppleFee(String(s?.rates?.apple_fee_rate ?? ''));
      setGoogleFee(String(s?.rates?.google_fee_rate ?? ''));
      setAgencyRate(String(s?.rates?.agency_commission_rate ?? ''));
    } catch {
      setRates(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!admin) {
        router.replace('/(tabs)/profile');
        return;
      }
      void yukleSettings();
    }, [admin, yukleSettings]),
  );

  const calistir = async (coins: number) => {
    setYukleniyor(true);
    try {
      setResult(await AdminFinanceSimulate(coins));
    } catch (e) {
      Alert.alert('Simülatör', e instanceof Error ? e.message : 'Hata');
      setResult(null);
    } finally {
      setYukleniyor(false);
    }
  };

  const ayarKaydet = async () => {
    setSettingsBusy(true);
    try {
      const payload: Record<string, unknown> = {};
      const a = Number(appleFee);
      const g = Number(googleFee);
      const ag = Number(agencyRate);
      if (Number.isFinite(a)) payload.apple_fee_rate = a;
      if (Number.isFinite(g)) payload.google_fee_rate = g;
      if (Number.isFinite(ag)) payload.agency_commission_rate = ag;
      const s = await AdminFinanceSettingsGuncelle(payload);
      setRates(s?.rates ?? null);
      Alert.alert('Ayarlar', 'Güncellendi');
    } catch (e) {
      Alert.alert('Ayarlar', e instanceof Error ? e.message : 'Güncellenemedi');
    } finally {
      setSettingsBusy(false);
    }
  };

  if (!admin) return null;

  return (
    <Screen>
      <EkranBasligi title="Simülatör" subtitle="Coin senaryosu · TAHMİN" />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={yukleSettings} />}
        keyboardShouldPersistTaps="handled"
      >
        <FinanceNav />
        <Text style={AdminStil.sectionLabel}>Hazır miktarlar</Text>
        <View style={AdminStil.aksiyonSatir}>
          {PRESETS.map((n) => (
            <Pressable key={n} style={AdminStil.aksiyon} onPress={() => void calistir(n)}>
              <Text style={AdminStil.aksiyonYazi}>{FinanceCoin(n)}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={AdminStil.input}
          placeholder="Özel coin miktarı"
          placeholderTextColor={RenkTokenlari.textDim}
          keyboardType="number-pad"
          value={custom}
          onChangeText={setCustom}
        />
        <Pressable
          style={AdminStil.aksiyon}
          onPress={() => {
            const n = Number(custom);
            if (!Number.isFinite(n) || n <= 0) {
              Alert.alert('Simülatör', 'Geçerli coin girin');
              return;
            }
            void calistir(n);
          }}
        >
          <Text style={AdminStil.aksiyonYazi}>Simüle et</Text>
        </Pressable>

        {yukleniyor ? <ActivityIndicator color={RenkTokenlari.primarySoft} /> : null}
        {result ? (
          <>
            <Text style={AdminStil.sectionLabel}>Sonuç · TAHMİN</Text>
            <View style={AdminStil.kpiGrid}>
              <FinanceKpiKart label="Brüt satış" value={FinanceTry(result.gross_sales_try)} estimate />
              <FinanceKpiKart label="Tahmini Apple kesintisi" value={FinanceTry(result.estimated_apple_fee_try)} estimate />
              <FinanceKpiKart label="Tahmini Google kesintisi" value={FinanceTry(result.estimated_google_fee_try)} estimate />
              <FinanceKpiKart label="Tahmini işlemci kesintisi" value={FinanceTry(result.estimated_processor_fee_try)} estimate />
              <FinanceKpiKart label="İade rezervi" value={FinanceTry(result.refund_reserve_try)} estimate />
              <FinanceKpiKart
                label="Creator yükümlülüğü"
                value={FinanceTry(result.estimated_creator_liability_try)}
                estimate
                tone="warning"
              />
              <FinanceKpiKart
                label="Ajans yükümlülüğü"
                value={FinanceTry(result.estimated_agency_liability_try)}
                estimate
                tone="warning"
              />
              <FinanceKpiKart
                label="Platform katkısı"
                value={FinanceTry(result.estimated_platform_contribution_try)}
                estimate
                tone="positive"
              />
              <FinanceKpiKart
                label="Net sonuç"
                value={FinanceTry(result.estimated_net_try)}
                estimate
                tone="positive"
              />
            </View>
          </>
        ) : null}

        <Text style={AdminStil.sectionLabel}>Ayarlar (opsiyonel)</Text>
        {rates ? (
          <Text style={AdminStil.kartAlt}>
            Coin/₺ {rates.coin_try} · Elmas/₺ {rates.diamond_try}
          </Text>
        ) : null}
        <TextInput
          style={AdminStil.input}
          placeholder="Apple kesinti oranı"
          placeholderTextColor={RenkTokenlari.textDim}
          keyboardType="decimal-pad"
          value={appleFee}
          onChangeText={setAppleFee}
        />
        <TextInput
          style={AdminStil.input}
          placeholder="Google kesinti oranı"
          placeholderTextColor={RenkTokenlari.textDim}
          keyboardType="decimal-pad"
          value={googleFee}
          onChangeText={setGoogleFee}
        />
        <TextInput
          style={AdminStil.input}
          placeholder="Ajans komisyon oranı"
          placeholderTextColor={RenkTokenlari.textDim}
          keyboardType="decimal-pad"
          value={agencyRate}
          onChangeText={setAgencyRate}
        />
        <Pressable style={AdminStil.aksiyon} onPress={() => void ayarKaydet()} disabled={settingsBusy}>
          <Text style={AdminStil.aksiyonYazi}>
            {settingsBusy ? 'Kaydediliyor…' : 'Ayarları güncelle'}
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
