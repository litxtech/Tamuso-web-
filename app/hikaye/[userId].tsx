import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { OzellikBayragiAktifMi } from '../../src/moduller/ozellik-bayraklari/OzellikBayragiAktifMi';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { useCeviri } from '../../src/i18n/useCeviri';
import { HIKAYE_OZELLIK_BAYRAGI } from '../../src/moduller/hikaye/sabitler';
import { useHikayeGrup } from '../../src/moduller/hikaye/kancalar/useHikayeGrup';
import { HikayeIzleyici } from '../../src/moduller/hikaye/izleyici/HikayeIzleyici';

export default function HikayeIzleRoute() {
  const { t } = useCeviri();
  const { userId, queue } = useLocalSearchParams<{
    userId: string;
    queue?: string;
  }>();
  const acik = OzellikBayragiAktifMi(HIKAYE_OZELLIK_BAYRAGI);
  const { grup, yukleniyor, hata } = useHikayeGrup(
    acik && typeof userId === 'string' ? userId : undefined,
  );

  const kuyruk = useMemo(() => {
    if (typeof queue !== 'string' || !queue.trim()) return [];
    return queue
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }, [queue]);

  const baslangicIndex = useMemo(() => {
    if (!grup?.items?.length) return 0;
    const ilkGorulmemis = grup.items.findIndex((i) => !i.is_seen);
    return ilkGorulmemis >= 0 ? ilkGorulmemis : 0;
  }, [grup?.items]);

  const sonrakiKullanici = useMemo(() => {
    if (!userId || kuyruk.length === 0) return null;
    const i = kuyruk.indexOf(String(userId));
    if (i < 0) return kuyruk[0] ?? null;
    return kuyruk[i + 1] ?? null;
  }, [kuyruk, userId]);

  const bitti = () => {
    if (sonrakiKullanici) {
      router.replace({
        pathname: `/hikaye/${sonrakiKullanici}`,
        params: { queue: kuyruk.join(',') },
      } as any);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as any);
  };

  if (!acik) {
    return (
      <Screen koyuSahne>
        <View style={styles.orta}>
          <Text style={styles.yazi}>{t('hikaye.ozellikKapali')}</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.link}>{t('ortak.geri')}</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  if (yukleniyor) {
    return (
      <Screen koyuSahne edges={[]}>
        <View style={styles.orta}>
          <ActivityIndicator color="#fff" />
        </View>
      </Screen>
    );
  }

  if (!grup || hata) {
    return (
      <Screen koyuSahne>
        <View style={styles.orta}>
          <Text style={styles.yazi}>{hata ?? t('hikaye.bulunamadi')}</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.link}>{t('ortak.geri')}</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <ModulHataSiniri modulAdi="hikaye-route">
      <View style={styles.sahne}>
        <HikayeIzleyici
          grup={grup}
          baslangicIndex={baslangicIndex}
          onBitti={bitti}
        />
      </View>
    </ModulHataSiniri>
  );
}

const styles = StyleSheet.create({
  sahne: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    minHeight: 0,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  orta: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: '#000',
  },
  yazi: {
    ...TipografiTokenlari.body,
    color: '#fff',
    textAlign: 'center',
  },
  link: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.primary,
    fontWeight: '700',
  },
});
