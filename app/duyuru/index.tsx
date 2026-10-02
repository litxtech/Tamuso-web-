import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { BosDurum } from '../../src/components/BosDurum';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { useCeviri } from '../../src/i18n/useCeviri';
import { DuyuruListesiGetir } from '../../src/moduller/duyurular/islemler/DuyuruIslemleri';
import { DuyuruOlayEkle } from '../../src/moduller/duyurular/islemler/DuyuruOlayKuyrugu';
import type { DuyuruKart } from '../../src/moduller/duyurular/tipler';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari, YaricapTokenlari } from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useTemayaAboneOl } from '../../src/tasarim-sistemi/tema/useTemayaAboneOl';

const FILTRELER = [
  { id: 'all', key: 'duyuru.filtreTumu' },
  { id: 'important', key: 'duyuru.filtreOnemli' },
  { id: 'feature', key: 'duyuru.filtreYenilik' },
  { id: 'event', key: 'duyuru.filtreEtkinlik' },
] as const;

function goreli(iso: string, t: (k: 'duyuru.azOnce' | 'duyuru.saatOnce' | 'duyuru.gunOnce', o?: Record<string, unknown>) => string) {
  const fark = Date.now() - new Date(iso).getTime();
  if (fark < 3_600_000) return t('duyuru.azOnce');
  if (fark < 86_400_000) return t('duyuru.saatOnce', { n: Math.floor(fark / 3_600_000) });
  return t('duyuru.gunOnce', { n: Math.floor(fark / 86_400_000) });
}

export default function DuyuruEkrani() {
  useTemayaAboneOl();
  const { t, dil } = useCeviri();
  const [filtre, setFiltre] = useState('all');
  const [items, setItems] = useState<DuyuruKart[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  const yukle = useCallback(
    async (devam = false) => {
      setYukleniyor(true);
      try {
        const r = await DuyuruListesiGetir({
          locale: dil,
          filter: filtre,
          cursor: devam ? cursor : null,
        });
        setItems((once) => (devam ? [...once, ...r.items] : r.items));
        setCursor(r.next);
      } catch {
        if (!devam) setItems([]);
      } finally {
        setYukleniyor(false);
      }
    },
    [cursor, dil, filtre],
  );

  useFocusEffect(
    useCallback(() => {
      void yukle(false);
    }, [dil, filtre]),
  );

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri modulAdi="duyurular">
        <EkranBasligi title={t('duyuru.baslik')} />
        <View style={styles.filtreler}>
          {FILTRELER.map((f) => {
            const secili = filtre === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setFiltre(f.id)}
                style={[styles.cip, secili && styles.cipSecili]}
              >
                <Text style={[styles.cipYazi, secili && styles.cipYaziSecili]}>{t(f.key)}</Text>
              </Pressable>
            );
          })}
        </View>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.liste}
          onEndReached={() => {
            if (cursor && !yukleniyor) void yukle(true);
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            yukleniyor ? (
              <ActivityIndicator color={RenkTokenlari.primarySoft} />
            ) : (
              <BosDurum icon="megaphone-outline" title={t('duyuru.yok')} body={t('duyuru.yokBody')} />
            )
          }
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          onViewableItemsChanged={({ viewableItems }) => {
            for (const v of viewableItems) {
              const id = (v.item as DuyuruKart | undefined)?.id;
              if (id) DuyuruOlayEkle({ announcement_id: id, event_type: 'IMPRESSION' });
            }
          }}
          renderItem={({ item }) => (
            <DuyuruKarti
              item={item}
              zaman={goreli(item.publish_at, t)}
              yeni={t('duyuru.yeni')}
            />
          )}
        />
      </ModulHataSiniri>
    </Screen>
  );
}

function DuyuruKarti({
  item,
  zaman,
  yeni,
}: {
  item: DuyuruKart;
  zaman: string;
  yeni: string;
}) {
  return (
    <Pressable
      style={styles.kart}
      onPress={() => router.push(`/duyuru/${item.id}` as never)}
    >
      {item.cover?.kind === 'IMAGE' && item.cover.thumbnail_url ? (
        <Image source={{ uri: item.cover.thumbnail_url }} style={styles.gorsel} />
      ) : null}
      {item.cover?.kind === 'VIDEO' ? (
        <View style={styles.gorsel}>
          {item.cover.thumbnail_url ? (
            <Image source={{ uri: item.cover.thumbnail_url }} style={styles.gorsel} />
          ) : null}
          <View style={styles.oynat}>
            <Ionicons name="play" size={16} color="#fff" />
          </View>
        </View>
      ) : null}
      {item.cover && (item.cover.kind === 'AUDIO' || item.cover.kind === 'VOICE_RECORDING') ? (
        <View style={styles.ses}>
          <Ionicons name="mic-outline" size={16} color={RenkTokenlari.text} />
        </View>
      ) : null}
      <Text style={[styles.kategori, { color: item.theme_color ?? RenkTokenlari.accent }]}>
        {(item.category_name ?? item.category_code ?? '').toUpperCase()}
      </Text>
      <Text style={styles.baslik}>{item.title}</Text>
      {item.summary ? <Text style={styles.ozet}>{item.summary}</Text> : null}
      <View style={styles.alt}>
        <Text style={styles.zaman}>{zaman}</Text>
        {item.unread ? <Text style={styles.yeni}>● {yeni}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filtreler: {
    flexDirection: 'row',
    gap: BoslukTokenlari.sm,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingBottom: BoslukTokenlari.md,
  },
  cip: {
    paddingHorizontal: BoslukTokenlari.md,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  cipSecili: { backgroundColor: RenkTokenlari.primarySoft, borderColor: 'transparent' },
  cipYazi: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
  cipYaziSecili: { color: '#fff' },
  liste: { paddingHorizontal: BoslukTokenlari.lg, paddingBottom: BoslukTokenlari.xxxl, gap: BoslukTokenlari.md },
  kart: {
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    gap: 6,
  },
  gorsel: { width: '100%', height: 140, borderRadius: YaricapTokenlari.sm, backgroundColor: '#111' },
  oynat: {
    position: 'absolute',
    alignSelf: 'center',
    top: 52,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ses: { alignSelf: 'flex-start' },
  kategori: { ...TipografiTokenlari.caption, fontWeight: '700', letterSpacing: 0.4 },
  baslik: { ...TipografiTokenlari.h2, color: RenkTokenlari.text },
  ozet: { ...TipografiTokenlari.body, color: RenkTokenlari.textMuted },
  alt: { flexDirection: 'row', justifyContent: 'space-between' },
  zaman: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
  yeni: { ...TipografiTokenlari.caption, color: RenkTokenlari.accent },
});
