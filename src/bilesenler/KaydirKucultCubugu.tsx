/**
 * Odayı küçült — tek dokunuş. Kaydırma eşiği yok.
 */
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TipografiTokenlari } from '../tasarim-sistemi/TipografiTokenlari';

type Props = {
  onKucult: () => void;
  accessibilityLabel?: string;
};

export function KaydirKucultCubugu({ onKucult, accessibilityLabel }: Props) {
  return (
    <Pressable
      onPress={onKucult}
      style={styles.btn}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
    >
      <MaterialCommunityIcons
        name="chevron-down"
        size={16}
        color="rgba(255,255,255,0.9)"
      />
      {accessibilityLabel ? (
        <Text style={styles.yazi} numberOfLines={1}>
          {accessibilityLabel}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  yazi: {
    ...TipografiTokenlari.caption,
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '700',
    fontSize: 12,
  },
});
