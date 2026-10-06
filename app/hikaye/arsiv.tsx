import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { OzellikBayragiAktifMi } from '../../src/moduller/ozellik-bayraklari/OzellikBayragiAktifMi';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../src/i18n/useCeviri';
import { HIKAYE_OZELLIK_BAYRAGI } from '../../src/moduller/hikaye/sabitler';
import type { HikayeArsivOgesi } from '../../src/moduller/hikaye/tipler';
import { HikayeArsivListesi } from '../../src/moduller/hikaye/islemler/HikayeIslemleri';
import { HikayeAnalitik } from '../../src/moduller/hikaye/islemler/HikayeAnalitik';
import { HikayeZamanMetni } from '../../src/moduller/hikaye/islemler/HikayeZaman';

export default function HikayeArsivRoute() {
  const { t } = useCeviri();
  const acik = OzellikBayragiAktifMi(HIKAYE_OZELLIK_BAYRAGI);
  const [items, setItems] = useState<HikayeArsivOgesi[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [daha, setDaha] = useState(false);

  const yukle = useCallback(async (next?: string | null) => {
    if (next) setDaha(true);
    else setYukleniyor(true);
    const r = await HikayeArsivListesi({ cursor: next ?? null, limit: 30 });
    setYukleniyor(false);
    setDaha(false);
    if (!r.ok) return;
    setItems((prev) => (next ? [...prev, ...r.data.items] : r.data.items));
    setCursor(r.data.nextCursor);
  }, []);

  useEffect(() => {
    if (!acik) return;
    HikayeAnalitik('story_archive_open');
    void yukle();
  }, [acik, yukle]);

  if (!acik) {
    return (
      <Screen>
        <EkranBasligi title={t('hikaye.arsiv')} onBack={() => router.back()} />
        <Text style={styles.bos}>{t('hikaye.ozellikKapali')}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ModulHataSiniri modulAdi="hikaye-arsiv">
        <EkranBasligi title={t('hikaye.arsiv')} onBack={() => router.back()} />
        {yukleniyor ? (
          <ActivityIndicator
            color={RenkTokenlari.primary}
            style={{ marginTop: 40 }}
          />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            numColumns={3}
            contentContainerStyle={styles.liste}
            ListEmptyComponent={
              <Text style={styles.bos}>{t('hikaye.arsivBos')}</Text>
            }
            onEndReached={() => {
              if (cursor && !daha) void yukle(cursor);
            }}
            renderItem={({ item }) => (
              <View style={styles.hucre}>
                {item.media_url ? (
                  <Image source={{ uri: item.media_url }} style={styles.img} />
                ) : (
                  <View
                    style={[
                      styles.img,
                      {
                        backgroundColor:
                          item.background_color ?? RenkTokenlari.surface,
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 6,
                      },
                    ]}
                  >
                    <Text style={styles.metin} numberOfLines={4}>
                      {item.caption ?? ''}
                    </Text>
                  </View>
                )}
                <Text style={styles.meta} numberOfLines={1}>
                  {HikayeZamanMetni(item.created_at)} · {item.view_count}
                </Text>
              </View>
            )}
          />
        )}
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  liste: {
    padding: BoslukTokenlari.sm,
    gap: 4,
  },
  hucre: {
    flex: 1 / 3,
    aspectRatio: 9 / 16,
    margin: 2,
    borderRadius: YaricapTokenlari.sm,
    overflow: 'hidden',
    backgroundColor: RenkTokenlari.surface,
  },
  img: { flex: 1, width: '100%' },
  metin: {
    ...TipografiTokenlari.micro,
    color: '#fff',
    textAlign: 'center',
  },
  meta: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    padding: 4,
  },
  bos: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textDim,
    textAlign: 'center',
    marginTop: 48,
    paddingHorizontal: 24,
  },
});
