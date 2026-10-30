import React from 'react';
import { ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../../../src/components/Screen';
import { EkranBasligi } from '../../../../src/components/EkranBasligi';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminStil } from '../../../../src/moduller/admin/bilesenler/AdminStil';
import { AdminKullaniciCoinPaneli } from '../../../../src/moduller/admin/bilesenler/AdminKullaniciCoinPaneli';

export default function AdminCoinYukleEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);

  useFocusEffect(
    React.useCallback(() => {
      if (!admin) router.replace('/(tabs)/profile');
    }, [admin]),
  );

  if (!admin) return null;

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Coin yükle"
        subtitle="Harf yaz · isim + avatar · yükle"
        fallbackHref="/admin"
      />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <AdminKullaniciCoinPaneli
          baslik="Kullanıcı"
          alt="İsim yazmaya başla — öneriler harfle açılır"
        />
      </ScrollView>
    </Screen>
  );
}
