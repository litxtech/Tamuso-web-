import React from 'react';
import { StyleSheet, View } from 'react-native';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { BoslukTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import {
  HIKAYE_TEPSI_AVATAR,
  HIKAYE_TEPSI_HALKA,
  HIKAYE_TEPSI_YUKSEKLIK,
} from '../sabitler';

function Kemik() {
  return (
    <View style={styles.oge}>
      <View style={styles.halka} />
      <View style={styles.etiket} />
    </View>
  );
}

export function HikayeTepsiSkeleton({ adet = 5 }: { adet?: number }) {
  return (
    <View style={styles.wrap}>
      {Array.from({ length: adet }, (_, i) => (
        <Kemik key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: HIKAYE_TEPSI_YUKSEKLIK,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: BoslukTokenlari.md,
    gap: 10,
  },
  oge: {
    width: HIKAYE_TEPSI_HALKA + 8,
    alignItems: 'center',
    gap: 6,
  },
  halka: {
    width: HIKAYE_TEPSI_AVATAR,
    height: HIKAYE_TEPSI_AVATAR,
    borderRadius: HIKAYE_TEPSI_AVATAR / 2,
    backgroundColor: RenkTokenlari.surface,
  },
  etiket: {
    width: 40,
    height: 8,
    borderRadius: 4,
    backgroundColor: RenkTokenlari.surface,
  },
});
