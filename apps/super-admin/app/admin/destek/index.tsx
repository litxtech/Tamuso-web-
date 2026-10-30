import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../../../../src/components/Screen';
import { EkranBasligi } from '../../../../../src/components/EkranBasligi';
import { TextField } from '../../../../../src/components/TextField';
import { KlavyeScrollView } from '../../../../../src/bilesenler/klavye/KlavyeScrollView';
import { useAuth } from '../../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminStil } from '../../../../../src/moduller/admin/bilesenler/AdminStil';
import {
  AdminDestekOturumAta,
  AdminDestekOturumListesi,
  AdminDestekTemsilciAyarla,
  AdminDestekTemsilciListesi,
  BenDestekTemsilcisiMiyim,
} from '../../../../../src/moduller/canli-destek/islemler/DestekIslemleri';
import type {
  DestekOturumListeSatiri,
  DestekTemsilci,
} from '../../../../../src/moduller/canli-destek/tipler';
import { KullanicilariAra } from '../../../../../src/moduller/mesajlasma/okuma/KullanicilariAra';
import type { ArananKullanici } from '../../../../../src/moduller/mesajlasma/okuma/KullanicilariAra';
import { RenkTokenlari } from '../../../../../src/tasarim-sistemi/RenkTokenlari';

function durumEtiket(s: string): string {
  switch (s) {
    case 'waiting':
      return 'Bekliyor';
    case 'active':
      return 'Aktif';
    case 'idle_closed':
      return 'Süre doldu';
    case 'closed':
      return 'Kapandı';
    default:
      return s;
  }
}

function kisiAd(k?: {
  display_name?: string | null;
  username?: string | null;
} | null) {
  if (!k) return '—';
  return k.display_name?.trim() || (k.username ? `@${k.username}` : '—');
}

export default function AdminDestekEkrani() {
  const { profile, user } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [temsilciMi, setTemsilciMi] = useState(false);
  const [oturumlar, setOturumlar] = useState<DestekOturumListeSatiri[]>([]);
  const [temsilciler, setTemsilciler] = useState<DestekTemsilci[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [arama, setArama] = useState('');
  const [aramaSonuc, setAramaSonuc] = useState<ArananKullanici[]>([]);
  const [ataOturumId, setAtaOturumId] = useState<string | null>(null);

  const yetkili = admin || temsilciMi;

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const agent = await BenDestekTemsilcisiMiyim();
      setTemsilciMi(agent);
      if (!AdminYetkisiVarMi(profile) && !agent) {
        setOturumlar([]);
        setTemsilciler([]);
        return;
      }
      setOturumlar(await AdminDestekOturumListesi(50));
      if (AdminYetkisiVarMi(profile)) {
        setTemsilciler(await AdminDestekTemsilciListesi());
      }
    } catch (e) {
      Alert.alert(
        'Destek',
        e instanceof Error ? e.message : 'Liste yüklenemedi',
      );
    } finally {
      setYukleniyor(false);
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const agent = await BenDestekTemsilcisiMiyim();
        if (!AdminYetkisiVarMi(profile) && !agent) {
          router.replace('/(tabs)/profile');
          return;
        }
        setTemsilciMi(agent);
        void yukle();
      })();
    }, [profile, yukle]),
  );

  const araTemsilci = useCallback(async (q: string) => {
    setArama(q);
    if (q.trim().length < 1) {
      setAramaSonuc([]);
      return;
    }
    try {
      setAramaSonuc(
        await KullanicilariAra({ sorgu: q, haricUserId: user?.id, limit: 8 }),
      );
    } catch {
      setAramaSonuc([]);
    }
  }, [user?.id]);

  const temsilciEkle = (u: ArananKullanici) => {
    Alert.alert(
      'Temsilci ekle',
      `${u.display_name || u.username} → Toprak olarak atansın mı?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Ekle',
          onPress: async () => {
            const r = await AdminDestekTemsilciAyarla({
              userId: u.id,
              active: true,
            });
            if (!r.ok) {
              Alert.alert('Temsilci', r.hata ?? 'Eklenemedi');
              return;
            }
            setArama('');
            setAramaSonuc([]);
            void yukle();
          },
        },
      ],
    );
  };

  const temsilciKapat = (t: DestekTemsilci) => {
    Alert.alert('Temsilci', 'Pasif yapılsın mı?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Pasif',
        style: 'destructive',
        onPress: async () => {
          const r = await AdminDestekTemsilciAyarla({
            userId: t.user_id,
            active: false,
          });
          if (!r.ok) Alert.alert('Temsilci', r.hata ?? 'Güncellenemedi');
          else void yukle();
        },
      },
    ]);
  };

  const oturumAta = (sessionId: string, agentId: string, ad: string) => {
    Alert.alert('Oturum ata', `Temsilci: ${ad} (Toprak)`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Ata',
        onPress: async () => {
          const r = await AdminDestekOturumAta({ sessionId, agentId });
          setAtaOturumId(null);
          if (!r.ok) Alert.alert('Atama', r.hata ?? 'Başarısız');
          else void yukle();
        },
      },
    ]);
  };

  const aktifTemsilciler = useMemo(
    () => temsilciler.filter((t) => t.is_active),
    [temsilciler],
  );

  if (!yetkili && !yukleniyor) return null;

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Canlı destek"
        subtitle="Oturumlar · temsilci Toprak"
        fallbackHref="/admin"
      />
      <KlavyeScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={
          <RefreshControl
            refreshing={yukleniyor}
            onRefresh={() => void yukle()}
            tintColor={RenkTokenlari.primarySoft}
          />
        }
      >
        {admin ? (
          <>
            <Text style={AdminStil.sectionLabel}>Temsilciler (Toprak)</Text>
            <Text style={AdminStil.kartAlt}>
              Kullanıcıya her zaman Toprak olarak görünür. Atama buradan yapılır.
            </Text>
            <TextField
              value={arama}
              onChangeText={(t) => void araTemsilci(t)}
              placeholder="Kullanıcı ara (ekle)"
            />
            {aramaSonuc.map((u) => (
              <Pressable
                key={u.id}
                style={AdminStil.kart}
                onPress={() => temsilciEkle(u)}
              >
                <Text style={AdminStil.kartBaslik}>
                  {u.display_name || u.username}
                </Text>
                <Text style={AdminStil.kartAlt}>@{u.username} · ekle</Text>
              </Pressable>
            ))}
            {!temsilciler.length ? (
              <Text style={AdminStil.bos}>Henüz temsilci yok</Text>
            ) : (
              temsilciler.map((t) => (
                <Pressable
                  key={t.user_id}
                  style={AdminStil.kart}
                  onPress={() => (t.is_active ? temsilciKapat(t) : undefined)}
                >
                  <Text style={AdminStil.kartBaslik}>
                    {t.display_name || t.username} → Toprak
                  </Text>
                  <Text style={AdminStil.kartAlt}>
                    {t.is_active ? 'Aktif · dokunarak pasif yap' : 'Pasif'}
                  </Text>
                </Pressable>
              ))
            )}
          </>
        ) : null}

        <Text style={AdminStil.sectionLabel}>Görüşmeler</Text>
        {yukleniyor && !oturumlar.length ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : !oturumlar.length ? (
          <Text style={AdminStil.bos}>Oturum yok</Text>
        ) : (
          oturumlar.map((o) => (
            <View key={o.id} style={AdminStil.kart}>
              <Pressable
                onPress={() => router.push(`/admin/destek/${o.id}` as any)}
              >
                <Text style={AdminStil.kartBaslik}>{kisiAd(o.kullanici)}</Text>
                <Text style={AdminStil.kartAlt}>
                  {durumEtiket(o.status)} · {o.mesaj_sayisi} mesaj
                  {o.temsilci
                    ? ` · temsilci ${kisiAd(o.temsilci)}`
                    : ' · atanmamış'}
                </Text>
              </Pressable>
              {admin &&
              (o.status === 'waiting' || o.status === 'active') &&
              aktifTemsilciler.length ? (
                <View style={{ marginTop: 8, gap: 6 }}>
                  {ataOturumId === o.id ? (
                    aktifTemsilciler.map((t) => (
                      <Pressable
                        key={t.user_id}
                        style={AdminStil.chip}
                        onPress={() =>
                          oturumAta(
                            o.id,
                            t.user_id,
                            t.display_name || t.username || 'Temsilci',
                          )
                        }
                      >
                        <Text style={AdminStil.chipYazi}>
                          Ata: {t.display_name || t.username}
                        </Text>
                      </Pressable>
                    ))
                  ) : (
                    <Pressable
                      style={AdminStil.chip}
                      onPress={() => setAtaOturumId(o.id)}
                    >
                      <Text style={AdminStil.chipYazi}>Temsilci ata</Text>
                    </Pressable>
                  )}
                </View>
              ) : null}
            </View>
          ))
        )}
      </KlavyeScrollView>
    </Screen>
  );
}
