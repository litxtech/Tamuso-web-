import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DurumVideoOnizleme } from '../../durum/bilesenler/DurumVideoOnizleme';
import { MedyaUriGuvenli } from '../yardimcilar/MedyaUriGecerliMi';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import type { DirektMesaj } from '../okuma/MesajlariGetir';

export type HikayeYanitOnizleme = {
  mediaType: 'image' | 'video' | 'text';
  thumbnailUrl: string | null;
  backgroundColor: string | null;
  storyText: string | null;
};

export function HikayeYanitCoz(item: DirektMesaj): HikayeYanitOnizleme | null {
  const meta = item.media_meta;
  if (!meta || meta.type !== 'story_reply') return null;
  const raw = meta.story_media_type;
  const mediaType =
    raw === 'video' || raw === 'text' || raw === 'image' ? raw : 'image';
  return {
    mediaType,
    thumbnailUrl:
      typeof meta.thumbnail_url === 'string' ? meta.thumbnail_url : null,
    backgroundColor:
      typeof meta.background_color === 'string' ? meta.background_color : null,
    storyText: typeof meta.story_text === 'string' ? meta.story_text : null,
  };
}

type Props = {
  mine: boolean;
  mediaType: HikayeYanitOnizleme['mediaType'];
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  backgroundColor: string | null;
  storyText: string | null;
  etiket: string;
  onPress?: () => void;
  onLongPress?: () => void;
};

/** Instagram tarzı hikâye yanıtı — küçük dikey önizleme + etiket. */
export function MesajHikayeYanitOnizleme({
  mine,
  mediaType,
  mediaUrl,
  thumbnailUrl,
  backgroundColor,
  storyText,
  etiket,
  onPress,
  onLongPress,
}: Props) {
  const [gorselHata, setGorselHata] = useState(false);
  const kucuk =
    mediaType === 'video'
      ? MedyaUriGuvenli(thumbnailUrl)
      : MedyaUriGuvenli(thumbnailUrl) ?? MedyaUriGuvenli(mediaUrl);
  const videoKare =
    mediaType === 'video' && !kucuk ? MedyaUriGuvenli(mediaUrl) : null;
  const metinKart = mediaType === 'text' || (!kucuk && !videoKare) || gorselHata;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      style={styles.kolon}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={etiket}
    >
      <View
        style={[
          styles.cerceve,
          { transform: [{ rotate: mine ? '-7deg' : '7deg' }] },
          { backgroundColor: backgroundColor ?? RenkTokenlari.deepPlum },
        ]}
      >
        {metinKart ? (
          <Text style={styles.metin} numberOfLines={6}>
            {storyText?.trim() || ' '}
          </Text>
        ) : kucuk ? (
          <Image
            source={{ uri: kucuk }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            fadeDuration={0}
            onError={() => setGorselHata(true)}
          />
        ) : videoKare ? (
          <DurumVideoOnizleme
            uri={videoKare}
            style={StyleSheet.absoluteFill}
            aktif
            mod="kare"
          />
        ) : null}
        {mediaType === 'video' && !metinKart ? (
          <View style={styles.oynat} pointerEvents="none">
            <Ionicons name="play" size={18} color="#fff" />
          </View>
        ) : null}
      </View>
      <Text style={styles.etiket} numberOfLines={1}>
        {etiket}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kolon: {
    alignItems: 'center',
    marginBottom: 2,
  },
  cerceve: {
    width: 108,
    height: 168,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  metin: {
    ...TipografiTokenlari.caption,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '700',
  },
  oynat: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  etiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    marginTop: 6,
    maxWidth: 160,
  },
});
