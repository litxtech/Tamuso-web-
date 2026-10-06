import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../../components/Screen';
import { EkranBasligi } from '../../../../components/EkranBasligi';
import { useAuth } from '../../../../contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../yetki/AdminYetkisiVarMi';
import { AdminStil } from '../../bilesenler/AdminStil';
import {
  adminLaunchAppArchive,
  adminLaunchAppDelete,
  adminLaunchAppDuplicate,
  adminLaunchAppsList,
} from '../AdminAppLaunchApi';
import type { LaunchApp } from '../tipler';
import {
  LaunchNav,
  PlatformPills,
  StatusPill,
  appRowMeta,
  formatUpdated,
} from './LaunchUi';
import { RenkTokenlari } from '../../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../../tasarim-sistemi/BoslukVeYaricapTokenlari';

type Props = {
  filter: string;
  title: string;
  subtitle: string;
};

export function LaunchAppsList({ filter, title, subtitle }: Props) {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [apps, setApps] = useState<LaunchApp[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      setApps(await adminLaunchAppsList(filter));
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Yüklenemedi');
      setApps([]);
    } finally {
      setYukleniyor(false);
    }
  }, [filter]);

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

  const eylem = (app: LaunchApp) => {
    if (!app.id) return;
    Alert.alert(app.name, 'İşlem seçin', [
      {
        text: 'Düzenle',
        onPress: () => router.push(`/admin/app-launch/${app.id}` as any),
      },
      {
        text: 'Çoğalt',
        onPress: () => {
          Alert.prompt?.(
            'Yeni ad',
            'Kopya uygulama adı',
            async (name) => {
              try {
                const created = await adminLaunchAppDuplicate(
                  app.id!,
                  name?.trim() || `${app.name} Copy`,
                );
                router.push(`/admin/app-launch/${created.id}` as any);
              } catch (e) {
                Alert.alert('Hata', e instanceof Error ? e.message : 'Çoğaltılamadı');
              }
            },
            'plain-text',
            `${app.name} Copy`,
          );
          if (!Alert.prompt) {
            void (async () => {
              try {
                const created = await adminLaunchAppDuplicate(
                  app.id!,
                  `${app.name} Copy`,
                );
                router.push(`/admin/app-launch/${created.id}` as any);
              } catch (e) {
                Alert.alert('Hata', e instanceof Error ? e.message : 'Çoğaltılamadı');
              }
            })();
          }
        },
      },
      {
        text: 'Arşivle',
        onPress: () => {
          void (async () => {
            try {
              await adminLaunchAppArchive(app.id!);
              void yukle();
            } catch (e) {
              Alert.alert('Hata', e instanceof Error ? e.message : 'Arşivlenemedi');
            }
          })();
        },
      },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Silinsin mi?', app.name, [
            { text: 'İptal', style: 'cancel' },
            {
              text: 'Sil',
              style: 'destructive',
              onPress: () => {
                void (async () => {
                  try {
                    await adminLaunchAppDelete(app.id!);
                    void yukle();
                  } catch (e) {
                    Alert.alert('Hata', e instanceof Error ? e.message : 'Silinemedi');
                  }
                })();
              },
            },
          ]);
        },
      },
      { text: 'Vazgeç', style: 'cancel' },
    ]);
  };

  return (
    <Screen>
      <EkranBasligi title={title} subtitle={subtitle} fallbackHref="/admin" />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={<RefreshControl refreshing={yukleniyor} onRefresh={yukle} />}
      >
        <LaunchNav />

        <View style={AdminStil.hero}>
          <Text style={AdminStil.heroEyebrow}>LITXTECH</Text>
          <Text style={AdminStil.heroTitle}>{title}</Text>
          <Text style={AdminStil.heroAlt}>{subtitle}</Text>
        </View>

        {hata ? <Text style={{ color: RenkTokenlari.danger }}>{hata}</Text> : null}

        {yukleniyor && apps.length === 0 ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : apps.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyT}>Henüz uygulama yok</Text>
            <Pressable
              style={styles.cta}
              onPress={() => router.push('/admin/app-launch/create')}
            >
              <Ionicons name="add" size={16} color={RenkTokenlari.text} />
              <Text style={styles.ctaT}>Create App</Text>
            </Pressable>
          </View>
        ) : (
          apps.map((app) => (
            <Pressable
              key={app.id || app.slug}
              style={styles.row}
              onPress={() =>
                app.id
                  ? router.push(`/admin/app-launch/${app.id}` as any)
                  : undefined
              }
              onLongPress={() => eylem(app)}
            >
              {app.icon_url ? (
                <Image source={{ uri: app.icon_url }} style={styles.icon} />
              ) : (
                <View style={[styles.icon, styles.iconPh]}>
                  <Ionicons name="rocket-outline" size={22} color={RenkTokenlari.textDim} />
                </View>
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <View style={styles.topLine}>
                  <Text style={styles.name} numberOfLines={1}>
                    {app.name}
                  </Text>
                  <StatusPill status={app.status} />
                </View>
                <PlatformPills platforms={app.platforms} />
                <Text style={styles.meta} numberOfLines={1}>
                  {appRowMeta(app)} · {formatUpdated(app.updated_at)}
                </Text>
              </View>
              <Pressable onPress={() => eylem(app)} hitSlop={10}>
                <Ionicons
                  name="ellipsis-vertical"
                  size={18}
                  color={RenkTokenlari.textMuted}
                />
              </Pressable>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.md,
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  iconPh: {
    backgroundColor: RenkTokenlari.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
    flex: 1,
  },
  meta: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  empty: {
    padding: BoslukTokenlari.xl,
    alignItems: 'center',
    gap: 12,
  },
  emptyT: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.borderAccent,
  },
  ctaT: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
});
