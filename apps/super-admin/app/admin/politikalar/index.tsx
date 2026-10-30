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
  AdminPolitikaListele,
  AdminPolitikaSil,
} from '../../../../../src/moduller/admin/politikalar/AdminPolitikaIslemleri';
import type { PolitikaKayit } from '../../../../../src/moduller/politikalar/tipler/PolitikaTipleri';
import { AdminStil } from '../../../../../src/moduller/admin/bilesenler/AdminStil';
import { RenkTokenlari } from '../../../../../src/tasarim-sistemi/RenkTokenlari';

export default function AdminPolitikalarEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [liste, setListe] = useState<PolitikaKayit[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      setListe(await AdminPolitikaListele());
    } catch (e) {
      Alert.alert('Politikalar', e instanceof Error ? e.message : 'Yüklenemedi');
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

  const sil = (row: PolitikaKayit) => {
    Alert.alert(
      'Politikayı kaldır',
      `"${row.title}" pasifleştirilir; kayıt/girişte görünmez.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await AdminPolitikaSil(row.code);
                await yukle();
              } catch (e) {
                Alert.alert(
                  'Hata',
                  e instanceof Error ? e.message : 'Silinemedi',
                );
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Politikalar"
        subtitle="Yaz · güncelle · kayıt/giriş linki"
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
        <Pressable
          style={[AdminStil.kart, { borderColor: RenkTokenlari.borderAccent }]}
          onPress={() => router.push('/admin/politikalar/yeni' as any)}
        >
          <Text style={[AdminStil.kartBaslik, { color: RenkTokenlari.mint }]}>
            + Yeni politika
          </Text>
          <Text style={AdminStil.kartAlt}>
            İstediğin ad · otomatik link (/politika/…) · sınırsız metin
          </Text>
        </Pressable>

        {yukleniyor && !liste.length ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : !liste.length ? (
          <Text style={AdminStil.bos}>Politika yok</Text>
        ) : (
          liste.map((r) => (
            <Pressable
              key={r.code}
              style={[AdminStil.kart, !r.is_active && { opacity: 0.5 }]}
              onPress={() =>
                router.push(`/admin/politikalar/${r.code}` as any)
              }
            >
              <View style={AdminStil.satir}>
                <Text style={[AdminStil.kartBaslik, { flex: 1 }]}>
                  {r.title}
                </Text>
                <View style={AdminStil.chip}>
                  <Text style={AdminStil.chipYazi}>
                    {r.is_active ? 'aktif' : 'pasif'} · v{r.version ?? '—'}
                  </Text>
                </View>
              </View>
              <Text style={AdminStil.kartAlt}>
                Kod / link: /politika/{r.code}
              </Text>
              <Text style={AdminStil.kartAlt}>
                Giriş adı: {r.link_label || r.title}
                {r.show_on_login ? ' · girişte' : ''}
                {r.show_on_register ? ' · kayıtta' : ''}
              </Text>
              <Text style={AdminStil.kartAlt}>
                {(r.body_len ?? (r.body_md?.length ?? 0)).toLocaleString('tr-TR')}{' '}
                karakter
              </Text>
              <View style={[AdminStil.aksiyonSatir, { marginTop: 6 }]}>
                <Pressable
                  onPress={() =>
                    router.push(`/admin/politikalar/${r.code}` as any)
                  }
                >
                  <Text style={[AdminStil.aksiyonYazi, { color: RenkTokenlari.mint }]}>
                    Düzenle
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push(`/politika/${r.code}` as any)}
                >
                  <Text style={AdminStil.aksiyonYazi}>Önizle</Text>
                </Pressable>
                {r.is_active ? (
                  <Pressable onPress={() => sil(r)}>
                    <Text
                      style={[
                        AdminStil.aksiyonYazi,
                        { color: RenkTokenlari.danger },
                      ]}
                    >
                      Sil
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
