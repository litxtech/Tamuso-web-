import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  /** true değilse hiç render etme */
  dogrulandi?: boolean | null;
  size?: number;
  style?: object;
};

/**
 * Platform geneli doğrulanmış kullanıcı yeşil tiki.
 * Metin "✓" kullanma — her yerde bu bileşen.
 */
export function DogrulanmisTik({
  dogrulandi = true,
  size = 16,
  style,
}: Props) {
  const { t } = useCeviri();
  if (!dogrulandi) return null;
  return (
    <View
      style={[styles.wrap, style]}
      accessibilityRole="image"
      accessibilityLabel={t('profil.dogrulanmisHesap')}
    >
      <Ionicons
        name="checkmark-circle"
        size={size}
        color={RenkTokenlari.mint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
