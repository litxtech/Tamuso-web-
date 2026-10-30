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
import { Screen } from '../../../../src/components/Screen';
import { EkranBasligi } from '../../../../src/components/EkranBasligi';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import {
  AdminCekimDurumGuncelle,
  AdminCekimListesi,
  AdminEnCokHarcayanlar,
} from '../../../../src/moduller/admin/platform/AdminPlatformIslemleri';
import type {
  AdminCekim,
  AdminHarcayan,
} from '../../../../src/moduller/admin/tipler/PlatformTipleri';
import {
  AdminStil,
  CekimDurumEtiketi,
  SayiKisa,
} from '../../../../src/moduller/admin/bilesenler/AdminStil';
import { AdminKullaniciCoinPaneli } from '../../../../src/moduller/admin/bilesenler/AdminKullaniciCoinPaneli';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';

export default function AdminFinansEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [harcayanlar, setHarcayanlar] = useState<AdminHarcayan[]>([]);
  const [cekimler, setCekimler] = useState<AdminCekim[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const [h, c] = await Promise.all([
        AdminEnCokHarcayanlar(30),
        AdminCekimListesi(40),
      ]);
      setHarcayanlar(h);
      setCekimler(c);
    } catch (e) {
      Alert.alert(
        'Finans',
        e instanceof Error ? e.message : 'Veri yüklenemedi (migration 023?)',
      );
      setHarcayanlar([]);
      setCekimler([]);
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

  const cekimGuncelle = (id: string, status: string) => {
    Alert.alert('Çekim', `${CekimDurumEtiketi(status)} olarak işaretle?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: async () => {
          setBusyId(id);
          try {
            await AdminCekimDurumGuncelle(id, status);
            await yukle();
          } catch (e) {
            Alert.alert('Hata', e instanceof Error ? e.message : 'İşlem başarısız');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Finans"
        subtitle="Coin · harcama · çekim"
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
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          style={[AdminStil.kart, { marginBottom: 4 }]}
          onPress={() => router.push('/admin/ciro' as any)}
        >
          <View style={AdminStil.satir}>
            <View style={{ flex: 1 }}>
              <Text style={AdminStil.kartBaslik}>Anlık ciro</Text>
              <Text style={AdminStil.kartAlt}>
                Gün · hafta · ay · kimden · PDF / WhatsApp / yazıcı
              </Text>
            </View>
            <Text style={[AdminStil.kartAlt, { color: RenkTokenlari.accent }]}>
              Aç →
            </Text>
          </View>
        </Pressable>

        <AdminKullaniciCoinPaneli
          baslik="Kullanıcıya coin"
          alt="İsim yaz · avatar ile seç · yükle / eksilt / ceza"
          onBasarili={() => void yukle()}
        />

        <Text style={AdminStil.sectionLabel}>En çok harcayanlar</Text>
        {yukleniyor && !harcayanlar.length ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : !harcayanlar.length ? (
          <Text style={AdminStil.bos}>Henüz yükleme yok</Text>
        ) : (
          harcayanlar.map((h) => (
            <Pressable
              key={h.user_id}
              style={AdminStil.kart}
              onPress={() => router.push(`/admin/kullanicilar/${h.user_id}` as any)}
            >
              <View style={AdminStil.satir}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={AdminStil.kartBaslik}>
                    {h.display_name || h.username || 'Kullanıcı'}
                  </Text>
                  <Text style={AdminStil.kartAlt}>
                    @{h.username ?? '—'} · {h.public_user_id ?? h.user_id.slice(0, 8)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[AdminStil.kpiN, { fontSize: 18, color: RenkTokenlari.accent }]}>
                    {SayiKisa(h.toplam_coin)}
                  </Text>
                  <Text style={AdminStil.kartAlt}>{h.islem_adet} işlem</Text>
                </View>
              </View>
            </Pressable>
          ))
        )}

        <Text style={AdminStil.sectionLabel}>Çekim talepleri</Text>
        {!cekimler.length ? (
          <Text style={AdminStil.bos}>Çekim yok</Text>
        ) : (
          cekimler.map((c) => (
            <View key={c.id} style={AdminStil.kart}>
              <View style={AdminStil.satir}>
                <Text style={AdminStil.kartBaslik}>{c.diamonds} elmas</Text>
                <View style={AdminStil.chip}>
                  <Text style={AdminStil.chipYazi}>{CekimDurumEtiketi(c.status)}</Text>
                </View>
              </View>
              <Text style={AdminStil.kartAlt}>
                {c.requester_type} · {c.method} ·{' '}
                {new Date(c.created_at).toLocaleString('tr-TR')}
              </Text>
              {c.user_id ? (
                <Pressable
                  onPress={() =>
                    router.push(`/admin/kullanicilar/${c.user_id}` as any)
                  }
                >
                  <Text style={[AdminStil.kartAlt, { color: RenkTokenlari.primarySoft }]}>
                    Kullanıcı dosyası →
                  </Text>
                </Pressable>
              ) : null}
              {['pending', 'under_review', 'frozen'].includes(c.status) ? (
                <View style={AdminStil.aksiyonSatir}>
                  {[
                    ['under_review', 'İncele'],
                    ['approved', 'Onayla'],
                    ['paid', 'Ödendi'],
                    ['rejected', 'Red'],
                    ['frozen', 'Dondur'],
                  ].map(([st, label]) => (
                    <Pressable
                      key={st}
                      style={AdminStil.aksiyon}
                      disabled={busyId === c.id}
                      onPress={() => cekimGuncelle(c.id, st)}
                    >
                      <Text style={AdminStil.aksiyonYazi}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
