/**
 * Feed filtre çipleri — Tümü / Canlı / Ses. Seçili: pink→purple gradient + soft glow.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { kullaniciTemaKodunuAl, temaAcikMi } from '../../../tasarim-sistemi/tema/TemaDurumu';
import { useTemayaAboneOl } from '../../../tasarim-sistemi/tema/useTemayaAboneOl';

export type FeedFiltre = 'tumu' | 'canli' | 'ses';

export type FeedFiltreOgesi = {
  kod: FeedFiltre;
  etiket: string;
  icon: keyof typeof Ionicons.glyphMap;
  sayi?: number;
  tint: string;
};

type Props = {
  ogeler: FeedFiltreOgesi[];
  secili: FeedFiltre;
  onSec: (kod: FeedFiltre) => void;
};

export function AnaSayfaFiltreCipleri({ ogeler, secili, onSec }: Props) {
  useTemayaAboneOl();
  const acik = temaAcikMi(kullaniciTemaKodunuAl());

  return (
    <Animated.View entering={FadeIn.duration(260)}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.satir}
      >
        {ogeler.map((oge) => {
          const aktif = oge.kod === secili;
          return (
            <Pressable
              key={oge.kod}
              onPress={() => onSec(oge.kod)}
              accessibilityRole="button"
              accessibilityState={{ selected: aktif }}
              style={({ pressed }) => [styles.cipDis, pressed && styles.basili]}
            >
              {aktif ? (
                <LinearGradient
                  colors={[...RenkTokenlari.gradientPrimary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.cip, styles.cipAktif]}
                >
                  <Ionicons name={oge.icon} size={13} color={RenkTokenlari.textOnPrimary} />
                  <Text style={[styles.yazi, styles.yaziAktif]}>{oge.etiket}</Text>
                  {oge.sayi != null && oge.sayi > 0 ? (
                    <View style={styles.sayiAktif}>
                      <Text style={styles.sayiAktifYazi}>{oge.sayi}</Text>
                    </View>
                  ) : null}
                </LinearGradient>
              ) : (
                <View
                  style={[
                    styles.cip,
                    styles.cipPasif,
                    {
                      backgroundColor: acik ? RenkTokenlari.bgElevated : RenkTokenlari.bgCard,
                      borderColor: RenkTokenlari.border,
                    },
                  ]}
                >
                  <Ionicons name={oge.icon} size={13} color={oge.tint} />
                  <Text style={styles.yazi}>{oge.etiket}</Text>
                  {oge.sayi != null && oge.sayi > 0 ? (
                    <Text style={[styles.sayi, { color: oge.tint }]}>{oge.sayi}</Text>
                  ) : null}
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  satir: {
    gap: BoslukTokenlari.sm,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingVertical: BoslukTokenlari.xs,
  },
  cipDis: {
    borderRadius: YaricapTokenlari.pill,
  },
  basili: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  cip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cipAktif: {
    borderColor: 'transparent',
    shadowColor: RenkTokenlari.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cipPasif: {},
  yazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
    fontSize: 12.5,
  },
  yaziAktif: {
    color: RenkTokenlari.textOnPrimary,
  },
  sayi: {
    ...TipografiTokenlari.micro,
    fontWeight: '800',
    fontSize: 11,
  },
  sayiAktif: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  sayiAktifYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textOnOverlay,
    fontWeight: '800',
    fontSize: 10,
  },
});
