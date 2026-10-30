import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../../../../src/components/Screen';
import { EkranBasligi } from '../../../../../src/components/EkranBasligi';
import { ModulHataSiniri } from '../../../../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { useAuth } from '../../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { FikirDurumRozeti } from '../../../../../src/moduller/fikir-geri-bildirim/bilesenler/FikirDurumRozeti';
import {
  AdminFikirIstatistikGetir,
  AdminFikirListele,
} from '../../../../../src/moduller/fikir-geri-bildirim/islemler/AdminFikirIslemleri';
import type {
  AdminFikirOzet,
  FikirDurum,
  FikirIstatistik,
} from '../../../../../src/moduller/fikir-geri-bildirim/tipler';
import { RenkTokenlari } from '../../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

const FILTRELER: Array<{ key: string | null; label: string }> = [
  { key: null, label: 'Tümü' },
  { key: 'RECEIVED', label: 'Yeni' },
  { key: 'REVIEWING', label: 'İnceleniyor' },
  { key: 'PLANNED', label: 'Planlanan' },
  { key: 'IN_DEVELOPMENT', label: 'Geliştirilen' },
  { key: 'COMPLETED', label: 'Tamamlanan' },
  { key: 'NOT_PLANNED', label: 'Planlanmayan' },
];

export default function AdminFikirlerEkrani() {
  const { profile } = useAuth();
  const [items, setItems] = useState<AdminFikirOzet[]>([]);
  const [istatistik, setIstatistik] = useState<FikirIstatistik | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);

  const yenile = useCallback(async () => {
    setYukleniyor(true);
    try {
      const [list, stats] = await Promise.all([
        AdminFikirListele({ status, q: q.trim() || null, limit: 50 }),
        AdminFikirIstatistikGetir(),
      ]);
      setItems(list);
      setIstatistik(stats);
    } catch {
      setItems([]);
    } finally {
      setYukleniyor(false);
    }
  }, [status, q]);

  useFocusEffect(
    useCallback(() => {
      if (!AdminYetkisiVarMi(profile)) {
        router.replace('/(tabs)/profile' as any);
        return;
      }
      void yenile();
    }, [profile, yenile]),
  );

  useEffect(() => {
    if (!AdminYetkisiVarMi(profile)) return;
    void yenile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <Screen>
      <ModulHataSiniri modulAdi="admin-fikirler">
        <EkranBasligi
          title="Fikir & Öneriler"
          subtitle="Kuyruk · durum · ödül"
          onBack={() => router.back()}
        />
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.liste}
          refreshControl={
            <RefreshControl
              refreshing={yukleniyor}
              onRefresh={() => void yenile()}
              tintColor={RenkTokenlari.primarySoft}
            />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              {istatistik ? (
                <View style={styles.statGrid}>
                  {[
                    ['Bu hafta', istatistik.this_week],
                    ['Yeni', istatistik.received],
                    ['İncelenen', istatistik.reviewing],
                    ['Planlanan', istatistik.planned],
                    ['Gelişen', istatistik.in_development],
                    ['Tamamlanan', istatistik.completed],
                  ].map(([l, v]) => (
                    <View key={String(l)} style={styles.statKart}>
                      <Text style={styles.statSayi}>{v}</Text>
                      <Text style={styles.statEtiket}>{l}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <TextInput
                style={styles.arama}
                value={q}
                onChangeText={setQ}
                placeholder="Başlık · içerik · kullanıcı"
                placeholderTextColor={RenkTokenlari.textMuted}
                onSubmitEditing={() => void yenile()}
                returnKeyType="search"
              />

              <View style={styles.filtreSerit}>
                {FILTRELER.map((f) => (
                  <Pressable
                    key={String(f.key)}
                    style={[styles.filtre, status === f.key && styles.filtreAktif]}
                    onPress={() => setStatus(f.key)}
                  >
                    <Text
                      style={[
                        styles.filtreYazi,
                        status === f.key && styles.filtreYaziAktif,
                      ]}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable style={styles.katBtn} onPress={() => void yenile()}>
                <Ionicons name="search-outline" size={16} color={RenkTokenlari.primarySoft} />
                <Text style={styles.katBtnYazi}>Ara / Yenile</Text>
              </Pressable>

              <Pressable
                style={styles.katBtn}
                onPress={() => router.push('/admin/fikirler/kategoriler' as any)}
              >
                <Ionicons name="pricetags-outline" size={16} color={RenkTokenlari.primarySoft} />
                <Text style={styles.katBtnYazi}>Kategorileri yönet</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.kart}
              onPress={() => router.push(`/admin/fikirler/${item.id}` as any)}
            >
              <View style={styles.kartUst}>
                <Text style={styles.kat}>{item.category.name}</Text>
                <FikirDurumRozeti status={item.status as FikirDurum} />
              </View>
              <Text style={styles.baslik} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.user} numberOfLines={1}>
                {item.user.display_name || item.user.username || item.user.id}
                {item.is_public ? ' · Public' : ''}
                {item.is_featured ? ' · Öne çıkan' : ''}
              </Text>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  liste: { padding: BoslukTokenlari.md, paddingBottom: 40 },
  header: { gap: 12, marginBottom: 12 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statKart: {
    width: '31%',
    backgroundColor: RenkTokenlari.surface,
    borderRadius: YaricapTokenlari.md,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  statSayi: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
  },
  statEtiket: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  arama: {
    backgroundColor: RenkTokenlari.surface,
    borderRadius: YaricapTokenlari.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: RenkTokenlari.text,
  },
  filtreSerit: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filtre: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.surface,
  },
  filtreAktif: { backgroundColor: RenkTokenlari.primarySoft + '33' },
  filtreYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  filtreYaziAktif: { color: RenkTokenlari.primarySoft, fontWeight: '700' },
  katBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  katBtnYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '600',
  },
  kart: {
    backgroundColor: RenkTokenlari.surface,
    borderRadius: YaricapTokenlari.lg,
    padding: 12,
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  kartUst: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kat: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
  baslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '600',
  },
  user: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
});
