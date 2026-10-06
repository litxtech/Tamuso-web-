import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useAuth } from '../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminWebZiyaretGetir } from '../../src/moduller/admin/okuma/AdminWebZiyaretGetir';
import { AdminStil, SayiKisa } from '../../src/moduller/admin/bilesenler/AdminStil';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

export default function AdminZiyaretEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [gunluk, setGunluk] = useState<number | null>(null);
  const [aylik, setAylik] = useState<number | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    const ozet = await AdminWebZiyaretGetir();
    setGunluk(ozet?.gunluk ?? null);
    setAylik(ozet?.aylik ?? null);
    setYukleniyor(false);
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

  if (!admin) {
    return (
      <Screen edges={['top']}>
        <View style={styles.blocked}>
          <Text style={styles.blockedText}>Yetkisiz erişim</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Web ziyaretleri"
        subtitle="Aynı IP ve aynı cihaz bir kez sayılır"
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={AdminStil.content}>
        {yukleniyor ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : (
          <View style={AdminStil.kpiGrid}>
            <View style={AdminStil.kpi}>
              <Text style={[AdminStil.kpiN, { color: RenkTokenlari.accent }]}>
                {gunluk == null ? '—' : SayiKisa(gunluk)}
              </Text>
              <Text style={AdminStil.kpiL}>Bugün</Text>
            </View>
            <View style={AdminStil.kpi}>
              <Text style={[AdminStil.kpiN, { color: RenkTokenlari.primarySoft }]}>
                {aylik == null ? '—' : SayiKisa(aylik)}
              </Text>
              <Text style={AdminStil.kpiL}>Bu ay</Text>
            </View>
          </View>
        )}
        <Text style={styles.note}>
          Sayılar İstanbul saatine göredir. Sayfa yenilemek, aynı ağdan tekrar
          girmek veya aynı tarayıcıdan dönmek ziyareti artırmaz. Yeni bir IP ve
          yeni bir cihaz aynı gün ve aynı ay içinde bir kez eklenir.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  blocked: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  blockedText: { ...TipografiTokenlari.body, color: RenkTokenlari.danger },
  note: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    lineHeight: 20,
    marginTop: BoslukTokenlari.sm,
  },
});
