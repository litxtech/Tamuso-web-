import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../../components/Screen';
import { EkranBasligi } from '../../../components/EkranBasligi';
import { BosDurum } from '../../../components/BosDurum';
import { ModulHataSiniri } from '../../../ortak/hata-sinirlari/ModulHataSiniri';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { TakipciKarti } from '../bilesenler/TakipciKarti';
import { TakipServisi } from '../islemler/TakipServisi';
import type { TakipKullaniciKarti, TakipListeImleci } from '../TakipTipleri';
import { useCeviri } from '../../../i18n/useCeviri';

export function OrtakTakipcilerEkrani({ userId }: { userId: string }) {
  const { t } = useCeviri();
  const [items, setItems] = useState<TakipKullaniciKarti[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [daha, setDaha] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const cursorRef = useRef<TakipListeImleci | null>(null);
  const busyRef = useRef(false);

  const yukle = useCallback(async (reset: boolean) => {
    if (!userId || busyRef.current) return;
    if (!reset && !cursorRef.current) return;
    busyRef.current = true;
    if (reset) {
      setYukleniyor(true);
      setHata(null);
      cursorRef.current = null;
    } else {
      setDaha(true);
    }
    try {
      const sayfa = await TakipServisi.ortakListe({
        targetUserId: userId,
        cursor: reset ? null : cursorRef.current,
      });
      cursorRef.current = sayfa.next_cursor;
      setItems((prev) => (reset ? sayfa.items : [...prev, ...sayfa.items]));
    } catch (e) {
      setHata(e instanceof Error ? e.message : t('takip.listeAlinamadi'));
    } finally {
      busyRef.current = false;
      setYukleniyor(false);
      setDaha(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void yukle(true);
    }, [yukle]),
  );

  return (
    <ModulHataSiniri modulAdi="Ortak takip">
      <Screen edges={['top']}>
        <EkranBasligi
          title={t('takip.ortakBaslik')}
          subtitle={t('takip.ortakAlt')}
          fallbackHref={`/kullanici/${userId}` as any}
        />
        {yukleniyor && items.length === 0 ? (
          <ActivityIndicator
            style={{ marginTop: 40 }}
            color={RenkTokenlari.primarySoft}
          />
        ) : hata && items.length === 0 ? (
          <Text style={styles.hata}>{hata}</Text>
        ) : items.length === 0 ? (
          <BosDurum
            title={t('takip.ortakYok')}
            body={t('takip.ortakYokBody')}
          />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(k) => k.user_id}
            contentContainerStyle={styles.liste}
            onEndReached={() => {
              if (cursorRef.current && !busyRef.current) void yukle(false);
            }}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              daha ? (
                <ActivityIndicator
                  color={RenkTokenlari.primarySoft}
                  style={{ marginVertical: 16 }}
                />
              ) : null
            }
            renderItem={({ item }) => (
              <TakipciKarti
                kart={item}
                hideFollow
                onPress={() => router.push(`/kullanici/${item.user_id}` as any)}
              />
            )}
          />
        )}
      </Screen>
    </ModulHataSiniri>
  );
}

const styles = StyleSheet.create({
  liste: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingBottom: BoslukTokenlari.xxxl,
    gap: BoslukTokenlari.sm,
  },
  hata: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.danger,
    textAlign: 'center',
    marginTop: BoslukTokenlari.xl,
    paddingHorizontal: BoslukTokenlari.lg,
  },
});
