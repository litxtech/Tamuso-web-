import React, { useCallback, useMemo, useState } from 'react';
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
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { useAuth } from '../../src/contexts/AuthContext';
import { useCeviri } from '../../src/i18n/useCeviri';
import { useKullaniciUnvanlari } from '../../src/moduller/unvanlar/kancalar/useKullaniciUnvanlari';
import {
  UnvanGizle,
  UnvanSec,
} from '../../src/moduller/unvanlar/islemler/UnvanKullaniciIslemleri';
import { UserTitleBadge } from '../../src/moduller/unvanlar/bilesenler/UserTitleBadge';
import type { UnvanAtama } from '../../src/moduller/unvanlar/tipler';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  HeaderTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { YUZEN_TAB_ICERIK_BOSLUGU } from '../../src/components/YuzenTabBar';

export default function UnvanlarimEkrani() {
  const { t } = useCeviri();
  const { user } = useAuth();
  const { veri, yukleniyor, yenile } = useKullaniciUnvanlari({
    userId: user?.id,
  });
  const [busyId, setBusyId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      yenile();
    }, [yenile]),
  );

  const { aktif, diger } = useMemo(() => {
    const items = veri?.items ?? [];
    const selected = veri?.selected_title_id ?? veri?.display_title_id ?? null;
    const a: UnvanAtama[] = [];
    const d: UnvanAtama[] = [];
    for (const it of items) {
      if (!it.currently_valid) continue;
      if (selected && it.title_id === selected) a.push(it);
      else d.push(it);
    }
    return { aktif: a, diger: d };
  }, [veri]);

  const sec = async (titleId: string) => {
    setBusyId(titleId);
    try {
      const res = await UnvanSec(titleId);
      if (!res.ok) {
        Alert.alert(t('ortak.hata'), res.hata ?? t('unvanlar.secilemedi'));
        return;
      }
      yenile();
    } finally {
      setBusyId(null);
    }
  };

  const gizle = async () => {
    setBusyId('hide');
    try {
      const res = await UnvanGizle();
      if (!res.ok) {
        Alert.alert(t('ortak.hata'), res.hata ?? t('unvanlar.gizlenemedi'));
        return;
      }
      yenile();
    } finally {
      setBusyId(null);
    }
  };

  const seciliKilitli = aktif.some((a) => a.selection_locked);

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri modulAdi="ayarlar-unvanlarim">
        <EkranBasligi
          title={t('unvanlar.unvanlarim')}
          subtitle={t('unvanlar.alt')}
          fallbackHref="/ayarlar"
          onBack={() => router.back()}
        />
        <ScrollView
          contentContainerStyle={styles.icerik}
          refreshControl={
            <RefreshControl
              refreshing={yukleniyor}
              onRefresh={yenile}
              tintColor={RenkTokenlari.primary}
            />
          }
        >
          {yukleniyor && !veri ? (
            <ActivityIndicator color={RenkTokenlari.primary} />
          ) : null}

          {veri && !veri.enabled ? (
            <Text style={styles.bos}>{t('unvanlar.kapali')}</Text>
          ) : null}

          {aktif.length > 0 ? (
            <View style={styles.bolum}>
              <Text style={styles.bolumBaslik}>{t('unvanlar.aktif')}</Text>
              {aktif.map((it) => (
                <Kart
                  key={it.assignment_id}
                  item={it}
                  selected
                  busy={busyId === it.title_id}
                  onSelect={() => void sec(it.title_id)}
                />
              ))}
              {!seciliKilitli ? (
                <Pressable
                  style={styles.gizleBtn}
                  onPress={() => void gizle()}
                  disabled={busyId === 'hide'}
                >
                  <Text style={styles.gizleYazi}>{t('unvanlar.gizle')}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <View style={styles.bolum}>
            <Text style={styles.bolumBaslik}>{t('unvanlar.diger')}</Text>
            {diger.length === 0 && aktif.length === 0 ? (
              <Text style={styles.bos}>{t('unvanlar.bos')}</Text>
            ) : null}
            {diger.map((it) => (
              <Kart
                key={it.assignment_id}
                item={it}
                selected={false}
                busy={busyId === it.title_id}
                locked={it.selection_locked}
                onSelect={() => {
                  if (it.selection_locked) {
                    Alert.alert(t('unvanlar.kilitli'), t('unvanlar.kilitliAciklama'));
                    return;
                  }
                  void sec(it.title_id);
                }}
              />
            ))}
          </View>

          <View style={{ height: YUZEN_TAB_ICERIK_BOSLUGU }} />
        </ScrollView>
      </ModulHataSiniri>
    </Screen>
  );
}

function Kart({
  item,
  selected,
  busy,
  locked,
  onSelect,
}: {
  item: UnvanAtama;
  selected: boolean;
  busy: boolean;
  locked?: boolean;
  onSelect: () => void;
}) {
  const { t } = useCeviri();
  return (
    <Pressable
      style={[styles.kart, selected && styles.kartAktif]}
      onPress={onSelect}
      disabled={busy}
    >
      <UserTitleBadge design={item.design} label={item.name} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.kartAd} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.kartAlt}>
          {selected
            ? t('unvanlar.profildeGosteriliyor')
            : locked
              ? t('unvanlar.kilitli')
              : t('unvanlar.profildeGoster')}
        </Text>
      </View>
      {busy ? <ActivityIndicator color={RenkTokenlari.primary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  icerik: {
    paddingHorizontal: HeaderTokenlari.horizontal,
    paddingTop: HeaderTokenlari.contentGap,
    paddingBottom: BoslukTokenlari.xxl,
    gap: BoslukTokenlari.md,
  },
  bolum: {
    gap: 10,
  },
  bolumBaslik: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  kart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },
  kartAktif: {
    borderColor: RenkTokenlari.borderAccent,
    backgroundColor: 'rgba(232,64,145,0.12)',
  },
  kartAd: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  kartAlt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  gizleBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.sm,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.surface,
  },
  gizleYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  bos: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
    paddingVertical: BoslukTokenlari.lg,
  },
});
