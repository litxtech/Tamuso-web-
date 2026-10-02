import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useCeviri } from '../../../i18n/useCeviri';
import { DuyuruAnaSayfaGetir } from '../islemler/DuyuruIslemleri';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari, YaricapTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';

type Oge = Awaited<ReturnType<typeof DuyuruAnaSayfaGetir>>[number];

/** Ana sayfa yerleşimi. Mevcut TamusoBanner'ın yanında, aynı ekranda, detaya gider. */
export function DuyuruAnaSayfaSeridi() {
  const { dil } = useCeviri();
  const [ogeler, setOgeler] = useState<Oge[]>([]);

  useEffect(() => {
    void DuyuruAnaSayfaGetir(dil).then(setOgeler);
  }, [dil]);

  if (ogeler.length === 0) return null;
  const carousel = ogeler.some((o) => o.home_display === 'CAROUSEL');
  const govde = ogeler.map((o) => (
    <Pressable
      key={o.id}
      style={[
        styles.kart,
        o.home_display === 'BANNER' ? styles.banner : null,
        { borderColor: o.theme_color ?? RenkTokenlari.border },
      ]}
      onPress={() => router.push(`/duyuru/${o.id}` as never)}
    >
      {o.thumbnail_url ? <Image source={{ uri: o.thumbnail_url }} style={styles.gorsel} /> : null}
      <View style={styles.yazi}>
        <Text style={styles.baslik} numberOfLines={1}>{o.title}</Text>
        {o.summary ? <Text style={styles.ozet} numberOfLines={2}>{o.summary}</Text> : null}
      </View>
    </Pressable>
  ));

  if (carousel) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serit}>
        {govde}
      </ScrollView>
    );
  }
  return <View style={styles.kolon}>{govde}</View>;
}

const styles = StyleSheet.create({
  kolon: { gap: BoslukTokenlari.sm, paddingHorizontal: BoslukTokenlari.lg },
  serit: { gap: BoslukTokenlari.sm, paddingHorizontal: BoslukTokenlari.lg },
  kart: {
    borderWidth: 1,
    borderRadius: YaricapTokenlari.md,
    overflow: 'hidden',
    backgroundColor: RenkTokenlari.bgCard,
    width: 260,
  },
  banner: { width: '100%' },
  gorsel: { width: '100%', height: 88 },
  yazi: { padding: BoslukTokenlari.sm, gap: 2 },
  baslik: { ...TipografiTokenlari.body, color: RenkTokenlari.text, fontWeight: '700' },
  ozet: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
});
