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
import { Screen } from '../../../../../src/components/Screen';
import { EkranBasligi } from '../../../../../src/components/EkranBasligi';
import { useAuth } from '../../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import {
  AdminKycListesi,
  type AdminKycBasvuru,
} from '../../../../../src/moduller/admin/kyc/AdminKycIslemleri';
import { AdminStil } from '../../../../../src/moduller/admin/bilesenler/AdminStil';
import { RenkTokenlari } from '../../../../../src/tasarim-sistemi/RenkTokenlari';

const DOC_LABEL: Record<string, string> = {
  id_card: 'Kimlik',
  passport: 'Pasaport',
  drivers_license: 'Ehliyet',
  temporary_id: 'Geçici kimlik',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Bekliyor',
  approved: 'Onaylı',
  rejected: 'Reddedildi',
  draft: 'Taslak',
};

export default function AdminKycEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [liste, setListe] = useState<AdminKycBasvuru[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      setListe(await AdminKycListesi(60));
    } catch (e) {
      Alert.alert('KYC', e instanceof Error ? e.message : 'Yüklenemedi');
      setListe([]);
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

  const pendingSayisi = liste.filter((r) => r.status === 'pending').length;

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Kimlik onayı"
        subtitle={`${liste.length} başvuru · ${pendingSayisi} bekleyen · detay için dokun`}
        fallbackHref="/admin"
      />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={
          <RefreshControl
            refreshing={yukleniyor}
            onRefresh={() => void yukle()}
            tintColor={RenkTokenlari.primarySoft}
          />
        }
      >
        {yukleniyor && !liste.length ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : !liste.length ? (
          <Text style={AdminStil.bos}>Başvuru yok</Text>
        ) : (
          liste.map((r) => {
            const kisi =
              r.profiles?.display_name ||
              (r.profiles?.username
                ? `@${r.profiles.username}`
                : r.user_id.slice(0, 8));
            return (
              <Pressable
                key={r.id}
                style={({ pressed }) => [
                  AdminStil.kart,
                  pressed && { opacity: 0.88 },
                ]}
                onPress={() => router.push(`/admin/kyc/${r.id}` as any)}
              >
                <View style={AdminStil.satir}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={AdminStil.kartBaslik} numberOfLines={1}>
                      {r.first_name} {r.last_name}
                    </Text>
                    <Text style={AdminStil.kartAlt} numberOfLines={1}>
                      {kisi}
                      {r.profiles?.public_user_id
                        ? ` · ID ${r.profiles.public_user_id}`
                        : ''}
                    </Text>
                  </View>
                  <View style={AdminStil.chip}>
                    <Text style={AdminStil.chipYazi}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </Text>
                  </View>
                </View>
                <Text style={AdminStil.kartAlt}>
                  {DOC_LABEL[r.doc_type] ?? r.doc_type} ·{' '}
                  {new Date(r.created_at).toLocaleString('tr-TR')}
                </Text>
                <Text
                  style={[
                    AdminStil.aksiyonYazi,
                    { marginTop: 6, color: RenkTokenlari.primarySoft },
                  ]}
                >
                  Tüm detay · belgeler · hesap aktivitesi →
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
