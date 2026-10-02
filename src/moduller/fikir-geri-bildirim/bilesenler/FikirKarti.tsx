import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { FikirDurumRozeti } from './FikirDurumRozeti';
import type { FikirOzet } from '../tipler';
import { useCeviri } from '../../../i18n/useCeviri';
import { DIL_LOCALE_MAP } from '../../../i18n/diller';

function tarihKisa(iso: string, locale: string) {
  try {
    return new Date(iso).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function FikirKarti({
  item,
  onPress,
  showVotes,
}: {
  item: FikirOzet;
  onPress: () => void;
  showVotes?: boolean;
}) {
  const { dil } = useCeviri();
  const locale = DIL_LOCALE_MAP[dil];

  return (
    <Pressable style={styles.kart} onPress={onPress}>
      <View style={styles.ust}>
        <View style={styles.kat}>
          <Ionicons
            name={(item.category.icon as keyof typeof Ionicons.glyphMap) || 'bulb-outline'}
            size={14}
            color={RenkTokenlari.primarySoft}
          />
          <Text style={styles.katYazi} numberOfLines={1}>
            {item.category.name}
          </Text>
        </View>
        <FikirDurumRozeti status={item.status} />
      </View>
      <Text style={styles.baslik} numberOfLines={2}>
        {item.title}
      </Text>
      <View style={styles.alt}>
        <Text style={styles.tarih}>{tarihKisa(item.created_at, locale)}</Text>
        {showVotes ? (
          <View style={styles.oy}>
            <Ionicons name="bulb-outline" size={14} color={RenkTokenlari.accent} />
            <Text style={styles.oyYazi}>
              {item.vote_count.toLocaleString(locale)}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kart: {
    backgroundColor: RenkTokenlari.surface,
    borderRadius: YaricapTokenlari.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    padding: BoslukTokenlari.md,
    gap: 8,
  },
  ust: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  kat: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  katYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    flexShrink: 1,
  },
  baslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '600',
  },
  alt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tarih: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
  oy: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  oyYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.accent,
    fontWeight: '600',
  },
});
