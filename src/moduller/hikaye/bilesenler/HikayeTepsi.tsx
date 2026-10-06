import React, { useCallback } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { BoslukTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import { HIKAYE_TEPSI_YUKSEKLIK } from '../sabitler';
import type { HikayeTepsiOgesi } from '../tipler';
import { useHikayeTepsi } from '../kancalar/useHikayeTepsi';
import { HikayeAnalitik } from '../islemler/HikayeAnalitik';
import { HikayeTepsiAvatar } from './HikayeTepsiAvatar';
import { HikayeTepsiSkeleton } from './HikayeTepsiSkeleton';

type Props = {
  enabled?: boolean;
};

/**
 * Ana sayfa hikaye tepsi.
 * Instagram: kendi halka tap=izle, +=yeni; boşsa tap=oluştur.
 * Sıra: kendi → izlenmeyenler → izlenenler.
 */
export function HikayeTepsi({ enabled = true }: Props) {
  const { t } = useCeviri();
  const { enabled: bayrakAcik, ogeler, yukleniyor } = useHikayeTepsi({
    enabled,
  });

  const olusturAc = useCallback(() => {
    HikayeAnalitik('story_create_open', { source: 'tray_plus' });
    router.push('/hikaye/olustur' as any);
  }, []);

  const izleAc = useCallback(
    (oge: HikayeTepsiOgesi) => {
      HikayeAnalitik('story_tray_tap', {
        is_mine: oge.is_mine,
        has_unseen: oge.has_unseen,
      });

      if (oge.is_mine) {
        router.push(`/hikaye/${oge.user_id}` as any);
        return;
      }

      // Tıklanan kullanıcıdan itibaren tepsi sırası (izlenmeyenler zaten başta)
      const diger = ogeler.filter((o) => !o.is_mine && o.item_count > 0);
      const idx = diger.findIndex((o) => o.user_id === oge.user_id);
      const kuyruk = diger
        .slice(idx >= 0 ? idx : 0)
        .map((o) => o.user_id);

      router.push({
        pathname: `/hikaye/${oge.user_id}`,
        params: { queue: kuyruk.join(',') },
      } as any);
    },
    [ogeler],
  );

  const bas = useCallback(
    (oge: HikayeTepsiOgesi) => {
      if (oge.is_mine && oge.item_count <= 0) {
        olusturAc();
        return;
      }
      izleAc(oge);
    },
    [olusturAc, izleAc],
  );

  const uzunBas = useCallback(
    (oge: HikayeTepsiOgesi) => {
      if (!oge.is_mine) {
        router.push(`/kullanici/${oge.user_id}` as any);
        return;
      }
      if (oge.item_count <= 0) {
        olusturAc();
        return;
      }
      Alert.alert(t('hikaye.benimHikayem'), undefined, [
        {
          text: t('hikaye.izle'),
          onPress: () => izleAc(oge),
        },
        {
          text: t('hikaye.yeniEkle'),
          onPress: olusturAc,
        },
        { text: t('ortak.vazgec'), style: 'cancel' },
      ]);
    },
    [t, olusturAc, izleAc],
  );

  if (!bayrakAcik) return null;

  if (yukleniyor && ogeler.length === 0) {
    return <HikayeTepsiSkeleton />;
  }

  if (ogeler.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <FlatList
        data={ogeler}
        keyExtractor={(item) => item.user_id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.liste}
        initialNumToRender={8}
        windowSize={5}
        renderItem={({ item }) => (
          <HikayeTepsiAvatar
            avatarUrl={item.avatar_url}
            previewUrl={item.preview_url}
            etiket={item.display_name}
            hasUnseen={item.has_unseen}
            isMine={item.is_mine}
            bosMu={item.is_mine && item.item_count <= 0}
            onPress={() => bas(item)}
            onCreatePress={item.is_mine ? olusturAc : undefined}
            onLongPress={() => uzunBas(item)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: HIKAYE_TEPSI_YUKSEKLIK,
    marginBottom: 4,
  },
  liste: {
    paddingHorizontal: BoslukTokenlari.md,
    alignItems: 'center',
    gap: 8,
  },
});
