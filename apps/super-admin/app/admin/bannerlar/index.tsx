import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../../../../src/components/Screen';
import { EkranBasligi } from '../../../../../src/components/EkranBasligi';
import { GradientButton } from '../../../../../src/components/GradientButton';
import { useAuth } from '../../../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { BannerAdminService } from '../../../../../src/banner/admin/BannerAdminService';
import {
  BANNER_STATUS_LABELS,
} from '../../../../../src/banner/admin/BannerAdminTypes';
import type { BannerCampaign, BannerStatus } from '../../../../../src/banner/core/BannerTypes';
import { RenkTokenlari } from '../../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { AdminStil } from '../../../../../src/moduller/admin/bilesenler/AdminStil';

export default function AdminBannerlarEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [liste, setListe] = useState<BannerCampaign[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  const load = useCallback(async () => {
    setYukleniyor(true);
    try {
      const kampanyalar = await BannerAdminService.list();
      setListe(kampanyalar);
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Liste alınamadı');
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
      void load();
    }, [admin, load]),
  );

  const setStatus = async (id: string, status: BannerStatus) => {
    try {
      await BannerAdminService.setStatus(id, status);
      await load();
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Durum güncellenemedi');
    }
  };

  const duplicate = async (id: string) => {
    try {
      const newId = await BannerAdminService.duplicate(id);
      router.push(`/admin/bannerlar/${newId}` as never);
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Kopyalanamadı');
    }
  };

  const archive = (id: string) => {
    Alert.alert('Arşivle', 'Banner arşivlensin mi? Analitik korunur.', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Arşivle',
        style: 'destructive',
        onPress: () => void setStatus(id, 'ARCHIVED'),
      },
    ]);
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Bannerlar"
        subtitle="Kampanya · yerleştirme · analitik"
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
        <View style={styles.sekme}>
          <Pressable style={[styles.sekmeBtn, styles.sekmeAktif]}>
            <Text style={[styles.sekmeYazi, styles.sekmeYaziAktif]}>
              Kampanyalar
            </Text>
          </Pressable>
          <Pressable
            style={styles.sekmeBtn}
            onPress={() => router.push('/admin/bannerlar/otomatik' as never)}
          >
            <Text style={styles.sekmeYazi}>Otomatik</Text>
          </Pressable>
        </View>

        <GradientButton
          title="Yeni banner"
          onPress={() => router.push('/admin/bannerlar/yeni' as never)}
        />

        {yukleniyor && liste.length === 0 ? (
          <ActivityIndicator color={RenkTokenlari.primary} />
        ) : null}

        {liste.map((b) => {
          const ctr =
            (b.impression_count ?? 0) > 0
              ? (
                  ((b.click_count ?? 0) / (b.impression_count ?? 1)) *
                  100
                ).toFixed(1)
              : '0';
          return (
            <Pressable
              key={b.id}
              style={styles.card}
              onPress={() => router.push(`/admin/bannerlar/${b.id}` as never)}
            >
              <View style={styles.cardTop}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {b.name}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {b.title || b.internal_name || b.media_type}
                  </Text>
                </View>
                <View
                  style={[
                    styles.status,
                    b.status === 'ACTIVE' && styles.statusActive,
                    b.status === 'PAUSED' && styles.statusPaused,
                    b.status === 'DRAFT' && styles.statusDraft,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {BANNER_STATUS_LABELS[b.status]}
                  </Text>
                </View>
              </View>

              <Text style={styles.stats}>
                {(b.placements ?? [])
                  .map((p) => p.placement_key)
                  .slice(0, 3)
                  .join(' · ') || 'Placement yok'}
              </Text>
              <Text style={styles.stats}>
                {b.impression_count ?? 0} gösterim · {b.click_count ?? 0} tık · CTR{' '}
                {ctr}%
              </Text>

              <View style={styles.actions}>
                {b.status === 'ACTIVE' ? (
                  <ActionChip
                    icon="pause"
                    label="Durdur"
                    onPress={() => void setStatus(b.id, 'PAUSED')}
                  />
                ) : b.status !== 'ARCHIVED' ? (
                  <ActionChip
                    icon="play"
                    label="Aktif"
                    onPress={() => void setStatus(b.id, 'ACTIVE')}
                  />
                ) : null}
                <ActionChip
                  icon="copy-outline"
                  label="Kopyala"
                  onPress={() => void duplicate(b.id)}
                />
                <ActionChip
                  icon="stats-chart-outline"
                  label="Analitik"
                  onPress={() =>
                    router.push(`/admin/bannerlar/${b.id}?tab=analytics` as never)
                  }
                />
                <ActionChip
                  icon="archive-outline"
                  label="Arşiv"
                  onPress={() => archive(b.id)}
                />
              </View>
            </Pressable>
          );
        })}

        {!yukleniyor && liste.length === 0 ? (
          <Text style={styles.empty}>Henüz banner yok. İlk kampanyayı oluştur.</Text>
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
    <Pressable style={styles.chip} onPress={onPress}>
      <Ionicons name={icon} size={14} color={RenkTokenlari.text} />
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sekme: {
    flexDirection: 'row',
    gap: 8,
  },
  sekmeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.md,
    alignItems: 'center',
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  sekmeAktif: {
    backgroundColor: 'rgba(232,64,145,0.22)',
    borderColor: RenkTokenlari.borderAccent,
  },
  sekmeYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  sekmeYaziAktif: {
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
  status: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: RenkTokenlari.surface,
  },
  statusActive: {
    backgroundColor: 'rgba(61,207,176,0.2)',
  },
  statusPaused: {
    backgroundColor: 'rgba(240,180,41,0.2)',
  },
  statusDraft: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statusText: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  stats: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: RenkTokenlari.surface,
  },
  chipText: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.text,
  },
  empty: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
    marginTop: BoslukTokenlari.xl,
  },
});
