import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { EkranBasligi } from '../../../src/components/EkranBasligi';
import { GradientButton } from '../../../src/components/GradientButton';
import { useAuth } from '../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminStil } from '../../../src/moduller/admin/bilesenler/AdminStil';
import {
  AdminUnvanAtananlar,
  AdminUnvanDetay,
  AdminUnvanGeriAl,
  type AdminUnvanAtanan,
} from '../../../src/moduller/unvanlar/islemler/UnvanAdminIslemleri';
import type { UnvanKayit } from '../../../src/moduller/unvanlar/tipler';
import { UserTitleBadge } from '../../../src/moduller/unvanlar/bilesenler/UserTitleBadge';
import { MedyaUriGuvenli } from '../../../src/moduller/mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

function Avatar({
  url,
  ad,
  size = 44,
}: {
  url?: string | null;
  ad: string;
  size?: number;
}) {
  const harf = (ad.trim() || '?').charAt(0).toLocaleUpperCase('tr-TR');
  const safe = MedyaUriGuvenli(url);
  if (safe) {
    return (
      <Image
        source={{ uri: safe }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: 'rgba(232,64,145,0.35)',
        }}
      />
    );
  }
  return (
    <LinearGradient
      colors={[...RenkTokenlari.gradientPrimary]}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#12040C', fontWeight: '900', fontSize: size * 0.36 }}>
        {harf}
      </Text>
    </LinearGradient>
  );
}

function tr(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('tr-TR');
  } catch {
    return iso;
  }
}

export default function AdminUnvanAtananlarEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const params = useLocalSearchParams<{ titleId?: string }>();
  const titleId = typeof params.titleId === 'string' ? params.titleId : '';

  const [title, setTitle] = useState<UnvanKayit | null>(null);
  const [items, setItems] = useState<AdminUnvanAtanan[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  const load = useCallback(async () => {
    if (!titleId) return;
    setYukleniyor(true);
    try {
      const [detay, liste] = await Promise.all([
        AdminUnvanDetay(titleId),
        AdminUnvanAtananlar(titleId, 100, 0),
      ]);
      if (detay.title) setTitle(detay.title);
      if (!liste.ok && liste.hata) Alert.alert('Hata', liste.hata);
      setItems(liste.items.filter((i) => !i.revoked_at && i.is_active));
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Liste alınamadı');
      setItems([]);
    } finally {
      setYukleniyor(false);
    }
  }, [titleId]);

  useFocusEffect(
    useCallback(() => {
      if (!admin) {
        router.replace('/(tabs)/profile');
        return;
      }
      if (!titleId) {
        Alert.alert('Eksik', 'titleId gerekli');
        router.back();
        return;
      }
      void load();
    }, [admin, titleId, load]),
  );

  const geriAl = (row: AdminUnvanAtanan) => {
    const ad =
      row.display_name?.trim() ||
      (row.username ? `@${row.username}` : row.user_id.slice(0, 8));
    Alert.alert('Geri al', `${ad} için ünvan geri alınsın mı?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Geri al',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const res = await AdminUnvanGeriAl({
              assignmentId: row.assignment_id,
              userId: row.user_id,
              titleId,
            });
            if (!res.ok) {
              Alert.alert('Hata', res.hata ?? 'Geri alınamadı');
              return;
            }
            await load();
          })();
        },
      },
    ]);
  };

  if (!admin) return null;

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Atanan Kullanıcılar"
        subtitle={title?.name ?? titleId}
        onBack={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={
          <RefreshControl
            refreshing={yukleniyor}
            onRefresh={() => void load()}
            tintColor={RenkTokenlari.primary}
          />
        }
      >
        {title ? (
          <View style={styles.titleRow}>
            <UserTitleBadge design={title.design} label={title.name} />
            <Text style={styles.count}>{items.length} aktif</Text>
          </View>
        ) : null}

        <GradientButton
          title="Yeni atama"
          onPress={() =>
            router.push(`/admin/unvanlar/ata?titleId=${titleId}` as never)
          }
        />

        {yukleniyor && items.length === 0 ? (
          <ActivityIndicator color={RenkTokenlari.primary} />
        ) : null}

        {items.map((row) => {
          const ad =
            row.display_name?.trim() ||
            (row.username ? `@${row.username}` : row.user_id.slice(0, 8));
          return (
            <View key={row.assignment_id} style={styles.card}>
              <Pressable
                style={styles.userRow}
                onPress={() =>
                  router.push(`/admin/kullanicilar/${row.user_id}` as never)
                }
              >
                <Avatar url={row.avatar_url} ad={ad} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {ad}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {row.username ? `@${row.username}` : ''}
                    {row.public_user_id ? ` · ${row.public_user_id}` : ''}
                  </Text>
                  <Text style={styles.meta}>
                    {tr(row.assigned_at)}
                    {row.expires_at ? ` → ${tr(row.expires_at)}` : ' · kalıcı'}
                    {row.is_selected ? ' · seçili' : ''}
                    {row.selection_locked ? ' · kilit' : ''}
                  </Text>
                </View>
              </Pressable>
              <Pressable style={styles.revoke} onPress={() => geriAl(row)}>
                <Text style={styles.revokeText}>Geri al</Text>
              </Pressable>
            </View>
          );
        })}

        {!yukleniyor && items.length === 0 ? (
          <Text style={AdminStil.bos}>Bu ünvana atanmış aktif kullanıcı yok.</Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  count: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  card: {
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    gap: 10,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  name: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  meta: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  revoke: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.sm,
    borderWidth: 1,
    borderColor: `${RenkTokenlari.danger}55`,
    backgroundColor: RenkTokenlari.surface,
  },
  revokeText: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.danger,
    fontWeight: '700',
  },
});
