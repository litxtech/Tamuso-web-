/**
 * Admin Müzik Merkezi — ses odası arka plan müziği kütüphanesi.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../../../src/components/Screen';
import { EkranBasligi } from '../../../../src/components/EkranBasligi';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminMuzikPaneli } from '../../../../src/moduller/oda-muzik/bilesenler/AdminMuzikPaneli';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';

export default function AdminMuzikEkrani() {
  const { profile, loading } = useAuth();
  const admin = AdminYetkisiVarMi(profile);

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={RenkTokenlari.accent} />
        </View>
      </Screen>
    );
  }

  if (!admin) {
    router.replace('/admin');
    return null;
  }

  return (
    <Screen>
      <EkranBasligi title="Müzik Merkezi" fallbackHref="/admin" />
      <AdminMuzikPaneli />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
