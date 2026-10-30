import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import {
  ODA_UST_BTN,
  ODA_UST_ICON,
} from '../../ses-odalari/bilesenler/OdaButonOlculeri';

type Props = {
  playing?: boolean;
  onPress: () => void;
};

/** Üst bar müzik girişi — eski kulaklık slotunu doldurur */
export function OdaMuzikButonu({ playing, onPress }: Props) {
  return (
    <Pressable
      style={[styles.btn, playing && styles.btnAktif]}
      onPress={onPress}
      accessibilityLabel="Müzik"
      accessibilityRole="button"
      hitSlop={6}
    >
      <MaterialCommunityIcons
        name={playing ? 'music-note' : 'music-note-outline'}
        size={ODA_UST_ICON}
        color={playing ? RenkTokenlari.primarySoft : RenkTokenlari.text}
      />
      {playing ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: ODA_UST_BTN,
    height: ODA_UST_BTN,
    borderRadius: ODA_UST_BTN / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.chipFill,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  btnAktif: {
    borderColor: RenkTokenlari.borderAccent,
  },
  dot: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: RenkTokenlari.primarySoft,
  },
});
