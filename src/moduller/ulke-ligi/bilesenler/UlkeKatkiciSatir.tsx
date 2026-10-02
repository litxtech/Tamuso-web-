import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { ulkePuanKisa } from '../utils/UlkeLigiFormat';
import { useCeviri } from '../../../i18n/useCeviri';
import type { UlkeKatkici } from '../tipler';

type Props = {
  satir: UlkeKatkici;
  onPress?: () => void;
};

export function UlkeKatkiciSatir({ satir, onPress }: Props) {
  const { t } = useCeviri();
  const ad = satir.anonymous
    ? t('ulkeLigi.anonimKatkici')
    : satir.display_name?.trim() || t('ulkeLigi.anonimKatkici');
  const basilebilir = !!onPress && !satir.anonymous && !!satir.user_id;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && basilebilir && styles.pressed]}
      onPress={basilebilir ? onPress : undefined}
      disabled={!basilebilir}
      accessibilityRole={basilebilir ? 'button' : undefined}
    >
      <Text style={styles.rank}>
        {satir.rank != null ? `#${satir.rank}` : '—'}
      </Text>
      {satir.avatar_url && !satir.anonymous ? (
        <Image source={{ uri: satir.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarBos]}>
          <Ionicons name="person" size={16} color={RenkTokenlari.textDim} />
        </View>
      )}
      <Text style={styles.name} numberOfLines={1}>
        {ad}
      </Text>
      <Text style={styles.points}>{ulkePuanKisa(satir.points)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  pressed: { opacity: 0.88 },
  rank: {
    width: 36,
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '800',
    textAlign: 'center',
    writingDirection: 'ltr',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: RenkTokenlari.bgElevated,
  },
  avatarBos: { alignItems: 'center', justifyContent: 'center' },
  name: {
    flex: 1,
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '600',
    minWidth: 0,
  },
  points: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '800',
    writingDirection: 'ltr',
  },
});
