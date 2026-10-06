import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import {
  AdminFinanceAlertAck,
  AdminFinanceAlertsListGetir,
  AdminFinanceAnomalyScan,
} from '../../../src/moduller/admin/finance/AdminFinanceApi';
import { FinanceNav } from '../../../src/moduller/admin/finance/bilesenler/FinanceUi';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';

export default function FinanceAlertsEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [items, setItems] = useState<any[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [scanBusy, setScanBusy] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      const res = await AdminFinanceAlertsListGetir('open');
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

  const ack = async (id: string) => {
    try {
      await AdminFinanceAlertAck(id);
      await yukle();
    } catch (e) {
      Alert.alert('Uyarı', e instanceof Error ? e.message : 'Onaylama başarısız');
    }
  };

  const scan = async () => {
    setScanBusy(true);
    try {
      const r = await AdminFinanceAnomalyScan();
      Alert.alert('Anomali', `Tarama tamam · ${r?.alerts_touched ?? 0} kayıt`);
      await yukle();
    } catch (e) {
      Alert.alert('Anomali', e instanceof Error ? e.message : 'Tarama başarısız');
    } finally {
      setScanBusy(false);
    }
  };

  if (!admin) return null;

  return (
    <Screen>
      <EkranBasligi title="Uyarılar" subtitle="Açık uyarılar · anomali taraması" />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={<RefreshControl refreshing={yukleniyor} onRefresh={yukle} />}
      >
        <FinanceNav />
        <Pressable style={AdminStil.aksiyon} onPress={() => void scan()} disabled={scanBusy}>
          <Text style={AdminStil.aksiyonYazi}>
            {scanBusy ? 'Taranıyor…' : 'Anomali tara'}
          </Text>
        </Pressable>

        {hata ? <Text style={{ color: RenkTokenlari.danger }}>{hata}</Text> : null}
        {yukleniyor && items.length === 0 ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : items.length === 0 ? (
          <Text style={AdminStil.bos}>Açık uyarı yok</Text>
        ) : (
          items.map((a) => (
            <View key={a.id} style={AdminStil.kart}>
              <Text style={AdminStil.kartBaslik}>
                [{a.severity}] {a.title}
              </Text>
              <Text style={AdminStil.kartAlt}>{a.body}</Text>
              <Text style={[TipografiTokenlari.micro, { color: RenkTokenlari.textDim }]}>
                {a.created_at ? new Date(a.created_at).toLocaleString('tr-TR') : ''}
              </Text>
              <Pressable style={AdminStil.aksiyon} onPress={() => void ack(a.id)}>
                <Text style={AdminStil.aksiyonYazi}>Onayla</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
