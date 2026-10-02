import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import type { OdaDuzenTanim } from '../../ses-odalari/duzen/OdaDuzeniniCoz';

type Props = {
  duzen: OdaDuzenTanim;
  secili: boolean;
  onPress: () => void;
};

export function OdaDuzenSecimKarti({ duzen, secili, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.press, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={
          secili
            ? ['rgba(196,59,255,0.3)', 'rgba(232,64,145,0.12)']
            : ['rgba(42,36,56,0.95)', 'rgba(24,18,34,0.98)']
        }
        style={[styles.kart, secili && styles.kartSecili]}
      >
        <View style={styles.ust}>
          <View style={styles.ikon}>
            <Ionicons
              name={duzen.sahneOdakli ? 'easel-outline' : 'grid-outline'}
              size={18}
              color={secili ? RenkTokenlari.primarySoft : RenkTokenlari.textMuted}
            />
          </View>
          {secili ? (
            <Ionicons name="checkmark-circle" size={18} color={RenkTokenlari.primarySoft} />
          ) : null}
        </View>
        <Text style={styles.ad}>{duzen.ad}</Text>
        <Text style={styles.metaYazi} numberOfLines={2}>
          {duzen.alt}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.metaYazi}>{duzen.kolon} kolon</Text>
          {duzen.halo ? <Text style={styles.metaYazi}>halo</Text> : null}
          {duzen.sahneOdakli ? <Text style={styles.metaYazi}>sahne</Text> : null}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: { width: '47%', flexGrow: 1, maxWidth: '48.5%' },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  kart: {
    minHeight: 124,
    borderRadius: YaricapTokenlari.md,
    padding: BoslukTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    gap: 6,
  },
  kartSecili: {
    borderColor: 'rgba(196, 59, 255, 0.55)',
  },
  ust: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ikon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  ad: {
    ...TipografiTokenlari.body,
    fontWeight: '700',
    color: RenkTokenlari.text,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontSize: 10,
  },
  kod: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontSize: 9,
    letterSpacing: 0.6,
  },
});
