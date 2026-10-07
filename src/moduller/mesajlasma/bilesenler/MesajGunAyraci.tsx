import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { YaricapTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';

/** Sohbet gün başlığı — ortada, balonun üstünde. */
export function MesajGunAyraci({ etiket }: { etiket: string }) {
  return (
    <View style={styles.satir} accessibilityRole="header">
      <Text style={styles.yazi}>{etiket}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  satir: {
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  yazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
});
