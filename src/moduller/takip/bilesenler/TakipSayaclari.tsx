import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { TakipSayaciniFormatla } from '../TakipSayacFormat';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  /** null = gizli (—) */
  posts: number | null;
  followers: number | null;
  following: number | null;
  onPosts?: () => void;
  onFollowers?: () => void;
  onFollowing?: () => void;
};

function Hucre({
  n,
  label,
  locale,
  onPress,
}: {
  n: number | null;
  label: string;
  locale: string;
  onPress?: () => void;
}) {
  const yazi = n == null ? '—' : TakipSayaciniFormatla(n, locale);
  const tiklanabilir = n != null && !!onPress;
  return (
    <Pressable
      onPress={onPress}
      disabled={!tiklanabilir}
      accessibilityRole={tiklanabilir ? 'button' : 'text'}
      accessibilityLabel={`${yazi} ${label}`}
      style={({ pressed }) => [
        styles.hucre,
        pressed && tiklanabilir ? styles.pressed : null,
      ]}
    >
      <Text style={styles.n}>{yazi}</Text>
      <Text style={styles.l}>{label}</Text>
    </Pressable>
  );
}

export function TakipSayaclari({
  posts,
  followers,
  following,
  onPosts,
  onFollowers,
  onFollowing,
}: Props) {
  const { t, dil } = useCeviri();
  return (
    <View style={styles.row}>
      <Hucre n={posts} label={t('takip.gonderi')} locale={dil} onPress={onPosts} />
      <View style={styles.div} />
      <Hucre n={followers} label={t('takip.takipci')} locale={dil} onPress={onFollowers} />
      <View style={styles.div} />
      <Hucre n={following} label={t('takip.takip')} locale={dil} onPress={onFollowing} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: BoslukTokenlari.lg,
    paddingVertical: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.lg,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  hucre: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  pressed: { opacity: 0.7 },
  n: {
    ...TipografiTokenlari.title,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  l: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    marginTop: 2,
  },
  div: {
    width: 1,
    height: 28,
    backgroundColor: RenkTokenlari.border,
  },
});

void LinearGradient;
