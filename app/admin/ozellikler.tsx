import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useAuth } from '../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import {
  AdminBayraklariGetir,
  AdminDuyuruOlustur,
  AdminKillSwitchAyarla,
  AdminOzellikBayragiAyarla,
} from '../../src/moduller/admin/platform/AdminPlatformIslemleri';
import type {
  AdminBayrak,
  AdminKill,
} from '../../src/moduller/admin/tipler/PlatformTipleri';
import {
  ADMIN_OZELLIK_GRUPLARI,
  DuyuruOncelikEtiketi,
  KillSwitchMetni,
  OzellikBayragiMetni,
} from '../../src/moduller/admin/ozellikler/AdminOzellikEtiketleri';
import { OzellikBayrakCacheOptimistic } from '../../src/moduller/ozellik-bayraklari/OzellikBayrakCache';
import { AdminStil } from '../../src/moduller/admin/bilesenler/AdminStil';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';

export default function AdminOzelliklerEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [flags, setFlags] = useState<AdminBayrak[]>([]);
  const [kills, setKills] = useState<AdminKill[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [sekme, setSekme] = useState(ADMIN_OZELLIK_GRUPLARI[0]!.id);
  const [duyuru, setDuyuru] = useState({ title: '', body: '', priority: 'normal' });

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const d = await AdminBayraklariGetir();
      setFlags(d.flags);
      setKills(d.kills);
    } catch (e) {
      Alert.alert(
        'Özellikler',
        e instanceof Error ? e.message : 'Bayraklar alınamadı',
      );
      setFlags([]);
      setKills([]);
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

  const aktifGrup = useMemo(
    () => ADMIN_OZELLIK_GRUPLARI.find((g) => g.id === sekme) ?? ADMIN_OZELLIK_GRUPLARI[0]!,
    [sekme],
  );

  const flagMap = useMemo(() => new Map(flags.map((f) => [f.key, f])), [flags]);
  const killMap = useMemo(() => new Map(kills.map((k) => [k.key, k])), [kills]);

  const grupFlags = useMemo(() => {
    return aktifGrup.flagKeys
      .map((k) => flagMap.get(k))
      .filter((f): f is AdminBayrak => !!f);
  }, [aktifGrup, flagMap]);

  const grupKills = useMemo(() => {
    if (!aktifGrup.killKeys?.length) return [];
    return aktifGrup.killKeys
      .map((k) => killMap.get(k) ?? { key: k, active: false, reason: null })
      .filter(Boolean) as AdminKill[];
  }, [aktifGrup, killMap]);

  /** Gruba atanmamış bayraklar — "Diğer" hissi için Güvenlik sekmesine ek */
  const atanmamisFlags = useMemo(() => {
    if (aktifGrup.id !== 'guvenlik') return [];
    const atanmis = new Set(ADMIN_OZELLIK_GRUPLARI.flatMap((g) => g.flagKeys));
    return flags.filter((f) => !atanmis.has(f.key));
  }, [flags, aktifGrup.id]);

  if (!admin) return null;

  const duyuruGonder = async () => {
    if (!duyuru.title.trim() || !duyuru.body.trim()) {
      Alert.alert('Duyuru', 'Başlık ve metin gerekli.');
      return;
    }
    try {
      await AdminDuyuruOlustur(duyuru.title, duyuru.body, duyuru.priority);
      setDuyuru({ title: '', body: '', priority: 'normal' });
      Alert.alert('Tamam', 'Duyuru yayınlandı.');
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Duyuru oluşturulamadı');
    }
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Özellikler"
        subtitle="Sekme sekme aç/kapa · canlı uygulamada anında gizlenir"
        fallbackHref="/admin"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 48, flexGrow: 0 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          gap: 8,
          alignItems: 'center',
          paddingBottom: 8,
        }}
      >
        {ADMIN_OZELLIK_GRUPLARI.map((g) => {
          const aktif = g.id === sekme;
          return (
            <Pressable
              key={g.id}
              onPress={() => setSekme(g.id)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: aktif
                  ? RenkTokenlari.primarySoft
                  : RenkTokenlari.border,
                backgroundColor: aktif
                  ? RenkTokenlari.primarySoft + '22'
                  : RenkTokenlari.surface,
              }}
            >
              <Text
                style={{
                  color: aktif ? RenkTokenlari.primarySoft : RenkTokenlari.text,
                  fontWeight: '700',
                  fontSize: 13,
                }}
              >
                {g.baslik}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

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
        {aktifGrup.id === 'banner' ? (
          <View style={AdminStil.kart}>
            <Text style={AdminStil.kartBaslik}>Yeni duyuru</Text>
            <Text style={AdminStil.kartAlt}>
              Tüm kullanıcılara uygulama içi duyuru gönderir.
            </Text>
            <TextInput
              style={AdminStil.input}
              placeholder="Başlık"
              placeholderTextColor={RenkTokenlari.textDim}
              value={duyuru.title}
              onChangeText={(t) => setDuyuru((s) => ({ ...s, title: t }))}
            />
            <TextInput
              style={[AdminStil.input, { minHeight: 80, textAlignVertical: 'top' }]}
              placeholder="Duyuru metni"
              placeholderTextColor={RenkTokenlari.textDim}
              value={duyuru.body}
              onChangeText={(t) => setDuyuru((s) => ({ ...s, body: t }))}
              multiline
            />
            <Text style={[AdminStil.kartAlt, { marginTop: 4 }]}>Öncelik</Text>
            <View style={AdminStil.aksiyonSatir}>
              {['low', 'normal', 'high', 'urgent'].map((p) => (
                <Pressable
                  key={p}
                  style={[
                    AdminStil.aksiyon,
                    duyuru.priority === p && {
                      borderColor: RenkTokenlari.primarySoft,
                    },
                  ]}
                  onPress={() => setDuyuru((s) => ({ ...s, priority: p }))}
                >
                  <Text style={AdminStil.aksiyonYazi}>{DuyuruOncelikEtiketi(p)}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={AdminStil.aksiyon} onPress={() => void duyuruGonder()}>
              <Text
                style={[AdminStil.aksiyonYazi, { color: RenkTokenlari.primarySoft }]}
              >
                Duyuruyu yayınla
              </Text>
            </Pressable>
          </View>
        ) : null}

        {yukleniyor && !flags.length ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : null}

        <Text style={AdminStil.sectionLabel}>{aktifGrup.baslik}</Text>
        <Text style={[AdminStil.kartAlt, { marginTop: -4 }]}>
          Kapalı özellik canlı uygulamada buton/sekme olarak gizlenir (yeniden kurulum
          gerekmez).
        </Text>

        {[...grupFlags, ...atanmamisFlags].map((f) => {
          const metin = OzellikBayragiMetni(f.key, f.description);
          return (
            <View key={f.key} style={AdminStil.kart}>
              <View style={AdminStil.satir}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={AdminStil.kartBaslik}>{metin.baslik}</Text>
                  <Text style={AdminStil.kartAlt}>{metin.aciklama}</Text>
                  <Text
                    style={[
                      AdminStil.chipYazi,
                      {
                        color: f.enabled
                          ? RenkTokenlari.primarySoft
                          : RenkTokenlari.textDim,
                      },
                    ]}
                  >
                    {f.enabled ? 'Açık · canlı' : 'Kapalı · gizli'}
                  </Text>
                </View>
                <Switch
                  value={f.enabled}
                  onValueChange={async (v) => {
                    try {
                      OzellikBayrakCacheOptimistic(f.key, v, 'flag');
                      setFlags((prev) =>
                        prev.map((x) =>
                          x.key === f.key ? { ...x, enabled: v } : x,
                        ),
                      );
                      await AdminOzellikBayragiAyarla(f.key, v);
                    } catch (e) {
                      Alert.alert(
                        'Hata',
                        e instanceof Error ? e.message : 'Güncellenemedi',
                      );
                      await yukle();
                    }
                  }}
                  trackColor={{
                    false: RenkTokenlari.surface,
                    true: RenkTokenlari.primary,
                  }}
                />
              </View>
            </View>
          );
        })}

        {grupKills.length > 0 ? (
          <>
            <Text style={AdminStil.sectionLabel}>Acil durdurma</Text>
            <Text style={[AdminStil.kartAlt, { marginTop: -4 }]}>
              Açıkken ilgili işlem anında kesilir. Normal durumda hepsi kapalı olmalı.
            </Text>
            {grupKills.map((k) => {
              const metin = KillSwitchMetni(k.key);
              return (
                <View key={k.key} style={AdminStil.kart}>
                  <View style={AdminStil.satir}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={AdminStil.kartBaslik}>{metin.baslik}</Text>
                      <Text style={AdminStil.kartAlt}>{metin.aciklama}</Text>
                      <Text
                        style={[
                          AdminStil.chipYazi,
                          {
                            color: k.active
                              ? RenkTokenlari.danger
                              : RenkTokenlari.textDim,
                          },
                        ]}
                      >
                        {k.active
                          ? k.reason?.trim() || 'Durduruldu'
                          : 'Normal (kapalı)'}
                      </Text>
                    </View>
                    <Switch
                      value={k.active}
                      onValueChange={async (v) => {
                        try {
                          OzellikBayrakCacheOptimistic(k.key, v, 'kill');
                          setKills((prev) => {
                            const varMi = prev.some((x) => x.key === k.key);
                            if (varMi) {
                              return prev.map((x) =>
                                x.key === k.key
                                  ? {
                                      ...x,
                                      active: v,
                                      reason: v
                                        ? 'Admin panelinden açıldı'
                                        : null,
                                    }
                                  : x,
                              );
                            }
                            return [
                              ...prev,
                              {
                                key: k.key,
                                active: v,
                                reason: v ? 'Admin panelinden açıldı' : null,
                              },
                            ];
                          });
                          await AdminKillSwitchAyarla(
                            k.key,
                            v,
                            v ? 'Admin panelinden açıldı' : undefined,
                          );
                        } catch (e) {
                          Alert.alert(
                            'Hata',
                            e instanceof Error ? e.message : 'Güncellenemedi',
                          );
                          await yukle();
                        }
                      }}
                      trackColor={{
                        false: RenkTokenlari.surface,
                        true: RenkTokenlari.danger,
                      }}
                    />
                  </View>
                </View>
              );
            })}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
