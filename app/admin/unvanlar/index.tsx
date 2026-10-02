import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { EkranBasligi } from '../../../src/components/EkranBasligi';
import { GradientButton } from '../../../src/components/GradientButton';
import { useAuth } from '../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminStil } from '../../../src/moduller/admin/bilesenler/AdminStil';
import {
  AdminUnvanlariListele,
  type AdminUnvanListeFiltre,
  type AdminUnvanListeSort,
} from '../../../src/moduller/unvanlar/islemler/UnvanAdminIslemleri';
import type { UnvanKayit } from '../../../src/moduller/unvanlar/tipler';
import { UserTitleBadge } from '../../../src/moduller/unvanlar/bilesenler/UserTitleBadge';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

const FILTRELER: { id: AdminUnvanListeFiltre; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'active', label: 'Aktif' },
  { id: 'inactive', label: 'Pasif' },
];

const SIRALAR: { id: AdminUnvanListeSort; label: string }[] = [
  { id: 'newest', label: 'Yeni' },
  { id: 'name', label: 'Ad' },
  { id: 'priority', label: 'Öncelik' },
];

export default function AdminUnvanlarEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [liste, setListe] = useState<UnvanKayit[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [q, setQ] = useState('');
  const [filtre, setFiltre] = useState<AdminUnvanListeFiltre>('all');
  const [sort, setSort] = useState<AdminUnvanListeSort>('newest');

  const load = useCallback(async () => {
    setYukleniyor(true);
    try {
      const res = await AdminUnvanlariListele({
        q: q.trim() || null,
        filter: filtre,
        sort,
        limit: 80,
      });
      if (!res.ok && res.hata) Alert.alert('Hata', res.hata);
      setListe(res.items);
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Liste alınamadı');
      setListe([]);
    } finally {
      setYukleniyor(false);
    }
  }, [q, filtre, sort]);

  useFocusEffect(
    useCallback(() => {
      if (!admin) {
        router.replace('/(tabs)/profile');
        return;
      }
      void load();
    }, [admin, load]),
  );

  if (!admin) return null;

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Ünvan Yönetimi"
        subtitle="Oluştur · tasarla · ata · geri al"
        onBack={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={yukleniyor}
            onRefresh={() => void load()}
            tintColor={RenkTokenlari.primary}
          />
        }
      >
        <TextInput
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => void load()}
          placeholder="Ünvan ara…"
          placeholderTextColor={RenkTokenlari.textDim}
          style={AdminStil.input}
          autoCapitalize="none"
          returnKeyType="search"
        />

        <View style={styles.chips}>
          {FILTRELER.map((f) => (
            <Pressable
              key={f.id}
              style={[styles.chip, filtre === f.id && styles.chipAktif]}
              onPress={() => setFiltre(f.id)}
            >
              <Text style={[styles.chipYazi, filtre === f.id && styles.chipYaziAktif]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.chips}>
          {SIRALAR.map((s) => (
            <Pressable
              key={s.id}
              style={[styles.chip, sort === s.id && styles.chipAktif]}
              onPress={() => setSort(s.id)}
            >
              <Text style={[styles.chipYazi, sort === s.id && styles.chipYaziAktif]}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <GradientButton
          title="+ Yeni Ünvan"
          onPress={() => router.push('/admin/unvanlar/yeni' as never)}
        />

        {yukleniyor && liste.length === 0 ? (
          <ActivityIndicator color={RenkTokenlari.primary} />
        ) : null}

        {liste.map((u) => (
          <Pressable
            key={u.id}
            style={styles.card}
            onPress={() => router.push(`/admin/unvanlar/${u.id}` as never)}
          >
            <View style={styles.cardTop}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {u.name}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {u.slug} · öncelik {u.priority}
                </Text>
              </View>
              <UserTitleBadge design={u.design} label={u.name} size="COMPACT" />
            </View>

            <Text style={styles.stats}>
              {(u.active_user_count ?? 0)} aktif · {(u.total_assignment_count ?? 0)} atama
              {u.selection_locked ? ' · kilitli' : ''}
            </Text>

            <View
              style={[
                styles.status,
                u.is_active && !u.archived_at ? styles.statusAktif : styles.statusPasif,
              ]}
            >
              <Text style={styles.statusText}>
                {u.archived_at ? 'Arşiv' : u.is_active ? 'Aktif' : 'Pasif'}
              </Text>
            </View>

            <View style={styles.actions}>
              <ActionChip
                icon="create-outline"
                label="Düzenle"
                onPress={() => router.push(`/admin/unvanlar/${u.id}` as never)}
              />
              <ActionChip
                icon="people-outline"
                label="Kullanıcılar"
                onPress={() =>
                  router.push(`/admin/unvanlar/kullanicilar?titleId=${u.id}` as never)
                }
              />
              <ActionChip
                icon="person-add-outline"
                label="Ata"
                onPress={() =>
                  router.push(`/admin/unvanlar/ata?titleId=${u.id}` as never)
                }
              />
            </View>
          </Pressable>
        ))}

        {!yukleniyor && liste.length === 0 ? (
          <Text style={AdminStil.bos}>Henüz ünvan yok. İlk ünvanı oluştur.</Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function ActionChip({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.actionChip} onPress={onPress}>
      <Ionicons name={icon} size={14} color={RenkTokenlari.text} />
      <Text style={styles.actionChipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  chipAktif: {
    backgroundColor: 'rgba(232,64,145,0.22)',
    borderColor: RenkTokenlari.borderAccent,
  },
  chipYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  chipYaziAktif: {
    color: RenkTokenlari.text,
  },
  card: {
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  name: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  meta: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  stats: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
  },
  status: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusAktif: {
    backgroundColor: 'rgba(61,207,176,0.2)',
  },
  statusPasif: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statusText: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: RenkTokenlari.surface,
  },
  actionChipText: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.text,
  },
});
