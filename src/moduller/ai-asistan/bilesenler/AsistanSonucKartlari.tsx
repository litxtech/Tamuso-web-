import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { AsistanKart } from '../islemler/AiAsistanSohbet';
import { SesOdasinaGit } from '../../ses-odalari/navigasyon/SesOdasinaGit';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { YaricapTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';

type Props = {
  kartlar: AsistanKart[];
};

function tipIkon(type: AsistanKart['type']): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'room':
      return 'mic';
    case 'live':
      return 'videocam';
    case 'user':
      return 'person';
    case 'agency':
      return 'business';
    default:
      return 'sparkles';
  }
}

async function kartaGit(kart: AsistanKart) {
  if (kart.type === 'room') {
    await SesOdasinaGit({ roomId: kart.id });
    return;
  }
  if (kart.href) {
    router.push(kart.href as never);
  }
}

export function AsistanSonucKartlari({ kartlar }: Props) {
  if (!kartlar.length) return null;

  return (
    <View style={styles.wrap}>
      {kartlar.map((k) => (
        <Pressable
          key={`${k.type}-${k.id}`}
          onPress={() => void kartaGit(k)}
          style={styles.kart}
          accessibilityRole="button"
          accessibilityLabel={k.title}
        >
          {k.cover_url ? (
            <Image source={{ uri: k.cover_url }} style={styles.kapak} />
          ) : (
            <View style={styles.kapakBos}>
              <Ionicons
                name={tipIkon(k.type)}
                size={18}
                color={RenkTokenlari.mint}
              />
            </View>
          )}
          <View style={styles.metin}>
            <Text style={styles.baslik} numberOfLines={1}>
              {k.title}
            </Text>
            {k.subtitle ? (
              <Text style={styles.alt} numberOfLines={2}>
                {k.subtitle}
              </Text>
            ) : null}
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={RenkTokenlari.textDim}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    marginTop: 8,
  },
  kart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  kapak: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  kapakBos: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  metin: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  baslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
    fontSize: 14,
  },
  alt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    fontSize: 12,
  },
});
